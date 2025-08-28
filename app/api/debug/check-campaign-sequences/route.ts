import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Check the campaign sequences for the "ewew" campaign
    const campaignId = "ed08e451-55a7-4118-b69e-de13858034f6"
    
    const { data: sequences, error } = await supabase
      .from('campaign_sequences')
      .select('step_number, subject, content')
      .eq('campaign_id', campaignId)
      .order('step_number')
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('name, status')
      .eq('id', campaignId)
      .single()
    
    return NextResponse.json({
      success: true,
      campaign: campaign,
      sequences: sequences,
      debug_info: {
        campaign_id: campaignId,
        total_sequences: sequences?.length || 0,
        max_step: sequences?.length || 0,
        note: `Contacts with sequence_step >= ${sequences?.length || 0} should be marked as completed`
      }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}