import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    console.log('🔧 Updating tracking record with correct contact ID...')
    
    // Update the existing tracking record to use contact ID 1574 (for sigmaticinvestments@gmail.com)
    const { data, error } = await supabase
      .from('email_tracking')
      .update({ 
        contact_id: '1574'  // Update to correct contact ID
      })
      .eq('email', 'sigmaticinvestments@gmail.com')
      .select()
    
    if (error) {
      console.error('❌ Failed to update tracking record:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    console.log('✅ Tracking record updated successfully!')
    console.log('📊 Updated record:', JSON.stringify(data, null, 2))

    return NextResponse.json({
      success: true,
      message: 'Tracking record updated with correct contact ID',
      updatedRecord: data[0],
      instructions: 'Now test the sequence-status API again',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error updating tracking record:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}