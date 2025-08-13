// Comprehensive test script for domain-based email integration
const fetch = require('node-fetch');

// Configuration - you can customize these
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3008',
  // You'll need to provide these based on your setup
  testCampaignId: null, // Will be found dynamically
  testContactEmail: 'test@example.com',
  testSenderDomain: 'leadsup.io',
  automationUsername: process.env.AUTOMATION_API_USERNAME || 'admin',
  automationPassword: process.env.AUTOMATION_API_PASSWORD || 'password'
};

console.log('🧪 Domain-Based Email Integration Test Suite');
console.log('='.repeat(60));

// Helper function to make API calls with basic auth
async function makeApiCall(endpoint, method = 'GET', body = null) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  const auth = Buffer.from(`${TEST_CONFIG.automationUsername}:${TEST_CONFIG.automationPassword}`).toString('base64');
  
  const options = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`📡 ${method} ${url}`);
  const response = await fetch(url, options);
  const data = await response.json();
  
  console.log(`📈 Status: ${response.status}`);
  if (!response.ok) {
    console.log(`❌ Error:`, data);
  }
  
  return { response, data };
}

// Test 1: Verify SendGrid API Key and Basic Setup
async function testSendGridSetup() {
  console.log('\n📋 Test 1: SendGrid API Setup Verification');
  console.log('-'.repeat(40));
  
  try {
    // Check if SENDGRID_API_KEY is configured
    console.log('🔍 Checking SendGrid API configuration...');
    
    if (!process.env.SENDGRID_API_KEY) {
      console.log('❌ SENDGRID_API_KEY environment variable not found');
      console.log('💡 Set it with: export SENDGRID_API_KEY="your-sendgrid-api-key"');
      return false;
    }
    
    console.log('✅ SendGrid API key is configured');
    console.log(`📝 Key starts with: ${process.env.SENDGRID_API_KEY.substring(0, 7)}...`);
    
    return true;
  } catch (error) {
    console.log('❌ Error checking SendGrid setup:', error.message);
    return false;
  }
}

// Test 2: Verify Domain-Based Sender Accounts
async function testSenderAccounts() {
  console.log('\n📋 Test 2: Domain-Based Sender Accounts');
  console.log('-'.repeat(40));
  
  try {
    // Check if we have campaigns with selected sender accounts
    const { response, data } = await makeApiCall('/api/campaigns');
    
    if (!response.ok) {
      console.log('❌ Failed to fetch campaigns');
      return null;
    }
    
    console.log(`📊 Found ${data.campaigns?.length || 0} campaigns`);
    
    // Find a campaign with sender accounts
    let campaignWithSenders = null;
    
    for (const campaign of data.campaigns || []) {
      console.log(`🔍 Checking campaign: ${campaign.name} (ID: ${campaign.id})`);
      
      // Get sender assignments for this campaign
      const { response: sendersResponse, data: sendersData } = await makeApiCall(`/api/campaigns/${campaign.id}/senders`);
      
      if (sendersResponse.ok && sendersData.assignments?.length > 0) {
        console.log(`✅ Campaign "${campaign.name}" has ${sendersData.assignments.length} sender(s) assigned`);
        campaignWithSenders = campaign;
        TEST_CONFIG.testCampaignId = campaign.id;
        
        // Log sender details
        sendersData.assignments.forEach((assignment, index) => {
          console.log(`   ${index + 1}. Sender: ${assignment.email || assignment.sender_id}`);
        });
        
        break;
      } else {
        console.log(`⏭️ Campaign "${campaign.name}" has no sender accounts assigned`);
      }
    }
    
    if (!campaignWithSenders) {
      console.log('❌ No campaigns found with assigned sender accounts');
      console.log('💡 Please assign sender accounts to a campaign via the Campaign → Sender tab');
      return null;
    }
    
    console.log(`✅ Using campaign: "${campaignWithSenders.name}" (ID: ${campaignWithSenders.id})`);
    return campaignWithSenders;
    
  } catch (error) {
    console.log('❌ Error checking sender accounts:', error.message);
    return null;
  }
}

// Test 3: Test Outbound Email Sending
async function testOutboundEmail(campaign) {
  console.log('\n📋 Test 3: Outbound Email Sending');
  console.log('-'.repeat(40));
  
  try {
    if (!campaign) {
      console.log('❌ No campaign available for testing');
      return false;
    }
    
    console.log(`🚀 Testing outbound email via campaign: ${campaign.name}`);
    
    // Get campaign senders to verify we have at least one
    const { response: sendersResponse, data: sendersData } = await makeApiCall(`/api/campaigns/${campaign.id}/senders`);
    
    if (!sendersResponse.ok || !sendersData.assignments?.length) {
      console.log('❌ No sender accounts found for this campaign');
      return false;
    }
    
    const senderAccount = sendersData.assignments[0];
    console.log(`📧 Using sender: ${senderAccount.email || senderAccount.sender_id}`);
    
    // Test the automated email sending API
    console.log('🤖 Testing automated email sending...');
    const { response, data } = await makeApiCall('/api/campaigns/automation/send-emails', 'POST');
    
    if (response.ok) {
      console.log('✅ Send-emails API responded successfully');
      console.log(`📊 Results: ${data.sent || 0} sent, ${data.failed || 0} failed`);
      
      if (data.sent > 0) {
        console.log('🎉 Outbound emails sent successfully!');
        console.log('📧 Check the recipient email for delivery');
        return true;
      } else {
        console.log('⚠️ No emails were sent (this may be normal if no pending emails)');
        console.log('💡 To create test emails, add contacts to the campaign and set up sequences');
        return false;
      }
    } else {
      console.log('❌ Send-emails API failed:', data);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error testing outbound email:', error.message);
    return false;
  }
}

// Test 4: Test SendGrid Inbound Parse Webhook
async function testInboundWebhook() {
  console.log('\n📋 Test 4: Inbound Email Webhook');
  console.log('-'.repeat(40));
  
  try {
    console.log('🔍 Testing SendGrid inbound parse webhook...');
    
    // Test GET endpoint first (should return webhook status)
    const { response: getResponse, data: getData } = await makeApiCall('/api/webhooks/sendgrid', 'GET');
    
    if (getResponse.ok) {
      console.log('✅ Webhook endpoint is accessible');
      console.log(`📝 Status: ${getData.status}`);
      console.log(`📡 Method: ${getData.method}`);
      console.log(`📧 Provider: ${getData.provider}`);
    } else {
      console.log('❌ Webhook endpoint not accessible');
      return false;
    }
    
    // Test POST with sample data (simulates SendGrid sending a reply)
    console.log('\n🧪 Testing webhook with sample inbound email...');
    
    const sampleFormData = new FormData();
    sampleFormData.append('from', 'test-reply@example.com');
    sampleFormData.append('to', 'contact@leadsup.io');
    sampleFormData.append('subject', 'Re: Test Campaign Email');
    sampleFormData.append('text', 'This is a test reply to your campaign email.');
    sampleFormData.append('html', '<p>This is a test reply to your campaign email.</p>');
    sampleFormData.append('envelope', JSON.stringify({
      from: 'test-reply@example.com',
      to: ['contact@leadsup.io']
    }));
    
    const webhookResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/webhooks/sendgrid`, {
      method: 'POST',
      body: sampleFormData
    });
    
    const webhookData = await webhookResponse.json();
    
    console.log(`📈 Webhook response status: ${webhookResponse.status}`);
    console.log(`📋 Response:`, webhookData);
    
    if (webhookResponse.ok && webhookData.success !== false) {
      console.log('✅ Inbound webhook processed successfully');
      if (webhookData.messageId) {
        console.log(`📨 Message ID: ${webhookData.messageId}`);
      }
      return true;
    } else {
      console.log('⚠️ Webhook processed but may not have found matching campaign');
      console.log('💡 This is normal if the test email doesn\'t match any campaign senders');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error testing inbound webhook:', error.message);
    return false;
  }
}

// Test 5: Verify Database Integration
async function testDatabaseIntegration() {
  console.log('\n📋 Test 5: Database Integration Verification');
  console.log('-'.repeat(40));
  
  try {
    console.log('🔍 Checking campaign_senders table...');
    
    // Use the debug endpoint to check campaign_senders table
    const { response, data } = await makeApiCall('/api/debug/check-campaign-senders-table');
    
    if (response.ok && data.success) {
      console.log('✅ campaign_senders table exists and accessible');
      console.log(`📊 Table has ${data.totalRecords || 0} records`);
      
      if (data.columns) {
        console.log(`📋 Available columns: ${data.columns.join(', ')}`);
      }
      
      if (data.sampleRecord) {
        console.log('📝 Sample record structure:', Object.keys(data.sampleRecord));
      }
      
      return true;
    } else {
      console.log('❌ campaign_senders table check failed:', data);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error checking database integration:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n🚀 Starting Domain-Based Email Integration Tests...\n');
  
  const results = {
    sendgridSetup: false,
    senderAccounts: false,
    outboundEmail: false,
    inboundWebhook: false,
    databaseIntegration: false
  };
  
  // Run all tests
  results.sendgridSetup = await testSendGridSetup();
  
  const campaign = await testSenderAccounts();
  results.senderAccounts = !!campaign;
  
  results.outboundEmail = await testOutboundEmail(campaign);
  results.inboundWebhook = await testInboundWebhook();
  results.databaseIntegration = await testDatabaseIntegration();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'SendGrid API Setup', result: results.sendgridSetup },
    { name: 'Domain-Based Sender Accounts', result: results.senderAccounts },
    { name: 'Outbound Email Sending', result: results.outboundEmail },
    { name: 'Inbound Email Webhook', result: results.inboundWebhook },
    { name: 'Database Integration', result: results.databaseIntegration }
  ];
  
  tests.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.name}`);
  });
  
  const totalPassed = tests.filter(t => t.result).length;
  const totalTests = tests.length;
  
  console.log('\n📈 Overall Score:', `${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('🎉 All tests passed! Domain-based email integration is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the details above for troubleshooting.');
  }
  
  // Recommendations
  console.log('\n💡 NEXT STEPS:');
  
  if (!results.sendgridSetup) {
    console.log('1. Configure SendGrid API key in environment variables');
  }
  
  if (!results.senderAccounts) {
    console.log('2. Set up domains and assign sender accounts to campaigns');
  }
  
  if (!results.outboundEmail) {
    console.log('3. Add contacts and sequences to test outbound email sending');
  }
  
  if (!results.inboundWebhook) {
    console.log('4. Configure SendGrid Inbound Parse with webhook URL');
  }
  
  if (totalPassed === totalTests) {
    console.log('✅ Your domain-based email system is ready for production!');
    console.log('📧 Test by sending a campaign and replying to received emails');
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test suite failed:', error);
});