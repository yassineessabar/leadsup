/**
 * Debug Sending Hours Issue
 * Your campaign has sending_start_time: "12:00 AM" and sending_end_time: "12:00 AM"
 * This creates a 0-hour window which blocks all sending!
 */

function debugSendingHours() {
  console.log('🕒 Debugging Sending Hours Issue');
  console.log('=' .repeat(50));
  console.log('');
  
  console.log('🚨 PROBLEM FOUND:');
  console.log('Your campaign settings:');
  console.log('- sending_start_time: "12:00 AM" (midnight)');
  console.log('- sending_end_time: "12:00 AM" (midnight)');
  console.log('');
  console.log('This means: Start at 00:00, End at 00:00 = 0 hour window!');
  console.log('NO emails can be sent in a 0-hour window!');
  console.log('');
  
  console.log('🔧 FIX: Update Campaign Settings');
  console.log('');
  
  console.log('Option 1: Set a proper time window');
  console.log('```sql');
  console.log(`UPDATE campaign_settings 
SET sending_start_time = '9:00 AM',
    sending_end_time = '6:00 PM'
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';`);
  console.log('```');
  console.log('');
  
  console.log('Option 2: Set 24-hour sending (all day)');
  console.log('```sql');
  console.log(`UPDATE campaign_settings 
SET sending_start_time = '12:00 AM',
    sending_end_time = '11:59 PM'
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';`);
  console.log('```');
  console.log('');
  
  console.log('Option 3: Remove time restrictions entirely');
  console.log('```sql');
  console.log(`UPDATE campaign_settings 
SET sending_start_time = NULL,
    sending_end_time = NULL
WHERE campaign_id = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';`);
  console.log('```');
  console.log('');
  
  console.log('📊 Current Time Check:');
  const now = new Date();
  const utcHour = now.getUTCHours();
  console.log(`- Current UTC hour: ${utcHour}:00`);
  console.log(`- Current local time: ${now.toLocaleTimeString()}`);
  console.log('');
  
  console.log('🧪 After fixing the sending hours:');
  console.log('');
  console.log('1. Test locally:');
  console.log('```bash');
  console.log('curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \\');
  console.log('  -u "admin:password" | jq \'.\'');
  console.log('```');
  console.log('');
  console.log('2. Test production:');
  console.log('```bash');
  console.log('curl -X GET "https://app.leadsup.io/api/campaigns/automation/process-pending" \\');
  console.log('  -u "admin:Integral23.." | jq \'.\'');
  console.log('```');
  console.log('');
  console.log('3. Should now see 3 contacts ready!');
  console.log('');
  console.log('💡 TIP: For testing, use Option 2 (24-hour sending) to avoid timezone issues.');
}

debugSendingHours();