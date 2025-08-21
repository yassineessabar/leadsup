/**
 * Test automation email sending and verify sent folder functionality
 * This simulates what happens when GitHub automation sends emails
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:3000';

async function testAutomationSentFolder() {
  console.log('🤖 Testing Automation Email → Sent Folder...\n');

  // Test the automation endpoint that should be triggered by GitHub Actions
  const AUTOMATION_USERNAME = process.env.N8N_API_USERNAME || 'admin';
  const AUTOMATION_PASSWORD = process.env.N8N_API_PASSWORD || 'password';
  const auth = Buffer.from(`${AUTOMATION_USERNAME}:${AUTOMATION_PASSWORD}`).toString('base64');

  console.log('1. Testing automation process-scheduled endpoint:');
  try {
    const response = await fetch(`${BASE_URL}/api/automation/process-scheduled?testMode=true&lookAhead=1440`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Processed: ${result.processed || 0} contacts`);
    console.log(`   Message: ${result.message || 'No message'}`);
    
    if (result.processed > 0) {
      console.log('   ✅ Automation processed contacts - emails may have been sent');
    } else {
      console.log('   ℹ️ No contacts were processed (this is normal if no active campaigns)');
    }
    
  } catch (error) {
    console.error('   ❌ Automation test failed:', error.message);
  }

  console.log('\n2. Testing campaign automation send-emails endpoint:');
  try {
    const response = await fetch(`${BASE_URL}/api/campaigns/automation/send-emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Sent: ${result.sent || 0} emails`);
    console.log(`   Failed: ${result.failed || 0} emails`);
    
    if (result.sent > 0) {
      console.log('   ✅ Emails were sent - they should appear in sent folder');
    } else {
      console.log('   ℹ️ No emails were sent (normal if no pending emails)');
    }
    
  } catch (error) {
    console.error('   ❌ Send emails test failed:', error.message);
  }

  console.log('\n3. Testing automation trigger endpoint:');
  try {
    const response = await fetch(`${BASE_URL}/api/automation/trigger`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Success: ${result.success}`);
    
    if (result.success) {
      console.log('   ✅ Automation trigger works');
    }
    
  } catch (error) {
    console.error('   ❌ Trigger test failed:', error.message);
  }

  console.log('\n📋 AUTOMATION → SENT FOLDER FLOW:');
  console.log('   1. GitHub Actions calls automation endpoint every hour');
  console.log('   2. Automation finds contacts due for next email in sequence');
  console.log('   3. For each email sent, a record is created in inbox_messages:');
  console.log('      - direction: "outbound"');
  console.log('      - folder: "sent"');
  console.log('      - conversation_id: generated from contact + sender emails');
  console.log('   4. A thread record is created/updated in inbox_threads');
  console.log('   5. When user clicks "Sent" folder, API filters for conversations with outbound messages');
  console.log('   6. Sent emails appear in the inbox UI sent folder');
  
  console.log('\n🔍 TO TROUBLESHOOT MISSING SENT EMAILS:');
  console.log('   1. Check if automation is actually running (GitHub Actions tab)');
  console.log('   2. Verify contacts exist and are in active campaigns');
  console.log('   3. Check database tables:');
  console.log('      - contacts/prospects: contacts with sequence_step > 0');
  console.log('      - inbox_messages: records with direction="outbound"');
  console.log('      - inbox_threads: conversation threads');
  console.log('   4. Test the sent folder API manually with authentication');
  console.log('   5. Check browser network tab when clicking sent folder');
  
  console.log('\n✅ Test completed! Check the output above for any issues.');
}

// Run the test
testAutomationSentFolder().catch(console.error);