import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    console.log('Testing email tracking record creation...')
    
    // Test creating an email tracking record for contact 1561
    const testData = {
      contact_id: '1561',
      contact_email: 'sigmaticinvestments@gmail.com',
      campaign_id: '9e91bc69-521a-4723-bc24-5c51676a93a5',
      sequence_id: '9fabf6b1-aeae-41c0-9736-7d309fec8ad8',
      sequence_step: 1,
      message_id: 'test_tracking_' + Date.now(),
      sender_email: 'info@leadsup.io',
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
    
    console.log('Creating email tracking record:', testData)
    
    const { data, error: trackingError } = await supabase
      .from('email_tracking')
      .insert(testData)
      .select()

    if (trackingError) {
      console.error('Email tracking error:', trackingError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create email tracking record',
        details: trackingError
      }, { status: 500 })
    }

    console.log('Email tracking record created:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Email tracking record created successfully',
      data: data,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Test email tracking error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}