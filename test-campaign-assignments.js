const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupCampaignSenderAssignments() {
  try {
    console.log('🚀 Setting up campaign_sender_assignments table...')

    // Create the table with a simplified approach
    const { error: tableError } = await supabase
      .from('campaign_sender_assignments')
      .select('id')
      .limit(1)

    // If the table doesn't exist, we'll get an error
    if (tableError) {
      console.log('📄 Table does not exist, attempting to create...')
      
      // Try to create table using raw SQL
      const createSQL = `
        CREATE TABLE campaign_sender_assignments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          campaign_id UUID NOT NULL,
          sender_account_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE (campaign_id, sender_account_id)
        );
        
        CREATE INDEX idx_campaign_sender_assignments_campaign_id 
          ON campaign_sender_assignments(campaign_id);
        CREATE INDEX idx_campaign_sender_assignments_sender_id 
          ON campaign_sender_assignments(sender_account_id);
      `
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createSQL })
      
      if (createError) {
        console.error('❌ Failed to create table via exec_sql:', createError)
        console.log('Trying direct table creation...')
        
        // Let's just try to insert a test record to see what happens
        const { error: insertError } = await supabase
          .from('campaign_sender_assignments')
          .insert([
            {
              campaign_id: '00000000-0000-0000-0000-000000000000',
              sender_account_id: '00000000-0000-0000-0000-000000000000'
            }
          ])
          
        if (insertError) {
          console.error('❌ Table creation failed:', insertError)
          return false
        }
        
        // Clean up test record
        await supabase
          .from('campaign_sender_assignments')
          .delete()
          .eq('campaign_id', '00000000-0000-0000-0000-000000000000')
      }
    }

    console.log('✅ Table setup completed successfully')

    // Test basic operations
    console.log('🧪 Testing table operations...')
    
    // Try to insert and delete a test record
    const testCampaignId = '11111111-1111-1111-1111-111111111111'
    const testSenderId = '22222222-2222-2222-2222-222222222222'
    
    const { data: insertData, error: insertError } = await supabase
      .from('campaign_sender_assignments')
      .insert([
        {
          campaign_id: testCampaignId,
          sender_account_id: testSenderId
        }
      ])
      .select()
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError)
      return false
    }
    
    console.log('✅ Insert test passed')
    
    // Clean up test record
    const { error: deleteError } = await supabase
      .from('campaign_sender_assignments')
      .delete()
      .eq('campaign_id', testCampaignId)
    
    if (deleteError) {
      console.error('❌ Delete test failed:', deleteError)
      return false
    }
    
    console.log('✅ Delete test passed')
    console.log('🎉 All tests completed successfully!')
    
    return true
    
  } catch (error) {
    console.error('❌ Error in setup:', error)
    return false
  }
}

// Run the setup
setupCampaignSenderAssignments()
  .then(success => {
    if (success) {
      console.log('✅ Setup completed successfully')
      process.exit(0)
    } else {
      console.log('❌ Setup failed')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Setup error:', error)
    process.exit(1)
  })