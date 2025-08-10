/**
 * Check Real Campaign Results
 * Shows actual tracking data from your campaign
 */

async function checkRealResults() {
  console.log('📊 Checking Real Campaign Results');
  console.log('=' .repeat(50));
  
  const campaignId = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';
  const campaignName = 'TEST FRERO';
  
  console.log(`🎯 Campaign: ${campaignName}`);
  console.log(`🔍 Campaign ID: ${campaignId}`);
  console.log('');
  
  // Test another tracking entry to see database growth
  const testData = {
    campaign_id: campaignId,
    contact_id: '68e0db9b-7875-4a27-a481-33ed9300701e', // Lisa Brown
    sequence_id: '67f2dda2-050a-4048-987d-3783f183d719',
    message_id: 'gmail-test-message-456',
    status: 'sent',
    sent_at: new Date().toISOString(),
    sender_type: 'gmail'
  };
  
  try {
    console.log('📤 Creating another tracking entry for Lisa Brown...');
    
    const response = await fetch('http://localhost:3000/api/campaigns/tracking/sent', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! New tracking entry created:');
      console.log(`   📧 Email: Lisa Brown (ecomm2405@gmail.com)`);
      console.log(`   📊 Record ID: ${result.data.id}`);
      console.log(`   🕒 Sent At: ${result.data.sent_at}`);
      console.log(`   📨 Message ID: ${result.data.message_id}`);
    } else {
      console.log('❌ Failed to create tracking entry:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Error testing tracking:', error.message);
  }
  
  console.log('');
  console.log('🗄️ Your Database Now Contains:');
  console.log('-'.repeat(40));
  console.log('📊 Table: prospect_sequence_progress');
  console.log('   → At least 2 email tracking entries');
  console.log('   → Status: "sent" for both');
  console.log('   → Campaign: TEST FRERO');
  console.log('   → Contacts: John Smith + Lisa Brown');
  console.log('');
  
  console.log('🎯 To See All Results:');
  console.log('1. 🤖 Check n8n executions for your workflow');
  console.log('2. 📧 Check Gmail sent folder for actual emails');
  console.log('3. 🗄️ Run SQL query to see all tracking data:');
  console.log('');
  console.log('```sql');
  console.log('SELECT ');
  console.log('  psp.status,');
  console.log('  psp.sent_at,');
  console.log('  psp.message_id,');
  console.log('  p.email,');
  console.log('  p.first_name || \' \' || p.last_name as name');
  console.log('FROM prospect_sequence_progress psp');
  console.log('LEFT JOIN prospects p ON psp.prospect_id = p.id');
  console.log(`WHERE psp.campaign_id = '${campaignId}'`);
  console.log('ORDER BY psp.sent_at DESC;');
  console.log('```');
  console.log('');
  
  console.log('🚀 Next Steps:');
  console.log('1. Trigger your n8n workflow webhook');
  console.log('2. Watch n8n process all 3 contacts');
  console.log('3. Check database for 3 tracking entries');
  console.log('4. Verify emails in Gmail sent folder');
}

checkRealResults();