import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Verifying SendGrid events and health score updates after warmup...')
    
    // Check for recent SendGrid events (last 10 minutes)
    const recentTime = new Date()
    recentTime.setMinutes(recentTime.getMinutes() - 10)
    
    const { data: recentEvents, error: eventsError } = await supabaseServer
      .from('sendgrid_events')
      .select('event_type, email, event_data, created_at')
      .gte('created_at', recentTime.toISOString())
      .order('created_at', { ascending: false })
    
    if (eventsError) {
      console.error('❌ Error fetching recent events:', eventsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch recent events'
      }, { status: 500 })
    }
    
    const eventsCount = recentEvents?.length || 0
    console.log(`📧 Found ${eventsCount} recent SendGrid events`)
    
    // Count events by sender
    const senderEventCounts: Record<string, number> = {}
    recentEvents?.forEach(event => {
      const senderEmail = event.event_data?.sender_email || 'unknown'
      senderEventCounts[senderEmail] = (senderEventCounts[senderEmail] || 0) + 1
    })
    
    console.log('📊 Events by sender:', senderEventCounts)
    
    // Check recent health score updates
    const { data: recentHealthUpdates, error: healthError } = await supabaseServer
      .from('campaign_senders')
      .select('email, health_score, updated_at')
      .gte('updated_at', recentTime.toISOString())
      .order('updated_at', { ascending: false })
    
    if (healthError) {
      console.error('❌ Error fetching health updates:', healthError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch health updates'
      }, { status: 500 })
    }
    
    const healthUpdates = recentHealthUpdates?.length || 0
    console.log(`❤️ Found ${healthUpdates} recent health score updates`)
    
    // Log health score changes
    recentHealthUpdates?.forEach(sender => {
      console.log(`📊 ${sender.email}: ${sender.health_score}% (updated: ${sender.updated_at})`)
    })
    
    // Check if any events are from warmup automation
    const warmupEvents = recentEvents?.filter(event => 
      event.event_data?.sender_email && 
      (event.event_data.campaign_id || event.event_data.warming_campaign_id)
    ) || []
    
    console.log(`🔥 Warmup-related events: ${warmupEvents.length}`)
    
    // Summary of verification
    const verification = {
      success: true,
      eventsCount,
      healthUpdates,
      warmupEventsCount: warmupEvents.length,
      senderEventBreakdown: senderEventCounts,
      recentHealthScores: recentHealthUpdates?.map(s => ({
        email: s.email,
        score: s.health_score,
        updated: s.updated_at
      })) || [],
      verificationTime: new Date().toISOString(),
      message: `Verified ${eventsCount} SendGrid events and ${healthUpdates} health score updates`
    }
    
    console.log('✅ Verification complete:', verification)
    
    return NextResponse.json(verification)
    
  } catch (error) {
    console.error('❌ Error in warmup verification:', error)
    return NextResponse.json({
      success: false,
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Warmup tracking verification endpoint',
    usage: 'POST to verify recent SendGrid events and health updates'
  })
}