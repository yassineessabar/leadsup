import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    console.log('🔧 Manually creating tracking records for JD John Doe...')
    
    // Create email tracking record
    const emailTrackingData = {
      campaign_id: '9e91bc69-521a-4723-bc24-5c51676a93a5',
      contact_id: '1561',
      sequence_id: '9fabf6b1-aeae-41c0-9736-7d309fec8ad8', // First sequence ID
      sequence_step: 1,
      status: 'sent',
      sent_at: new Date().toISOString(),
      message_id: 'manual_fix_' + Date.now(),
      sender_type: 'simulation',
      sender_email: 'info@leadsup.io',
      recipient_email: 'sigmaticinvestments@gmail.com',
      subject: 'Struggling with lead generation?',
      delivered_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
    
    console.log('📧 Creating email tracking record...')
    const { data: emailData, error: emailError } = await supabase
      .from('email_tracking')
      .insert(emailTrackingData)
      .select()
    
    // Create progression record  
    const progressionData = {
      campaign_id: '9e91bc69-521a-4723-bc24-5c51676a93a5',
      prospect_id: '1561',
      sequence_id: '9fabf6b1-aeae-41c0-9736-7d309fec8ad8',
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('📈 Creating progression record...')
    const { data: progressData, error: progressError } = await supabase
      .from('prospect_sequence_progress')
      .upsert(progressionData, {
        onConflict: 'campaign_id,prospect_id,sequence_id'
      })
      .select()

    const results = {
      emailTracking: {
        success: !emailError,
        error: emailError?.message || null,
        data: emailData
      },
      progression: {
        success: !progressError,
        error: progressError?.message || null,
        data: progressData
      }
    }

    console.log('📊 Results:', JSON.stringify(results, null, 2))

    return NextResponse.json({
      success: true,
      message: 'Tracking records created manually',
      results: results,
      instructions: 'Refresh the frontend to see if sequence 1 now shows as "Sent"',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error creating tracking records:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}