import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const campaignId = params.id
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Count emails sent today for this campaign
    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59Z`

    // Try to get from sendgrid_events first (most accurate)
    const { data: events, error: eventsError } = await supabase
      .from('sendgrid_events')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('event_type', 'processed') // 'processed' means the email was sent
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay)

    if (!eventsError && events) {
      return NextResponse.json({ 
        count: events.length, 
        date,
        source: 'sendgrid_events' 
      })
    }

    // Fallback to email_tracking table
    const { data: tracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .gte('sent_at', startOfDay)
      .lte('sent_at', endOfDay)

    if (!trackingError && tracking) {
      return NextResponse.json({ 
        count: tracking.length, 
        date,
        source: 'email_tracking' 
      })
    }

    // If both fail, return 0
    return NextResponse.json({ 
      count: 0, 
      date,
      source: 'none' 
    })

  } catch (error) {
    console.error('Error fetching daily email count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}