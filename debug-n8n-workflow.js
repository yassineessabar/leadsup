/**
 * Debug n8n Workflow Issue
 * Why is it going to "Log No Emails"?
 */

async function debugN8NWorkflow() {
  console.log('🔍 Debugging n8n Workflow - "Log No Emails" Issue');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Check what the "Get Pending Emails" node receives
    console.log('📡 Step 1: Testing "Get Pending Emails" API call');
    console.log('-'.repeat(40));
    
    const response = await fetch('https://app.leadsup.io/api/campaigns/automation/process-pending', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64'),
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('📊 API Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Data length: ${data.data?.length || 0}`);
    
    if (data.success && data.data?.length > 0) {
      const campaign = data.data[0];
      console.log(`   Campaign: ${campaign.name}`);
      console.log(`   Contacts: ${campaign.contacts?.length || 0}`);
      console.log(`   Senders: ${campaign.senders?.length || 0}`);
    }
    
    // Step 2: Simulate what "Transform Data" node should do
    console.log('\\n🔄 Step 2: Simulating "Transform Data" Node');
    console.log('-'.repeat(40));
    
    if (!data.success || !data.data || data.data.length === 0) {
      console.log('❌ Issue: No campaign data found');
      console.log('   → This would cause "Log No Emails"');
      return;
    }
    
    const campaignData = data.data[0];
    const contacts = campaignData.contacts || [];
    
    if (contacts.length === 0) {
      console.log('❌ Issue: No contacts found in campaign');
      console.log('   → This would cause "Log No Emails"');
      return;
    }
    
    // Transform each contact
    const emailsToSend = contacts.map(contact => {
      const sequence = contact.nextSequence;
      const sender = contact.sender;
      
      return {
        email: contact.email,
        subject: sequence.subject,
        body: sequence.content,
        sender_email: sender.email,
        sender_name: sender.name,
        campaign_id: campaignData.id,
        contact_id: contact.id,
        sequence_id: sequence.id
      };
    });
    
    console.log(`✅ Transform Data would create: ${emailsToSend.length} emails`);
    console.log('📧 Sample email:');
    console.log(`   To: ${emailsToSend[0].email}`);
    console.log(`   Subject: ${emailsToSend[0].subject}`);
    console.log(`   From: ${emailsToSend[0].sender_name}`);
    
    // Step 3: Check the "Check Has Emails" condition
    console.log('\\n🔍 Step 3: Checking "Check Has Emails" Condition');
    console.log('-'.repeat(40));
    
    const emailArray = emailsToSend; // This is what Transform Data outputs
    const hasEmails = emailArray.length > 0;
    
    console.log(`📊 Email array length: ${emailArray.length}`);
    console.log(`🎯 Condition "$json.length > 0": ${hasEmails}`);
    
    if (hasEmails) {
      console.log('✅ Should go to "Send Email (Gmail)" path');
    } else {
      console.log('❌ Would go to "Log No Emails" path');
    }
    
    // Step 4: Identify the likely issue
    console.log('\\n🕵️ Step 4: Likely Issues');
    console.log('-'.repeat(40));
    
    console.log('Possible reasons for "Log No Emails":');
    console.log('');
    
    console.log('1. 🌐 API URL Issue:');
    console.log('   → n8n calls: "https://app.leadsup.io/api/..."');
    console.log('   → But your app runs on: "http://localhost:3000"');
    console.log('   → n8n might be getting 404 or empty response');
    console.log('');
    
    console.log('2. 🔐 Authentication Issue:');
    console.log('   → n8n might not have correct Basic Auth credentials');
    console.log('   → Check n8n credential configuration');
    console.log('');
    
    console.log('3. 📊 Data Format Issue:');
    console.log('   → Transform Data might not return array format');
    console.log('   → Check n8n Transform Data node output');
    console.log('');
    
    console.log('4. ⏰ Timing Issue:');
    console.log('   → Contacts might be filtered out by timezone/scheduling');
    console.log('   → Check if contacts are actually "ready to send"');
    console.log('');
    
    // Step 5: Show debugging steps
    console.log('🔧 Debugging Steps:');
    console.log('-'.repeat(40));
    console.log('');
    
    console.log('In n8n interface:');
    console.log('1. Go to latest execution of "My workflow 10"');
    console.log('2. Click "Get Pending Emails" node');
    console.log('   → Check if it returns data');
    console.log('   → Look for errors or empty response');
    console.log('3. Click "Transform Data" node');
    console.log('   → Check console output for email count');
    console.log('   → Verify it returns array of emails');
    console.log('4. Click "Check Has Emails" node');
    console.log('   → See which path it takes (true/false)');
    console.log('');
    
    console.log('🚨 Most Likely Fix:');
    console.log('   → Update n8n "Get Pending Emails" node URL');
    console.log('   → From: "https://app.leadsup.io/api/..."');
    console.log('   → To: "http://localhost:3000/api/..." (if local)');
    console.log('   → Or ensure your domain is accessible from n8n');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugN8NWorkflow();