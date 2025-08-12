import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    // Add provider column to domains table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add provider column if it doesn't exist
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'domains' 
            AND column_name = 'provider'
          ) THEN
            ALTER TABLE domains ADD COLUMN provider TEXT DEFAULT NULL;
            COMMENT ON COLUMN domains.provider IS 'DNS provider name (e.g., GoDaddy, Namecheap, Cloudflare, etc.)';
          END IF;
        END $$;
        
        -- Verify the column exists
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'domains' 
        AND column_name = 'provider';
      `
    })

    if (error) {
      console.error('SQL execution error:', error)
      
      // Try alternative approach using direct SQL
      const alterResult = await supabase
        .from('domains')
        .select('*')
        .limit(1)
      
      if (alterResult.error) {
        return NextResponse.json({ 
          error: 'Failed to add provider column',
          details: error.message
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        message: 'Provider column should be added manually. Execute the SQL from scripts/add-provider-column.sql in Supabase SQL editor.',
        sql: `ALTER TABLE domains ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT NULL;`
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Provider column added successfully',
      data
    })

  } catch (error) {
    console.error('Error adding provider column:', error)
    return NextResponse.json({ 
      error: 'Failed to add provider column',
      message: 'Please add the provider column manually using Supabase SQL editor',
      sql: `ALTER TABLE domains ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT NULL;`
    }, { status: 500 })
  }
}