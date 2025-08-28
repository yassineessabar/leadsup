import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    console.log('🔧 Creating tracking record for JD John Doe to test frontend display...')
    
    // Create email tracking record that matches the expected schema
    const trackingRecord = {
      id: `track_${Date.now()}_1561`, // Required TEXT ID
      user_id: 'a72cc86c-5fef-4ed5-b1ae-41d9cbdf6ba6', // User ID from campaign 
      campaign_id: '9e91bc69-521a-4723-bc24-5c51676a93a5',
      contact_id: '1561',
      sequence_id: '9fabf6b1-aeae-41c0-9736-7d309fec8ad8', // First sequence ID
      sequence_step: 1,
      email: 'sigmaticinvestments@gmail.com', // Required field
      sg_message_id: `test_${Date.now()}`,
      subject: 'Step 1 - Automation Email',
      status: 'sent',
      sent_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('📧 Creating email tracking record...')
    const { data: emailData, error: emailError } = await supabase
      .from('email_tracking')
      .insert(trackingRecord)
      .select()
    
    if (emailError) {
      console.error('❌ Failed to create tracking record:', emailError)
      return NextResponse.json({
        success: false,
        error: emailError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    console.log('✅ Tracking record created successfully!')
    console.log('📊 Record details:', JSON.stringify(emailData, null, 2))

    return NextResponse.json({
      success: true,
      message: 'Tracking record created successfully',
      record: emailData[0],
      instructions: 'Refresh the frontend to see if sequence 1 now shows as "Sent"',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error creating tracking record:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}