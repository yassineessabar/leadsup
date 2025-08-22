import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing sender rotation logic...')
    
    // Get active campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'Active')
      .limit(1)
      .single()
    
    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'No active campaign found' }, { status: 404 })
    }
    
    console.log(`📊 Campaign: ${campaign.name} (${campaign.id})`)
    
    // Get all senders for this campaign
    const { data: allSenders } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('email', { ascending: true })
    
    // Get active senders
    const { data: activeSenders } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('is_active', true)
      .eq('is_selected', true)
      .order('email', { ascending: true })
    
    console.log(`📧 All senders: ${allSenders?.map(s => `${s.email}(active:${s.is_active},selected:${s.is_selected})`).join(', ')}`)
    console.log(`🎯 Active senders: ${activeSenders?.map(s => s.email).join(', ')}`)
    
    if (!activeSenders || activeSenders.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active senders found',
        campaign: campaign.name,
        allSenders: allSenders?.map(s => ({
          email: s.email,
          is_active: s.is_active,
          is_selected: s.is_selected
        }))
      })
    }
    
    // Test rotation logic for different contact IDs
    const testContacts = [420, 444, 447, 445, 446]
    const rotationResults = testContacts.map(contactId => {
      const rotationSeed = Math.floor(Date.now() / (1000 * 60 * 60)) + contactId
      const rotationIndex = rotationSeed % activeSenders.length
      const selectedSender = activeSenders[rotationIndex]
      
      return {
        contactId,
        rotationSeed,
        rotationIndex,
        totalSenders: activeSenders.length,
        selectedSender: selectedSender.email
      }
    })
    
    console.log('🔄 Rotation test results:', rotationResults)
    
    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name
      },
      senders: {
        total: allSenders?.length || 0,
        active: activeSenders.length,
        allSenders: allSenders?.map(s => ({
          email: s.email,
          is_active: s.is_active,
          is_selected: s.is_selected,
          daily_limit: s.daily_limit
        })),
        activeSenders: activeSenders.map(s => s.email)
      },
      rotationTest: rotationResults,
      currentHour: Math.floor(Date.now() / (1000 * 60 * 60))
    })
    
  } catch (error) {
    console.error('❌ Error testing sender rotation:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}