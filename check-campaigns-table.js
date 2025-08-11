const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function checkCampaignsTable() {
  console.log('🔍 CHECKING CAMPAIGNS TABLE STRUCTURE');
  console.log('====================================\n');
  
  try {
    // Check if campaigns table exists and get structure
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1);
      
    if (!error) {
      console.log('✅ Table "campaigns" exists');
      if (data && data.length > 0) {
        console.log('📋 Available columns:');
        Object.keys(data[0]).forEach(col => {
          console.log(`   - ${col}`);
        });
        console.log('\n💾 Sample record structure:', data[0]);
      } else {
        console.log('📋 Table is empty, trying to describe structure...');
        
        // Try inserting and immediately deleting to see what columns are expected
        const testData = {
          name: 'test',
          type: 'test',
          status: 'Draft',
          user_id: 'test'
        };
        
        const { error: insertError } = await supabase
          .from('campaigns')
          .insert(testData)
          .select();
          
        if (insertError) {
          console.log('Insert error (shows required columns):', insertError.message);
        }
      }
    } else {
      console.log('❌ Table "campaigns" does not exist or access denied');
      console.log('Error:', error.message);
    }
  } catch (e) {
    console.log('❌ Error checking campaigns table:', e.message);
  }
  
  // Also check if campaign_ai_assets table exists
  console.log('\n🔍 CHECKING CAMPAIGN_AI_ASSETS TABLE');
  console.log('==================================\n');
  
  try {
    const { data, error } = await supabase
      .from('campaign_ai_assets')
      .select('*')
      .limit(1);
      
    if (!error) {
      console.log('✅ Table "campaign_ai_assets" exists');
      if (data && data.length > 0) {
        console.log('📋 Available columns:');
        Object.keys(data[0]).forEach(col => {
          console.log(`   - ${col}`);
        });
      } else {
        console.log('📋 Table exists but is empty');
      }
    } else {
      console.log('❌ Table "campaign_ai_assets" does not exist');
      console.log('Error:', error.message);
    }
  } catch (e) {
    console.log('❌ Error checking campaign_ai_assets table:', e.message);
  }
}

checkCampaignsTable();