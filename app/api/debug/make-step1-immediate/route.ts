import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const campaignId = '9e91bc69-521a-4723-bc24-5c51676a93a5'
    
    console.log('🔧 Making step 1 immediate for testing...')
    console.log('Changing: Step 1 = 1 day → Step 1 = 0 days (immediate)')
    
    // Change step 1 back to immediate (0 days)
    const { data, error } = await supabase
      .from('campaign_sequences')
      .update({ 
        timing_days: 0  // Change from 1 to 0 (immediate)
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
    
    console.log('✅ Updated step 1: 0 days (immediate)')
    
    return NextResponse.json({
      success: true,
      message: 'Step 1 is now immediate - emails will be sent right away',
      change: {
        from: '1 day delay',
        to: '0 days (immediate)'
      },
      updatedRecord: data[0],
      instructions: 'Run the automation again - it should now find and send the 4 contacts',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error making step 1 immediate:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}