const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Running scraping status migration...')
    
    // Add scraping status columns to campaigns table
    const migrationSQL = `
      -- Add scraping status columns to campaigns table if they don't exist
      ALTER TABLE campaigns 
      ADD COLUMN IF NOT EXISTS scraping_status TEXT DEFAULT 'idle' CHECK (scraping_status IN ('idle', 'running', 'completed', 'failed')),
      ADD COLUMN IF NOT EXISTS scraping_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      -- Create index for faster status queries
      CREATE INDEX IF NOT EXISTS idx_campaigns_scraping_status ON campaigns(scraping_status);
    `
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    }).single()
    
    if (error) {
      // Try direct execution if RPC doesn't exist
      console.log('⚠️ RPC method not available, trying alternative approach...')
      
      // We'll need to check if columns exist first
      const { data: columns, error: checkError } = await supabase
        .from('campaigns')
        .select('*')
        .limit(0)
      
      if (!checkError) {
        console.log('✅ Migration might already be applied or needs manual execution')
        console.log('📝 Please run the following SQL in your Supabase SQL editor:')
        console.log(migrationSQL)
      } else {
        throw checkError
      }
    } else {
      console.log('✅ Migration completed successfully')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.log('\n📝 Please run the following SQL manually in your Supabase SQL editor:')
    console.log(`
-- Add scraping status columns to campaigns table if they don't exist
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS scraping_status TEXT DEFAULT 'idle' CHECK (scraping_status IN ('idle', 'running', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS scraping_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_campaigns_scraping_status ON campaigns(scraping_status);
    `)
  }
}

runMigration()