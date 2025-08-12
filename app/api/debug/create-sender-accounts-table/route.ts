import { NextResponse } from 'next/server'
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('🚀 Checking existing tables...')

    // First, let's check what tables exist
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_list')

    if (tablesError) {
      console.log('Cannot get table list via RPC, trying to check smtp_accounts table directly...')
      
      // Check if smtp_accounts exists
      const { data: smtpData, error: smtpError } = await supabase
        .from('smtp_accounts')
        .select('*')
        .limit(1)

      if (!smtpError) {
        console.log('✅ Found smtp_accounts table')
        return NextResponse.json({
          success: true,
          message: 'smtp_accounts table exists - we can use this instead!',
          suggestion: 'Use smtp_accounts table instead of sender_accounts',
          tableExists: 'smtp_accounts'
        })
      }

      // Check if sender_accounts exists
      const { data: senderData, error: senderError } = await supabase
        .from('sender_accounts')
        .select('*')
        .limit(1)

      if (!senderError) {
        console.log('✅ sender_accounts table already exists')
        return NextResponse.json({
          success: true,
          message: 'sender_accounts table already exists!',
          tableExists: 'sender_accounts'
        })
      }

      return NextResponse.json({
        success: false,
        message: 'Neither smtp_accounts nor sender_accounts table exists. Please create sender_accounts table manually in Supabase Dashboard.',
        createTableSQL: `
CREATE TABLE sender_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sendgrid_sender_id TEXT,
  sendgrid_status TEXT DEFAULT 'pending' CHECK (sendgrid_status IN ('pending', 'verified', 'failed')),
  sendgrid_verified_at TIMESTAMP WITH TIME ZONE,
  emails_sent INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(domain_id, email),
  UNIQUE(domain_id, is_default) WHERE is_default = TRUE
);

CREATE INDEX idx_sender_accounts_domain_id ON sender_accounts(domain_id);
CREATE INDEX idx_sender_accounts_user_id ON sender_accounts(user_id);
CREATE INDEX idx_sender_accounts_email ON sender_accounts(email);
        `
      }, { status: 400 })
    }

    console.log('✅ Tables found:', tables)
    return NextResponse.json({
      success: true,
      message: 'Table check complete',
      tables: tables
    })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error.message,
      instruction: 'Please create the sender_accounts table manually using Supabase Dashboard SQL Editor'
    }, { status: 500 })
  }
}