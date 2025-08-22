import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 FORCE FIXING SEQUENCE TIMING - Setting first sequence to Immediate')
    
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    
    // Update the first sequence (step 1) to be Immediate
    const { data: updated, error: updateError } = await supabase
      .from('campaign_sequences')
      .update({
        relative: 'Immediate',
        time_value: 0,
        time_unit: 'days'
      })
      .eq('campaign_id', campaignId)
      .eq('step_number', 1)
      .select()
    
    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update first sequence',
        details: updateError
      }, { status: 500 })
    }
    
    console.log('✅ Updated first sequence to Immediate')
    
    // Update remaining sequences to be delayed
    const { data: laterSequences, error: laterError } = await supabase
      .from('campaign_sequences')
      .update({
        relative: 'After',
        time_value: 2,
        time_unit: 'days'
      })
      .eq('campaign_id', campaignId)
      .gt('step_number', 1)
      .select()
    
    if (laterError) {
      console.error('Warning: Failed to update later sequences:', laterError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Force updated sequence timing',
      first_sequence_updated: updated?.length || 0,
      later_sequences_updated: laterSequences?.length || 0,
      note: 'First sequence set to Immediate, others set to After 2 days'
    })
    
  } catch (error) {
    console.error('❌ Force fix error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}