import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const campaignId = '9e91bc69-521a-4723-bc24-5c51676a93a5'
    
    console.log('🔧 Fixing step 1 timing to prevent immediate email sending...')
    console.log('Current: Step 1 = 0 days (immediate)')
    console.log('Fixing to: Step 1 = 1 day (delayed)')
    
    // Fix step 1 to have a 1-day delay instead of immediate
    const { data, error } = await supabase
      .from('campaign_sequences')
      .update({ 
        timing_days: 1  // Change from 0 to 1 day
      })
      .eq('campaign_id', campaignId)
      .eq('step_number', 1)
      .select()
    
    if (error) {
      console.error('❌ Failed to update step 1:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    console.log('✅ Updated step 1: 1 day delay')
    
    // Get updated sequences to confirm
    const { data: updatedSequences } = await supabase
      .from('campaign_sequences')
      .select('step_number, timing_days, title')
      .eq('campaign_id', campaignId)
      .order('step_number')
    
    return NextResponse.json({
      success: true,
      message: 'Fixed step 1 timing to prevent immediate email sending',
      oldTiming: 0,
      newTiming: 1,
      updatedRecord: data[0],
      allSequences: updatedSequences,
      instructions: 'Step 1 emails will now be sent 1 day after contacts are added instead of immediately',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error fixing step 1 timing:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}