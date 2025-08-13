import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Setting up campaign_sender_assignments table...')

    // Create campaign_sender_assignments table
    const createTableQuery = `
      -- Create campaign_sender_assignments table
      CREATE TABLE IF NOT EXISTS campaign_sender_assignments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        campaign_id UUID NOT NULL,
        sender_account_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Foreign key constraints
        CONSTRAINT fk_campaign_sender_assignments_campaign
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_campaign_sender_assignments_sender
          FOREIGN KEY (sender_account_id) REFERENCES sender_accounts(id) ON DELETE CASCADE,
          
        -- Unique constraint to prevent duplicate assignments
        CONSTRAINT uk_campaign_sender_assignment 
          UNIQUE (campaign_id, sender_account_id)
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_campaign_sender_assignments_campaign_id 
        ON campaign_sender_assignments(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_sender_assignments_sender_id 
        ON campaign_sender_assignments(sender_account_id);

      -- Set up Row Level Security (RLS)
      ALTER TABLE campaign_sender_assignments ENABLE ROW LEVEL SECURITY;
    `

    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableQuery 
    })

    if (createError) {
      console.error('❌ Error creating table:', createError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create table',
        details: createError.message 
      }, { status: 500 })
    }

    // Create RLS policy
    const rlsPolicyQuery = `
      -- Drop existing policy if it exists
      DROP POLICY IF EXISTS campaign_sender_assignments_user_policy ON campaign_sender_assignments;
      
      -- Create RLS policy (users can only access assignments for their own campaigns)
      CREATE POLICY campaign_sender_assignments_user_policy ON campaign_sender_assignments
        FOR ALL 
        USING (
          campaign_id IN (
            SELECT id FROM campaigns WHERE user_id = auth.uid()
          )
        );
    `

    const { error: policyError } = await supabase.rpc('exec_sql', { 
      sql: rlsPolicyQuery 
    })

    if (policyError) {
      console.error('❌ Error creating RLS policy:', policyError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create RLS policy',
        details: policyError.message 
      }, { status: 500 })
    }

    // Create updated_at trigger
    const triggerQuery = `
      -- Create or replace the trigger function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Drop existing trigger if it exists
      DROP TRIGGER IF EXISTS update_campaign_sender_assignments_updated_at ON campaign_sender_assignments;

      -- Create the trigger
      CREATE TRIGGER update_campaign_sender_assignments_updated_at 
        BEFORE UPDATE ON campaign_sender_assignments 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `

    const { error: triggerError } = await supabase.rpc('exec_sql', { 
      sql: triggerQuery 
    })

    if (triggerError) {
      console.error('❌ Error creating trigger:', triggerError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create trigger',
        details: triggerError.message 
      }, { status: 500 })
    }

    // Verify table was created
    const { data: tableExists, error: checkError } = await supabase
      .from('campaign_sender_assignments')
      .select('id')
      .limit(1)

    if (checkError) {
      console.error('❌ Error verifying table:', checkError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to verify table creation',
        details: checkError.message 
      }, { status: 500 })
    }

    console.log('✅ campaign_sender_assignments table setup completed successfully')

    return NextResponse.json({
      success: true,
      message: 'campaign_sender_assignments table setup completed successfully',
      tableExists: true
    })

  } catch (error) {
    console.error('❌ Error in setup-campaign-sender-assignments:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}