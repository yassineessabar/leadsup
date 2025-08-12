import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('Creating domains table...')

    // Create domains table
    const { error: domainsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create domains table for domain management and verification
        CREATE TABLE IF NOT EXISTS domains (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          domain TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
          description TEXT,
          verification_type TEXT DEFAULT 'manual' CHECK (verification_type IN ('manual', 'domain_connect', 'api')),
          
          -- Domain verification records
          verification_token TEXT,
          verification_expires_at TIMESTAMP WITH TIME ZONE,
          verified_at TIMESTAMP WITH TIME ZONE,
          last_verification_attempt TIMESTAMP WITH TIME ZONE,
          verification_error TEXT,
          
          -- DNS records tracking
          dns_records JSONB DEFAULT '{}',
          dns_status JSONB DEFAULT '{}',
          
          -- Domain settings
          is_test_domain BOOLEAN DEFAULT FALSE,
          is_default BOOLEAN DEFAULT FALSE,
          
          -- Sending configuration
          from_name TEXT,
          reply_to_email TEXT,
          dkim_selector TEXT DEFAULT 's1',
          
          -- Statistics
          emails_sent INTEGER DEFAULT 0,
          emails_delivered INTEGER DEFAULT 0,
          emails_rejected INTEGER DEFAULT 0,
          emails_received INTEGER DEFAULT 0,
          
          -- Provider information
          registrar_provider TEXT,
          domain_connect_supported BOOLEAN DEFAULT FALSE,
          domain_connect_setup_url TEXT,
          
          -- Metadata
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Constraints
          UNIQUE(user_id, domain)
        );

        -- Create domain verification history table
        CREATE TABLE IF NOT EXISTS domain_verification_history (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
          verification_type TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
          error_message TEXT,
          dns_records_checked JSONB,
          verification_details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);
        CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
        CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
        CREATE INDEX IF NOT EXISTS idx_domains_verified_at ON domains(verified_at);
        CREATE INDEX IF NOT EXISTS idx_domain_verification_history_domain_id ON domain_verification_history(domain_id);

        -- Enable RLS
        ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
        ALTER TABLE domain_verification_history ENABLE ROW LEVEL SECURITY;

        -- RLS policies
        DROP POLICY IF EXISTS "Users can manage own domains" ON domains;
        CREATE POLICY "Users can manage own domains" ON domains FOR ALL USING (true);

        DROP POLICY IF EXISTS "Users can view own domain verification history" ON domain_verification_history;
        CREATE POLICY "Users can view own domain verification history" ON domain_verification_history FOR SELECT USING (true);

        -- Add updated_at trigger
        DROP TRIGGER IF EXISTS domains_updated_at ON domains;
        CREATE TRIGGER domains_updated_at 
          BEFORE UPDATE ON domains 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at();
      `
    })

    if (domainsError) {
      console.error('Error creating domains table:', domainsError)
      return NextResponse.json(
        { success: false, error: domainsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Domains table created successfully!'
    })

  } catch (error) {
    console.error('Error in create domains table:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create domains table' },
      { status: 500 }
    )
  }
}