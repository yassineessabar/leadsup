import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    console.log('Testing contact update for contact 1561...')
    
    // Test updating contact 1561
    const { data, error: updateError } = await supabase
      .from('contacts')
      .update({
        sequence_step: 2, // Increment to see the change
        last_contacted_at: new Date().toISOString(),
        contact_latest_update_ts: new Date().toISOString(), // Use proper timestamp column
        next_email_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        // Note: contacts table doesn't have 'status' column, only 'email_status'
      })
      .eq('id', 1561)
      .select()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Update failed',
        details: updateError
      }, { status: 500 })
    }

    console.log('Update successful:', data)
    
    return NextResponse.json({
      success: true,
      message: 'Contact updated successfully',
      data: data,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Test contact update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}