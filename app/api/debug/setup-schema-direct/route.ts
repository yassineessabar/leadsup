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

// POST - Set up schema using direct SQL execution
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🔧 Setting up schema with direct SQL execution...')

    const results = []

    // Add timezone columns to contacts table (using individual queries)
    try {
      await supabaseServer.rpc('sql', { 
        query: `ALTER TABLE contacts ADD COLUMN timezone_group VARCHAR(10) DEFAULT 'T1'` 
      })
      results.push('✅ Added timezone_group column')
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        results.push('✅ timezone_group column already exists')
      } else {
        results.push(`⚠️ timezone_group: ${e.message}`)
      }
    }

    try {
      await supabaseServer.rpc('sql', { 
        query: `ALTER TABLE contacts ADD COLUMN timezone_name VARCHAR(50) DEFAULT 'America/New_York'` 
      })
      results.push('✅ Added timezone_name column')
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        results.push('✅ timezone_name column already exists')
      } else {
        results.push(`⚠️ timezone_name: ${e.message}`)
      }
    }

    try {
      await supabaseServer.rpc('sql', { 
        query: `ALTER TABLE contacts ADD COLUMN timezone_offset INTEGER DEFAULT -5` 
      })
      results.push('✅ Added timezone_offset column')
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        results.push('✅ timezone_offset column already exists')
      } else {
        results.push(`⚠️ timezone_offset: ${e.message}`)
      }
    }

    // Add rotation columns to campaign_senders
    try {
      await supabaseServer.rpc('sql', { 
        query: `ALTER TABLE campaign_senders ADD COLUMN rotation_priority INTEGER DEFAULT 1` 
      })
      results.push('✅ Added rotation_priority column')
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        results.push('✅ rotation_priority column already exists')
      } else {
        results.push(`⚠️ rotation_priority: ${e.message}`)
      }
    }

    try {
      await supabaseServer.rpc('sql', { 
        query: `ALTER TABLE campaign_senders ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE` 
      })
      results.push('✅ Added last_used_at column')
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        results.push('✅ last_used_at column already exists')
      } else {
        results.push(`⚠️ last_used_at: ${e.message}`)
      }
    }

    try {
      await supabaseServer.rpc('sql', { 
        query: `ALTER TABLE campaign_senders ADD COLUMN emails_sent_today INTEGER DEFAULT 0` 
      })
      results.push('✅ Added emails_sent_today column')
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        results.push('✅ emails_sent_today column already exists')  
      } else {
        results.push(`⚠️ emails_sent_today: ${e.message}`)
      }
    }

    try {
      await supabaseServer.rpc('sql', { 
        query: `ALTER TABLE campaign_senders ADD COLUMN daily_limit INTEGER DEFAULT 50` 
      })
      results.push('✅ Added daily_limit column')
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        results.push('✅ daily_limit column already exists')
      } else {
        results.push(`⚠️ daily_limit: ${e.message}`)
      }
    }

    // Create timezone_configs table
    try {
      const { error } = await supabaseServer.rpc('sql', {
        query: `
          CREATE TABLE timezone_configs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            timezone_group VARCHAR(10) NOT NULL,
            timezone_name VARCHAR(50) NOT NULL,
            utc_offset INTEGER NOT NULL,
            send_window_start TIME DEFAULT '09:00:00',
            send_window_end TIME DEFAULT '17:00:00',
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `
      })
      if (error) throw error
      results.push('✅ Created timezone_configs table')
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        results.push('✅ timezone_configs table already exists')
      } else {
        results.push(`⚠️ timezone_configs table: ${e.message}`)
      }
    }

    console.log('✅ Schema setup complete')

    return NextResponse.json({
      success: true,
      message: 'Schema setup complete',
      results: results,
      next_steps: [
        'Run assign-timezones endpoint to assign timezone groups to contacts',
        'Update email sending logic to use rotation and timezone awareness'
      ]
    })

  } catch (error) {
    console.error('❌ Error setting up schema:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to setup schema',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}