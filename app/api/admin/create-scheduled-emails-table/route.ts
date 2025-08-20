import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🗄️ Creating scheduled_emails table...')

    // Check if table already exists by trying a simple query
    const { data: tableTest, error: tableTestError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .limit(0)

    if (tableTestError?.code !== 'PGRST106') { // PGRST106 = table not found
      console.log('✅ scheduled_emails table already exists')
      return NextResponse.json({ 
        success: true, 
        message: 'Scheduled emails table already exists' 
      })
    }

    // Create the table using the exact schema email-scheduler.ts expects
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS scheduled_emails (
        id SERIAL PRIMARY KEY,
        contact_id INTEGER NOT NULL,
        campaign_id TEXT NOT NULL,
        sender_account_id INTEGER NOT NULL,
        sequence_step INTEGER NOT NULL,
        email_subject TEXT NOT NULL,
        email_content TEXT DEFAULT '',
        scheduled_for TIMESTAMPTZ NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed', 'skipped')),
        sent_at TIMESTAMPTZ NULL,
        error_message TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    // Try multiple approaches since RPC functions might not be available
    let createTableError: any = null
    
    try {
      const { error } = await supabase.rpc('exec', {
        sql: createTableSQL
      })
      createTableError = error
    } catch (rpcError1) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: createTableSQL
        })
        createTableError = error
      } catch (rpcError2) {
        console.log('RPC methods not available, trying direct table creation...')
        // The table creation will be verified below regardless
      }
    }

    // Try to create indexes (similar approach)
    const indexSQL = `
      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_contact_id ON scheduled_emails(contact_id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign_id ON scheduled_emails(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_sender_id ON scheduled_emails(sender_account_id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_sequence_step ON scheduled_emails(sequence_step);

      -- Composite indexes for daily limit queries
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_sender_date 
        ON scheduled_emails(sender_account_id, scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign_date 
        ON scheduled_emails(campaign_id, scheduled_for);
    `

    try {
      await supabase.rpc('exec', { sql: indexSQL })
    } catch (indexError) {
      try {
        await supabase.rpc('exec_sql', { sql: indexSQL })
      } catch (indexError2) {
        console.warn('Could not create indexes via RPC')
      }
    }

    // Test that the table was created successfully
    const { data: verificationTest, error: verificationError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .limit(1)

    if (verificationError) {
      console.error('Table creation verification failed:', verificationError)
      return NextResponse.json({ 
        success: false, 
        error: 'Table creation verification failed',
        details: verificationError.message 
      }, { status: 500 })
    }

    console.log('✅ scheduled_emails table created successfully')

    return NextResponse.json({
      success: true,
      message: 'Scheduled emails table created successfully',
      table_exists: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error creating scheduled_emails table:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create scheduled_emails table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET method to check if table exists
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('scheduled_emails')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        table_exists: false,
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      table_exists: true,
      message: 'scheduled_emails table exists and is accessible'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      table_exists: false,
      error: 'Failed to check table existence'
    }, { status: 500 })
  }
}