/**
 * Reset Campaign Prospects for Testing
 * Clears all tracking data so prospects can receive emails again
 */

async function resetCampaignProspects() {
  console.log('🔄 Resetting Campaign Prospects');
  console.log('=' .repeat(50));
  
  const campaignId = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';
  
  console.log('📊 SQL Commands to Reset Your Campaign:');
  console.log('');
  console.log('Run these commands in your database:');
  console.log('');
  
  console.log('-- 1. Clear prospect_sequence_progress (main tracking table)');
  console.log('```sql');
  console.log(`DELETE FROM prospect_sequence_progress 
WHERE campaign_id = '${campaignId}';`);
  console.log('```');
  console.log('');
  
  console.log('-- 2. Clear contact_sequences (backup tracking)');
  console.log('```sql');
  console.log(`DELETE FROM contact_sequences 
WHERE campaign_id = '${campaignId}';`);
  console.log('```');
  console.log('');
  
  console.log('-- 3. Reset campaign daily counts (optional)');
  console.log('```sql');
  console.log(`UPDATE campaigns 
SET sent_count = 0, 
    failed_count = 0,
    opened_count = 0,
    clicked_count = 0,
    last_activity = NULL
WHERE id = '${campaignId}';`);
  console.log('```');
  console.log('');
  
  console.log('-- 4. Verify prospects are still assigned');
  console.log('```sql');
  console.log(`SELECT id, email, first_name, last_name, campaign_id
FROM prospects 
WHERE campaign_id = '${campaignId}';`);
  console.log('```');
  console.log('');
  
  console.log('Expected: Should see 3 prospects');
  console.log('');
  
  console.log('✅ After running these SQL commands:');
  console.log('');
  console.log('1. Test the API again:');
  console.log('```bash');
  console.log(`curl -X GET "https://app.leadsup.io/api/campaigns/automation/process-pending" \\
  -u "admin:Integral23.." | jq '.'`);
  console.log('```');
  console.log('');
  console.log('2. Should return 3 contacts ready for processing');
  console.log('');
  console.log('3. Trigger n8n workflow:');
  console.log('```bash');
  console.log('curl -X POST "https://yessabar.app.n8n.cloud/webhook-test/leadsup-webhook"');
  console.log('```');
  console.log('');
  
  // Test current status
  console.log('📊 Current Status Check:');
  try {
    const response = await fetch('https://app.leadsup.io/api/campaigns/automation/process-pending', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:Integral23..').toString('base64')
      }
    });
    
    const data = await response.json();
    console.log(`   API Success: ${data.success}`);
    console.log(`   Campaigns ready: ${data.data?.length || 0}`);
    
    if (data.data && data.data.length > 0) {
      console.log(`   Contacts ready: ${data.data[0].contacts?.length || 0}`);
    } else {
      console.log('   ❌ No contacts ready - run the SQL commands above to reset');
    }
    
  } catch (error) {
    console.log('   Error checking status:', error.message);
  }
  
  console.log('');
  console.log('💡 Note: The prospects have "failed" status from the earlier');
  console.log('tracking issue. Deleting these records will allow them to be');
  console.log('processed again with the fixed workflow.');
}

resetCampaignProspects();