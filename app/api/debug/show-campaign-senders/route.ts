import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId') || 'ed08e451-55a7-4118-b69e-de13858034f6'
    
    console.log(`Getting senders for campaign: ${campaignId}`)
    
    // Get campaign info
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, user_id')
      .eq('id', campaignId)
      .single()
    
    if (campaignError) {
      return NextResponse.json({ error: 'Campaign not found', details: campaignError }, { status: 404 })
    }
    
    // Get senders for this campaign
    const { data: senders, error: sendersError } = await supabase
      .from('campaign_senders')
      .select('id, email, name, is_active, is_selected, daily_limit')
      .eq('campaign_id', campaignId)
      .order('email')
    
    if (sendersError) {
      return NextResponse.json({ error: 'Failed to get senders', details: sendersError }, { status: 500 })
    }
    
    // Get contacts being processed
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, email, sequence_step, email_status')
      .eq('campaign_id', campaignId)
      .neq('email_status', 'Completed')
      .neq('email_status', 'Replied')
      .neq('email_status', 'Unsubscribed')
      .neq('email_status', 'Bounced')
      .limit(5)
    
    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        user_id: campaign.user_id
      },
      senders: senders || [],
      selectedSenders: senders?.filter(s => s.is_selected) || [],
      contacts: contacts || [],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error getting campaign senders:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}