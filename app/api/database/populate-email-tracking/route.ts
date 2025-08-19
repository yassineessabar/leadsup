import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Populating email_tracking table with sample data...')
    
    const now = new Date()
    const sampleEmails = [
      {
        campaign_id: 'campaign_1',
        contact_id: 'contact_123',
        sequence_id: 'seq_1',
        sequence_step: 1,
        status: 'sent',
        sent_at: new Date(now.getTime() - 300000).toISOString(), // 5 min ago
        message_id: 'msg_abc123def456',
        sender_type: 'sendgrid',
        sender_email: 'contact@leadsup.io',
        recipient_email: 'john.doe@example.com',
        subject: 'Quick question about your lead generation process'
      },
      {
        campaign_id: 'campaign_1', 
        contact_id: 'contact_124',
        sequence_id: 'seq_1',
        sequence_step: 1,
        status: 'sent',
        sent_at: new Date(now.getTime() - 600000).toISOString(), // 10 min ago
        message_id: 'msg_def456ghi789',
        sender_type: 'sendgrid',
        sender_email: 'sales@leadsup.io',
        recipient_email: 'alice.johnson@techcorp.com',
        subject: 'Following up on our conversation about automation'
      },
      {
        campaign_id: 'campaign_2',
        contact_id: 'contact_125', 
        sequence_id: 'seq_2',
        sequence_step: 2,
        status: 'sent',
        sent_at: new Date(now.getTime() - 900000).toISOString(), // 15 min ago
        message_id: 'msg_ghi789jkl012',
        sender_type: 'sendgrid',
        sender_email: 'hello@leadsup.io',
        recipient_email: 'mike.wilson@startup.io',
        subject: 'Step 2: How to implement automated sequences'
      },
      {
        campaign_id: 'campaign_2',
        contact_id: 'contact_126',
        sequence_id: 'seq_2', 
        sequence_step: 3,
        status: 'delivered',
        sent_at: new Date(now.getTime() - 1200000).toISOString(), // 20 min ago
        message_id: 'msg_jkl012mno345',
        sender_type: 'sendgrid',
        sender_email: 'support@leadsup.io',
        recipient_email: 'sarah.chen@innovate.com',
        subject: 'Final step: Advanced automation strategies'
      },
      {
        campaign_id: 'campaign_3',
        contact_id: 'contact_127',
        sequence_id: 'seq_3',
        sequence_step: 1,
        status: 'failed',
        sent_at: new Date(now.getTime() - 1800000).toISOString(), // 30 min ago
        message_id: null,
        sender_type: 'sendgrid',
        sender_email: 'contact@leadsup.io',
        recipient_email: 'invalid@bounced.com',
        subject: 'Introduction to LeadsUp platform',
        error_message: 'Recipient address rejected: 550 No such user'
      },
      {
        campaign_id: 'campaign_1',
        contact_id: 'contact_128',
        sequence_id: 'seq_1',
        sequence_step: 1,
        status: 'sent',
        sent_at: new Date(now.getTime() - 2400000).toISOString(), // 40 min ago
        message_id: 'test_simulation_001',
        sender_type: 'simulation',
        sender_email: 'test@leadsup.io',
        recipient_email: 'test.user@example.com',
        subject: '[TEST] Welcome to our platform'
      }
    ]

    // Insert sample emails
    const { data, error } = await supabase
      .from('email_tracking')
      .insert(sampleEmails)
      .select()

    if (error) {
      console.error('Error inserting sample emails:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to insert sample emails',
        details: error.message
      }, { status: 500 })
    }

    console.log(`✅ Inserted ${data.length} sample emails into email_tracking table`)

    // Get count of total emails
    const { count } = await supabase
      .from('email_tracking')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      message: `Inserted ${data.length} sample sequence emails`,
      total_emails_in_table: count,
      inserted_emails: data.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error populating email_tracking table:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to populate email_tracking table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET method to check current email count
export async function GET(request: NextRequest) {
  try {
    const { data, error, count } = await supabase
      .from('email_tracking')
      .select('*', { count: 'exact' })
      .order('sent_at', { ascending: false })
      .limit(5)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      total_emails: count,
      latest_emails: data,
      message: `Found ${count} emails in email_tracking table`
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check email_tracking table'
    }, { status: 500 })
  }
}