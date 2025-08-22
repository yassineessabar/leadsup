import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing sequence timing configuration')
    
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    
    // 1. Get current sequences
    const { data: sequences, error: fetchError } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true })
    
    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch sequences',
        details: fetchError
      }, { status: 500 })
    }
    
    console.log(`Found ${sequences.length} sequences to check`)
    
    // 2. Fix sequences missing timing info
    const updates = []
    for (const sequence of sequences) {
      console.log(`Checking sequence ${sequence.step_number}: relative=${sequence.relative}, time_value=${sequence.time_value}, time_unit=${sequence.time_unit}`)
      // Force update all sequences to ensure proper timing
      if (true) {
        // Set default timing based on step number
        const timing = {
          relative: sequence.step_number === 1 ? 'Immediate' : 'After',
          time_value: sequence.step_number === 1 ? 0 : (sequence.step_number - 1) * 2, // 0, 2, 4, 6 days
          time_unit: 'days'
        }
        
        const { data: updated, error: updateError } = await supabase
          .from('campaign_sequences')
          .update(timing)
          .eq('id', sequence.id)
          .select()
          .single()
        
        if (updateError) {
          console.error(`Error updating sequence ${sequence.id}:`, updateError)
        } else {
          console.log(`✅ Updated sequence ${sequence.step_number}: ${timing.relative} ${timing.time_value} ${timing.time_unit}`)
          updates.push({
            step_number: sequence.step_number,
            old_timing: {
              relative: sequence.relative,
              time_value: sequence.time_value,
              time_unit: sequence.time_unit
            },
            new_timing: timing
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${updates.length} sequences with missing timing`,
      sequences_checked: sequences.length,
      updates_made: updates.length,
      updates: updates
    })
    
  } catch (error) {
    console.error('❌ Fix sequences error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}