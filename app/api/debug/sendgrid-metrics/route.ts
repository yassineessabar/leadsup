import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId') || 'ac2fa28f-5360-4fa2-80c6-0c3cc217785b'
  
  try {
    console.log('🔍 Debugging SendGrid metrics for campaign:', campaignId)
    
    // Check raw events
    const { data: events, error: eventsError } = await supabase
      .from('sendgrid_events')
      .select('event_type, campaign_id, user_id, email, sg_message_id')
      .eq('campaign_id', campaignId)
      .order('timestamp', { ascending: false })
      .limit(20)
    
    if (eventsError) {
      console.error('Events error:', eventsError)
    }
    
    // Check event counts by type
    const { data: eventCounts, error: countsError } = await supabase
      .from('sendgrid_events')
      .select('event_type')
      .eq('campaign_id', campaignId)
    
    const eventSummary = eventCounts?.reduce((acc: any, event: any) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1
      return acc
    }, {}) || {}
    
    // Check campaign metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false })
    
    if (metricsError) {
      console.error('Metrics error:', metricsError)
    }
    
    // Check email tracking
    const { data: tracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('campaign_id', campaignId)
      .limit(10)
    
    if (trackingError) {
      console.error('Tracking error:', trackingError)
    }
    
    // Try to call the SendGrid function directly
    const { data: functionResult, error: functionError } = await supabase
      .rpc('get_sendgrid_campaign_metrics', {
        p_campaign_id: campaignId,
        p_user_id: events?.[0]?.user_id || 'demo-user-1755305645967',
        p_start_date: null,
        p_end_date: null
      })
    
    return NextResponse.json({
      success: true,
      debug: {
        campaignId,
        eventSummary,
        totalEvents: eventCounts?.length || 0,
        recentEvents: events?.slice(0, 5) || [],
        campaignMetrics: metrics || [],
        emailTracking: tracking || [],
        functionResult: functionResult || null,
        functionError: functionError?.message || null
      }
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}