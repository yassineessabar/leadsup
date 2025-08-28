import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { campaignId = 'ed08e451-55a7-4118-b69e-de13858034f6', newSenderEmail = 'hello@leadsup.io' } = body
    
    console.log(`Fixing campaign ${campaignId} to use verified sender: ${newSenderEmail}`)
    
    // First, check current senders
    const { data: currentSenders, error: currentError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaignId)
    
    if (currentError) {
      return NextResponse.json({ error: 'Failed to get current senders', details: currentError }, { status: 500 })
    }
    
    console.log(`Found ${currentSenders?.length || 0} current senders:`, currentSenders?.map(s => s.email))
    
    // Update all senders for this campaign to use the verified email
    const { data: updateResult, error: updateError } = await supabase
      .from('campaign_senders')
      .update({ 
        email: newSenderEmail,
        name: 'LeadsUp Team',
        is_active: true,
        is_selected: true,
        updated_at: new Date().toISOString()
      })
      .eq('campaign_id', campaignId)
      .select()
    
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update senders', details: updateError }, { status: 500 })
    }
    
    // If no senders existed, create one
    if (!currentSenders || currentSenders.length === 0) {
      console.log('No senders found, creating new verified sender...')
      
      // Get campaign info to get user_id
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('user_id')
        .eq('id', campaignId)
        .single()
      
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      
      const { data: createResult, error: createError } = await supabase
        .from('campaign_senders')
        .insert({
          campaign_id: campaignId,
          user_id: campaign.user_id,
          email: newSenderEmail,
          name: 'LeadsUp Team',
          sender_type: 'email',
          is_active: true,
          is_selected: true,
          daily_limit: 50,
          access_token: 'verified_sender',
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
      
      if (createError) {
        return NextResponse.json({ error: 'Failed to create sender', details: createError }, { status: 500 })
      }
      
      console.log('Created new verified sender:', createResult)
    }
    
    // Verify the fix
    const { data: finalSenders } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaignId)
    
    return NextResponse.json({
      success: true,
      message: `Campaign ${campaignId} updated to use verified sender: ${newSenderEmail}`,
      previousSenders: currentSenders?.map(s => ({ email: s.email, active: s.is_active, selected: s.is_selected })),
      newSenders: finalSenders?.map(s => ({ email: s.email, active: s.is_active, selected: s.is_selected })),
      verifiedSenderUsed: newSenderEmail,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error fixing campaign senders:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}