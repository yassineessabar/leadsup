import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"
import { generateTrackingId, addEmailTracking } from "@/lib/email-tracking"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()
    
    if (error || !session) {
      return null
    }
    
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    return null
  }
}

// POST - Create a test tracking record for debugging
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Generate a test tracking ID
    const trackingId = generateTrackingId()
    
    // Create test email tracking record
    const { data: trackingRecord, error: trackingError } = await supabaseServer
      .from('email_tracking')
      .insert({
        id: trackingId,
        user_id: userId,
        campaign_id: null,
        email: 'test@example.com',
        sg_message_id: `test_${trackingId}`,
        subject: 'Test Email for Tracking',
        status: 'sent',
        sent_at: new Date().toISOString(),
        category: ['test']
      })
      .select('*')
      .single()

    if (trackingError) {
      console.error('❌ Failed to create test tracking record:', trackingError)
      return NextResponse.json({ success: false, error: trackingError.message }, { status: 500 })
    }

    // Generate test HTML with tracking
    const testHtml = `
      <html>
        <body>
          <h1>Test Email</h1>
          <p>This is a test email to verify tracking.</p>
          <a href="https://google.com">Click me to test click tracking</a>
          <p>Open tracking will be automatically added.</p>
        </body>
      </html>
    `
    
    const trackedHtml = addEmailTracking(testHtml, { trackingId })

    return NextResponse.json({
      success: true,
      data: {
        trackingId,
        trackingRecord,
        originalHtml: testHtml,
        trackedHtml,
        openTrackingUrl: `/api/track/open?id=${trackingId}`,
        clickTestUrl: `/api/track/click?id=${trackingId}&url=${encodeURIComponent('https://google.com')}`
      }
    })

  } catch (error) {
    console.error('❌ Error creating test tracking record:', error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// GET - Check existing tracking records and their status
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Get recent tracking records
    const { data: records, error } = await supabaseServer
      .from('email_tracking')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Check for records with opens and clicks
    const openedEmails = records?.filter(r => r.first_opened_at) || []
    const clickedEmails = records?.filter(r => r.first_clicked_at) || []

    return NextResponse.json({
      success: true,
      data: {
        totalRecords: records?.length || 0,
        openedEmails: openedEmails.length,
        clickedEmails: clickedEmails.length,
        recentRecords: records?.map(r => ({
          id: r.id,
          email: r.email,
          subject: r.subject,
          sent_at: r.sent_at,
          first_opened_at: r.first_opened_at,
          first_clicked_at: r.first_clicked_at,
          open_count: r.open_count,
          click_count: r.click_count,
          status: r.status
        }))
      }
    })

  } catch (error) {
    console.error('❌ Error fetching tracking records:', error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}