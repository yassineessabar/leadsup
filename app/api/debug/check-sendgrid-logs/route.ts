import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Checking recent SendGrid activity and logs...')
    
    // Check recent sendgrid_events
    const { data: recentEvents, error: eventsError } = await supabaseServer
      .from('sendgrid_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log(`📧 Recent SendGrid events: ${recentEvents?.length || 0} found`)
    recentEvents?.forEach(event => {
      console.log(`   ${event.timestamp}: ${event.event_type} - ${event.email} (${event.sg_message_id})`)
    })
    
    // Check warmup recipients
    const { data: recipients, error: recipientsError } = await supabaseServer
      .from('warmup_recipients')
      .select('*')
      .eq('is_active', true)
    
    console.log(`👥 Active warmup recipients: ${recipients?.length || 0} found`)
    recipients?.forEach(r => {
      console.log(`   ${r.email}: received ${r.emails_received_today}/${r.max_daily_emails} today`)
    })
    
    // Check campaign senders
    const { data: senders, error: sendersError } = await supabaseServer
      .from('campaign_senders')
      .select('email, health_score, warmup_emails_sent_today, last_warmup_sent')
      .eq('is_selected', true)
    
    console.log(`📤 Campaign senders: ${senders?.length || 0} found`)
    senders?.forEach(s => {
      console.log(`   ${s.email}: ${s.warmup_emails_sent_today} sent today, last: ${s.last_warmup_sent}`)
    })
    
    return NextResponse.json({
      success: true,
      recentEvents: recentEvents || [],
      recipients: recipients || [],
      senders: senders || [],
      summary: {
        eventsCount: recentEvents?.length || 0,
        recipientsCount: recipients?.length || 0,
        sendersCount: senders?.length || 0,
        lastEventTime: recentEvents?.[0]?.timestamp || 'None'
      }
    })
    
  } catch (error) {
    console.error('❌ Debug check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}