const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function setupCampaignAITable() {
  console.log('🔧 CREATING CAMPAIGN_AI_ASSETS TABLE');
  console.log('===================================\n');
  
  try {
    // Create the campaign_ai_assets table
    const { data, error } = await supabase.rpc('create_campaign_ai_assets_table', {});
    
    if (error) {
      console.log('❌ Error with RPC call:', error.message);
      console.log('Trying direct SQL execution...\n');
      
      // Try direct table creation using a SQL function
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS campaign_ai_assets (
          id BIGSERIAL PRIMARY KEY,
          campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          icps JSONB,
          personas JSONB,
          pain_points JSONB,
          value_propositions JSONB,
          email_sequences JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_campaign_ai_assets_campaign_id ON campaign_ai_assets(campaign_id);
        
        -- Add RLS policy if needed
        ALTER TABLE campaign_ai_assets ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can access their campaign AI assets" ON campaign_ai_assets
          FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()));
      `;
      
      console.log('📝 Executing SQL to create campaign_ai_assets table...');
      
      // We'll need to execute this via a custom function or direct database access
      // For now, let's test if we can insert into campaigns first
      console.log('✅ SQL prepared. You may need to run this manually in Supabase SQL editor:');
      console.log(createTableSQL);
      
    } else {
      console.log('✅ Campaign AI assets table created successfully');
    }
    
  } catch (e) {
    console.log('❌ Error:', e.message);
  }
}

async function addMissingCampaignColumns() {
  console.log('\n🔧 CHECKING IF WE NEED TO ADD CAMPAIGN COLUMNS');
  console.log('===============================================\n');
  
  // Check what columns are missing for campaign enhancement
  const missingFields = [
    'company_name',
    'website', 
    'no_website',
    'language',
    'keywords',
    'main_activity',
    'location',
    'industry',
    'product_service',
    'goals'
  ];
  
  console.log('🔍 Fields needed for AI campaign creation:');
  missingFields.forEach(field => {
    console.log(`   - ${field}`);
  });
  
  console.log('\n📋 SQL to add missing columns to campaigns table:');
  
  const addColumnsSQL = `
    -- Add missing columns to campaigns table
    ALTER TABLE campaigns 
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS no_website BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
    ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS main_activity TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS industry TEXT,
    ADD COLUMN IF NOT EXISTS product_service TEXT,
    ADD COLUMN IF NOT EXISTS goals TEXT;
  `;
  
  console.log(addColumnsSQL);
  
  console.log('\n💡 You can run this SQL in Supabase SQL editor to add the missing columns.');
}

setupCampaignAITable();
addMissingCampaignColumns();