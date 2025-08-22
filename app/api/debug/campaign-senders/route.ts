import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 DEBUG CAMPAIGN SENDERS ENDPOINT')
    
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    
    // Check campaign_senders table (same query as automation)
    const { data: senders, error: sendersError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .eq('is_selected', true)
    
    // Check recent inbox messages
    const { data: inboxMessages, error: inboxError } = await supabase
      .from('inbox_messages')
      .select('id, sender_email, contact_email, direction, created_at, provider_data')
      .eq('direction', 'outbound')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return NextResponse.json({
      success: true,
      campaignId,
      senders: {
        data: senders,
        error: sendersError,
        count: senders?.length || 0
      },
      recentInboxMessages: {
        data: inboxMessages?.map(msg => ({
          id: msg.id,
          sender_email: msg.sender_email,
          contact_email: msg.contact_email,
          created_at: msg.created_at,
          campaign_match: msg.provider_data?.campaign_id === campaignId
        })),
        error: inboxError,
        count: inboxMessages?.length || 0
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}