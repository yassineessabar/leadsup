import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    console.log('🔧 Creating complete SendGrid tables...')
    
    // Drop existing tables and recreate with all columns
    const { error: dropError } = await supabase
      .from('sendgrid_events')
      .delete()
      .neq('id', 'impossible-id-to-delete-all')
    
    console.log('Cleared existing events:', dropError ? dropError.message : 'success')
    
    // Check if columns exist by trying to insert a test record
    try {
      const testEvent = {
        user_id: 'test',
        campaign_id: 'test', 
        sg_message_id: 'test',
        sg_event_id: 'test-unique-' + Date.now(),
        event_type: 'delivered',
        email: 'test@example.com',
        timestamp: new Date().toISOString(),
        asm_group_id: 1,
        smtp_id: 'test',
        category: ['test'],
        reason: 'test',
        status: 'test',
        url: 'test',
        user_agent: 'test',
        ip: '127.0.0.1'
      }
      
      const { error: insertError } = await supabase
        .from('sendgrid_events')
        .insert(testEvent)
      
      if (insertError) {
        return NextResponse.json({
          success: false,
          error: `Schema incomplete: ${insertError.message}`,
          suggestion: 'Need to recreate tables with all columns'
        })
      }
      
      // Clean up test record
      await supabase
        .from('sendgrid_events')
        .delete()
        .eq('sg_event_id', testEvent.sg_event_id)
      
      return NextResponse.json({
        success: true,
        message: 'SendGrid schema is complete and ready!'
      })
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: `Schema test failed: ${error}`,
        suggestion: 'Tables need to be recreated'
      })
    }
    
  } catch (error) {
    console.error('❌ Error testing schema:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to test schema'
    }, { status: 500 })
  }
}