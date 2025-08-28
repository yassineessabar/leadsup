import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const campaignId = '9e91bc69-521a-4723-bc24-5c51676a93a5'
    
    console.log('🔧 Fixing sequence timing configuration...')
    console.log('Current: Step 2=66 days, Step 4=69 days, Step 6=72 days')
    console.log('Fixing to: Step 2=3 days, Step 4=6 days, Step 6=9 days')
    
    // Fix the unrealistic timing values
    const updates = [
      { step_number: 2, timing_days: 3, title: 'Email 2' },  // Was 66 days 
      { step_number: 4, timing_days: 6, title: 'Email 4' },  // Was 69 days
      { step_number: 6, timing_days: 9, title: 'Email 6' }   // Was 72 days
    ]
    
    const results = []
    
    for (const update of updates) {
      const { data, error } = await supabase
        .from('campaign_sequences')
        .update({ 
          timing_days: update.timing_days,
          title: update.title 
        })
        .eq('campaign_id', campaignId)
        .eq('step_number', update.step_number)
        .select()
      
      if (error) {
        console.error(`❌ Failed to update step ${update.step_number}:`, error)
        results.push({
          step: update.step_number,
          success: false,
          error: error.message
        })
      } else {
        console.log(`✅ Updated step ${update.step_number}: ${update.timing_days} days`)
        results.push({
          step: update.step_number,
          success: true,
          old_timing: update.step_number === 2 ? 66 : (update.step_number === 4 ? 69 : 72),
          new_timing: update.timing_days,
          data: data[0]
        })
      }
    }
    
    // Get updated sequences to confirm
    const { data: updatedSequences } = await supabase
      .from('campaign_sequences')
      .select('step_number, timing_days, title')
      .eq('campaign_id', campaignId)
      .order('step_number')
    
    const successCount = results.filter(r => r.success).length
    console.log(`📊 Fixed ${successCount}/${updates.length} sequence timings`)

    return NextResponse.json({
      success: true,
      message: `Fixed ${successCount}/${updates.length} sequence timings`,
      results: results,
      updatedSequences: updatedSequences,
      instructions: 'Now run the automation again - emails should be scheduled for the next few days instead of months in the future',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error fixing sequence timing:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}