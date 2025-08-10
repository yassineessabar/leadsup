/**
 * Fix Prospects Assignment to Campaign
 * Ensure prospects are properly linked to campaign
 */

async function fixProspectsAssignment() {
  console.log('🔧 Fixing Prospects Assignment');
  console.log('=' .repeat(50));
  
  const campaignId = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';
  
  console.log('📊 Step 1: Check Current Prospects');
  console.log('Run this query to see if prospects are assigned:');
  console.log('```sql');
  console.log(`SELECT id, first_name, last_name, campaign_id
FROM prospects 
WHERE campaign_id = '${campaignId}';`);
  console.log('```');
  console.log('');
  
  console.log('📊 Step 2: If No Prospects, Assign Them');
  console.log('```sql');
  console.log(`-- Find prospects without campaign
SELECT id, first_name, last_name 
FROM prospects 
WHERE campaign_id IS NULL 
LIMIT 3;`);
  console.log('');
  console.log(`-- Assign them to your campaign
UPDATE prospects 
SET campaign_id = '${campaignId}'
WHERE campaign_id IS NULL 
LIMIT 3;`);
  console.log('```');
  console.log('');
  
  console.log('📊 Step 3: Clear ALL Tracking Tables');
  console.log('```sql');
  console.log(`-- Clear all tracking for fresh start
DELETE FROM prospect_sequence_progress 
WHERE campaign_id = '${campaignId}';

DELETE FROM contact_sequences 
WHERE campaign_id = '${campaignId}';

-- Also check this table if it exists
DELETE FROM prospect_activities 
WHERE prospect_id IN (
  SELECT id FROM prospects WHERE campaign_id = '${campaignId}'
);`);
  console.log('```');
  console.log('');
  
  console.log('📊 Step 4: Verify Campaign is Active');
  console.log('```sql');
  console.log(`SELECT id, name, status, created_at, updated_at
FROM campaigns 
WHERE id = '${campaignId}';`);
  console.log('');
  console.log('-- If status is not Active, update it:');
  console.log(`UPDATE campaigns 
SET status = 'Active' 
WHERE id = '${campaignId}';`);
  console.log('```');
  console.log('');
  
  console.log('📊 Step 5: Check Campaign Settings');
  console.log('```sql');
  console.log(`SELECT * FROM campaign_settings 
WHERE campaign_id = '${campaignId}';`);
  console.log('```');
  console.log('');
  
  console.log('🧪 Step 6: Test Directly with curl');
  console.log('After running the SQL above, test:');
  console.log('```bash');
  console.log('# Test locally first');
  console.log(`curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \\
  -u "admin:password" | jq '.'`);
  console.log('');
  console.log('# Then test production');
  console.log(`curl -X GET "https://app.leadsup.io/api/campaigns/automation/process-pending" \\
  -u "admin:Integral23.." | jq '.'`);
  console.log('```');
  console.log('');
  
  console.log('🔍 Step 7: Debug the API');
  console.log('If still empty, check the API logs for:');
  console.log('- Are prospects being fetched from database?');
  console.log('- Are they being filtered out by some condition?');
  console.log('- Is there a timezone or scheduling filter?');
  console.log('');
  
  console.log('💡 Quick Fix: Create New Test Prospects');
  console.log('```sql');
  console.log(`-- Insert fresh test prospects
INSERT INTO prospects (id, first_name, last_name, campaign_id, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Test', 'User1', '${campaignId}', NOW(), NOW()),
  (gen_random_uuid(), 'Test', 'User2', '${campaignId}', NOW(), NOW()),
  (gen_random_uuid(), 'Test', 'User3', '${campaignId}', NOW(), NOW());`);
  console.log('```');
  
  // Test production API
  console.log('');
  console.log('📡 Testing Production API Now:');
  
  try {
    const response = await fetch('https://app.leadsup.io/api/campaigns/automation/process-pending', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:Integral23..').toString('base64')
      }
    });
    
    const data = await response.json();
    console.log(`Success: ${data.success}`);
    console.log(`Data length: ${data.data?.length || 0}`);
    
    if (data.data && data.data.length > 0) {
      const campaign = data.data[0];
      console.log(`Campaign: ${campaign.name}`);
      console.log(`Contacts: ${campaign.contacts?.length || 0}`);
    } else {
      console.log('❌ Still no data - run the SQL commands above');
    }
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

fixProspectsAssignment();