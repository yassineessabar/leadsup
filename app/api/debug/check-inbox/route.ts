import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking inbox for ALL recent activity')
    
    // First, check for ANY inbound messages in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: allRecentInbound, error: allRecentError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(20)
    
    console.log('🔍 All recent inbound (30 min):', allRecentInbound?.length || 0)
    
    // Check for webhook errors
    const { data: webhookErrors, error: webhookErrorsErr } = await supabase
      .from('webhook_errors')
      .select('*')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('🔍 Recent webhook errors:', webhookErrors?.length || 0)
    
    // Check inbox_messages table for any messages involving Yassine, sigmatic, or mouai (multiple email variants)
    const { data: messages, error: messagesError } = await supabase
      .from('inbox_messages')
      .select('*')
      .or('contact_email.eq.essabar.yassine@gmail.com,contact_email.eq.ya.essabarry@gmail.com,contact_email.eq.sigmaticinvestments@gmail.com,contact_email.eq.mouai.tax@gmail.com,sender_email.eq.essabar.yassine@gmail.com,sender_email.eq.ya.essabarry@gmail.com,sender_email.eq.sigmaticinvestments@gmail.com,sender_email.eq.mouai.tax@gmail.com')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (messagesError) {
      console.error('Messages query error:', messagesError)
    }
    
    // Check inbox_threads table
    const { data: threads, error: threadsError } = await supabase
      .from('inbox_threads')
      .select('*')
      .or('contact_email.eq.essabar.yassine@gmail.com,contact_email.eq.ya.essabarry@gmail.com,contact_email.eq.sigmaticinvestments@gmail.com,contact_email.eq.mouai.tax@gmail.com')
      .order('last_message_at', { ascending: false })
    
    if (threadsError) {
      console.error('Threads query error:', threadsError)
    }
    
    // Check for any recent inbound messages (last 2 hours for immediate debugging)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: inboundMessages, error: inboundError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(20)
    
    // Also check for VERY recent messages (last 2 hours)
    const { data: veryRecentMessages, error: veryRecentError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Also check for messages to any reply address
    const { data: replyMessages, error: replyError } = await supabase
      .from('inbox_messages')
      .select('*')
      .or('sender_email.ilike.%reply@leadsup.io%,sender_email.ilike.%reply@reply.leadsup.io%')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (inboundError) {
      console.error('Inbound query error:', inboundError)
    }
    
    return NextResponse.json({
      success: true,
      yassine_messages: {
        count: messages?.length || 0,
        messages: messages || []
      },
      yassine_threads: {
        count: threads?.length || 0,
        threads: threads || []
      },
      recent_inbound: {
        count: inboundMessages?.length || 0,
        messages: inboundMessages || []
      },
      reply_messages: {
        count: replyMessages?.length || 0,
        messages: replyMessages || []
      },
      very_recent: {
        count: veryRecentMessages?.length || 0,
        messages: veryRecentMessages || []
      },
      all_recent_inbound: {
        count: allRecentInbound?.length || 0,
        messages: allRecentInbound || []
      },
      webhook_errors: {
        count: webhookErrors?.length || 0,
        errors: webhookErrors || []
      },
      summary: {
        total_yassine_messages: messages?.length || 0,
        outbound_count: messages?.filter(m => m.direction === 'outbound').length || 0,
        inbound_count: messages?.filter(m => m.direction === 'inbound').length || 0,
        recent_inbound_any: inboundMessages?.length || 0,
        very_recent_any: veryRecentMessages?.length || 0,
        reply_messages_any: replyMessages?.length || 0,
        all_recent_inbound_any: allRecentInbound?.length || 0,
        webhook_errors_any: webhookErrors?.length || 0,
        debug_time: new Date().toISOString(),
        thirtyMinutesAgo: thirtyMinutesAgo,
        twoHoursAgo: twoHoursAgo,
        twentyFourHoursAgo: twentyFourHoursAgo
      }
    })
    
  } catch (error) {
    console.error('❌ Inbox check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}