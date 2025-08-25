import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase'

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
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    console.log(`🔍 Debugging email tracking for user ${userId}`)

    // Get recent email tracking records
    const { data: trackingRecords, error: trackingError } = await supabaseServer
      .from('email_tracking')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(20)

    if (trackingError) {
      console.error('❌ Error fetching tracking records:', trackingError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch tracking records',
        details: trackingError
      }, { status: 500 })
    }

    // Get tracking records from last 30 days
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]
    
    const { data: recentRecords, error: recentError } = await supabaseServer
      .from('email_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('sent_at', startDate + 'T00:00:00Z')
      .lte('sent_at', endDate + 'T23:59:59Z')

    if (recentError) {
      console.error('❌ Error fetching recent records:', recentError)
    }

    // Calculate some basic stats
    const stats = {
      totalRecords: trackingRecords?.length || 0,
      recentRecords: recentRecords?.length || 0,
      openedEmails: trackingRecords?.filter(r => r.first_opened_at || r.open_count > 0).length || 0,
      clickedEmails: trackingRecords?.filter(r => r.first_clicked_at || r.click_count > 0).length || 0,
      totalOpens: trackingRecords?.reduce((sum, r) => sum + (r.open_count || 0), 0) || 0,
      totalClicks: trackingRecords?.reduce((sum, r) => sum + (r.click_count || 0), 0) || 0
    }

    const openRate = stats.recentRecords > 0 ? (stats.openedEmails / stats.recentRecords) * 100 : 0
    const clickRate = stats.recentRecords > 0 ? (stats.clickedEmails / stats.recentRecords) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        userId,
        dateRange: `${startDate} to ${endDate}`,
        stats: {
          ...stats,
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100
        },
        recentRecords: trackingRecords?.slice(0, 5).map(record => ({
          id: record.id,
          email: record.email,
          subject: record.subject,
          status: record.status,
          sent_at: record.sent_at,
          first_opened_at: record.first_opened_at,
          open_count: record.open_count,
          first_clicked_at: record.first_clicked_at,
          click_count: record.click_count,
          campaign_id: record.campaign_id
        })) || []
      }
    })

  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error
    }, { status: 500 })
  }
}