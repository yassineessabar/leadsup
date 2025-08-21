/**
 * Test script to force send an email for testing purposes
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function forceSendTest() {
  console.log('🧪 Testing forced email send...\n');

  const AUTOMATION_USERNAME = process.env.N8N_API_USERNAME || 'admin';
  const AUTOMATION_PASSWORD = process.env.N8N_API_PASSWORD || 'password';
  const auth = Buffer.from(`${AUTOMATION_USERNAME}:${AUTOMATION_PASSWORD}`).toString('base64');

  // First, let's check what contacts exist
  console.log('1. Testing with much larger lookahead (7 days)...');
  try {
    const response = await fetch('http://localhost:3000/api/automation/process-scheduled?testMode=true&lookAhead=10080', { // 7 days in minutes
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('Response with 7-day lookahead:', JSON.stringify(result, null, 2));
    
    if (result.processed > 0) {
      console.log('✅ Emails would be sent with longer lookahead!');
    } else {
      console.log('ℹ️ Still no emails even with 7-day lookahead');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n2. Testing campaign send-emails endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/campaigns/automation/send-emails', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('Campaign send-emails response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Campaign send test failed:', error.message);
  }

  console.log('\n📋 Analysis:');
  console.log('- If 7-day lookahead shows emails: timing calculation issue');
  console.log('- If still no emails: contact setup or campaign status issue');
  console.log('- Check if campaign is Active and contacts have proper sequence steps');
}

// Run the test
forceSendTest().catch(console.error);