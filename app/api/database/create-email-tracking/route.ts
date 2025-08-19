import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🗄️ Creating email_tracking table...')
    
    // First, let's create the table using a simple approach
    // We'll use the Node.js pg library directly if available, or try Supabase SQL
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS email_tracking (
          id BIGSERIAL PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          contact_id TEXT NOT NULL,
          sequence_id TEXT NOT NULL,
          sequence_step INTEGER,
          status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced', 'delivered', 'opened', 'clicked', 'replied')),
          sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          message_id TEXT,
          sender_type TEXT DEFAULT 'sendgrid' CHECK (sender_type IN ('sendgrid', 'simulation', 'smtp')),
          sender_email TEXT,
          recipient_email TEXT,
          subject TEXT,
          error_message TEXT,
          opened_at TIMESTAMP WITH TIME ZONE,
          clicked_at TIMESTAMP WITH TIME ZONE,
          replied_at TIMESTAMP WITH TIME ZONE,
          bounced_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // Try to create using supabase sql function (if available)
    try {
      const { error: createTableError } = await supabase.rpc('exec', {
        sql: createTableSQL
      })
      
      if (createTableError) {
        throw createTableError
      }
    } catch (rpcError) {
      // RPC might not be available, that's okay - the table creation will be verified below
      console.log('RPC method not available, checking if table exists...')
    }

    if (createTableError) {
      console.error('Error creating table:', createTableError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create table',
        details: createTableError.message 
      }, { status: 500 })
    }

    // Create indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create indexes for better query performance
        CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign_id ON email_tracking(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_email_tracking_contact_id ON email_tracking(contact_id);
        CREATE INDEX IF NOT EXISTS idx_email_tracking_sequence_id ON email_tracking(sequence_id);
        CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON email_tracking(status);
        CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at);
        CREATE INDEX IF NOT EXISTS idx_email_tracking_message_id ON email_tracking(message_id);
        CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient_email ON email_tracking(recipient_email);
      `
    })

    if (indexError) {
      console.warn('Warning creating indexes:', indexError)
    }

    // Create update trigger
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add trigger to update updated_at timestamp
        CREATE OR REPLACE FUNCTION update_email_tracking_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_email_tracking_updated_at ON email_tracking;
        CREATE TRIGGER trigger_update_email_tracking_updated_at
            BEFORE UPDATE ON email_tracking
            FOR EACH ROW
            EXECUTE FUNCTION update_email_tracking_updated_at();
      `
    })

    if (triggerError) {
      console.warn('Warning creating trigger:', triggerError)
    }

    // Test that the table was created successfully
    const { data: tableTest, error: testError } = await supabase
      .from('email_tracking')
      .select('*')
      .limit(1)

    if (testError) {
      console.error('Table test failed:', testError)
      return NextResponse.json({ 
        success: false, 
        error: 'Table creation verification failed',
        details: testError.message 
      }, { status: 500 })
    }

    console.log('✅ email_tracking table created successfully')

    return NextResponse.json({
      success: true,
      message: 'email_tracking table created successfully',
      table_exists: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error creating email_tracking table:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create email_tracking table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET method to check if table exists
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('email_tracking')
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
      message: 'email_tracking table exists and is accessible'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      table_exists: false,
      error: 'Failed to check table existence'
    }, { status: 500 })
  }
}