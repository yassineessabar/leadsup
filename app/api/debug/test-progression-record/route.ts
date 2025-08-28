import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    console.log('Testing progression record creation...')
    
    // Test creating a progression record for contact 1561
    const testData = {
      campaign_id: '9e91bc69-521a-4723-bc24-5c51676a93a5', // From the contact data
      prospect_id: '1561', // Use string version
      sequence_id: '9fabf6b1-aeae-41c0-9736-7d309fec8ad8', // First sequence ID
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('Creating progression record:', testData)
    
    const { data, error: progressError } = await supabase
      .from('prospect_sequence_progress')
      .upsert(testData, {
        onConflict: 'campaign_id,prospect_id,sequence_id'
      })
      .select()

    if (progressError) {
      console.error('Progression record error:', progressError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create progression record',
        details: progressError
      }, { status: 500 })
    }

    console.log('Progression record created:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Progression record created successfully',
      data: data,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Test progression record error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}