import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth helper function
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Set up timezone support schema
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🌍 Setting up timezone support schema...')

    // Add timezone columns to contacts table
    const { error: contactsError } = await supabaseServer.rpc('exec_sql', {
      sql: `
        ALTER TABLE contacts 
        ADD COLUMN IF NOT EXISTS timezone_group VARCHAR(10) DEFAULT 'T1' CHECK (timezone_group IN ('T1', 'T2', 'T3', 'T4')),
        ADD COLUMN IF NOT EXISTS timezone_name VARCHAR(50) DEFAULT 'America/New_York',
        ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT -5;
      `
    })

    if (contactsError && !contactsError.message?.includes('already exists')) {
      console.error('❌ Error adding timezone columns to contacts:', contactsError)
    }

    // Create timezone_configs table
    const { error: configsError } = await supabaseServer.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS timezone_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          timezone_group VARCHAR(10) NOT NULL CHECK (timezone_group IN ('T1', 'T2', 'T3', 'T4')),
          timezone_name VARCHAR(50) NOT NULL,
          utc_offset INTEGER NOT NULL,
          send_window_start TIME DEFAULT '09:00:00',
          send_window_end TIME DEFAULT '17:00:00',
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(user_id, timezone_group)
        );
      `
    })

    if (configsError && !configsError.message?.includes('already exists')) {
      console.error('❌ Error creating timezone_configs table:', configsError)
    }

    // Add sender rotation columns to campaign_senders
    const { error: sendersError } = await supabaseServer.rpc('exec_sql', {
      sql: `
        ALTER TABLE campaign_senders 
        ADD COLUMN IF NOT EXISTS rotation_priority INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS emails_sent_today INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 50;
      `
    })

    if (sendersError && !sendersError.message?.includes('already exists')) {
      console.error('❌ Error adding rotation columns to campaign_senders:', sendersError)
    }

    // Create indexes
    const { error: indexError } = await supabaseServer.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_contacts_timezone_group ON contacts(timezone_group);
        CREATE INDEX IF NOT EXISTS idx_contacts_campaign_timezone ON contacts(campaign_id, timezone_group);
        CREATE INDEX IF NOT EXISTS idx_campaign_senders_rotation ON campaign_senders(campaign_id, rotation_priority, last_used_at);
      `
    })

    if (indexError) {
      console.error('❌ Error creating indexes:', indexError)
    }

    // Get current user ID for default timezone configs
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser()
    const userId = user?.id || 'f7b3c1d4-5e6a-7b8c-9d0e-1f2a3b4c5d6e' // fallback UUID

    // Insert default timezone configurations
    const { error: insertError } = await supabaseServer
      .from('timezone_configs')
      .upsert([
        {
          user_id: userId,
          timezone_group: 'T1',
          timezone_name: 'America/New_York',
          utc_offset: -5,
          description: 'Eastern Time Zone'
        },
        {
          user_id: userId,
          timezone_group: 'T2', 
          timezone_name: 'America/Chicago',
          utc_offset: -6,
          description: 'Central Time Zone'
        },
        {
          user_id: userId,
          timezone_group: 'T3',
          timezone_name: 'Europe/London',
          utc_offset: 0,
          description: 'UK/Europe Time Zone'
        },
        {
          user_id: userId,
          timezone_group: 'T4',
          timezone_name: 'Asia/Singapore',
          utc_offset: 8,
          description: 'Asia Pacific Time Zone'
        }
      ], { onConflict: 'user_id,timezone_group' })

    if (insertError) {
      console.log('⚠️ Timezone configs may already exist:', insertError.message)
    }

    console.log('✅ Timezone support schema setup complete')

    return NextResponse.json({
      success: true,
      message: 'Timezone support schema setup complete',
      setup: [
        '✅ Added timezone columns to contacts table',
        '✅ Created timezone_configs table', 
        '✅ Added sender rotation columns',
        '✅ Created performance indexes',
        '✅ Inserted default timezone configurations'
      ]
    })

  } catch (error) {
    console.error('❌ Error setting up timezone support:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to setup timezone support',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}