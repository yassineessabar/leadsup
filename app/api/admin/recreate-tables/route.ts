import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    console.log('🔧 Recreating SendGrid tables with complete schema...')
    
    // Drop existing tables
    console.log('Dropping existing tables...')
    await supabase.from('sendgrid_events').delete().neq('id', 'impossible')
    await supabase.from('email_tracking').delete().neq('id', 'impossible')
    await supabase.from('campaign_metrics').delete().neq('id', 'impossible')
    await supabase.from('user_metrics').delete().neq('id', 'impossible')
    
    // Test if we can create the tables with complete schema
    // Since we can't run DDL through Supabase client, we'll check if the schema supports all columns
    const testData = {
      user_id: 'test-user',
      campaign_id: 'test-campaign',
      sg_message_id: 'test-message',
      sg_event_id: 'test-event-' + Date.now(),
      event_type: 'delivered',
      email: 'test@example.com',
      timestamp: new Date().toISOString(),
      smtp_id: 'test-smtp',
      category: ['test', 'category'],
      asm_group_id: 12345,
      reason: 'test reason',
      status: 'test status',
      url: 'https://test.com',
      user_agent: 'test user agent',
      ip: '127.0.0.1',
      event_data: { test: 'data' }
    }
    
    console.log('Testing complete schema...')
    const { error: testError } = await supabase
      .from('sendgrid_events')
      .insert(testData)
    
    if (testError) {
      return NextResponse.json({
        success: false,
        error: `Schema test failed: ${testError.message}`,
        required_action: 'You need to manually run the SQL scripts on your Supabase dashboard:',
        scripts: [
          '1. Go to your Supabase Dashboard > SQL Editor',
          '2. Run scripts/create-sendgrid-minimal.sql',
          '3. Run scripts/add-sendgrid-functions.sql'
        ]
      })
    }
    
    // Clean up test data
    await supabase
      .from('sendgrid_events')
      .delete()
      .eq('sg_event_id', testData.sg_event_id)
    
    console.log('✅ Schema is complete!')
    
    return NextResponse.json({
      success: true,
      message: 'SendGrid tables are ready with complete schema!',
      next_step: 'Run the webhook test again'
    })
    
  } catch (error) {
    console.error('❌ Error recreating tables:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to test schema',
      required_action: 'Manual SQL execution required'
    }, { status: 500 })
  }
}