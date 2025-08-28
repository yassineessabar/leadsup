import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignName = searchParams.get('name') || 'ewew'
    
    // Find campaign by name
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status, user_id')
      .ilike('name', `%${campaignName}%`)
    
    if (campaignError) {
      return NextResponse.json({ error: 'Failed to find campaigns', details: campaignError }, { status: 500 })
    }
    
    // Get contacts for the first matching campaign
    if (campaigns && campaigns.length > 0) {
      const campaign = campaigns[0]
      
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, email, campaign_id, sequence_step')
        .eq('campaign_id', campaign.id)
        .limit(5)
      
      const { data: senders, error: sendersError } = await supabase
        .from('campaign_senders')
        .select('*')
        .eq('campaign_id', campaign.id)
      
      return NextResponse.json({
        success: true,
        campaigns: campaigns,
        selectedCampaign: campaign,
        contacts: contacts || [],
        senders: senders || [],
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({
      success: false,
      message: `No campaigns found matching "${campaignName}"`,
      allCampaigns: campaigns || []
    })
    
  } catch (error) {
    console.error('Error finding campaign:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}