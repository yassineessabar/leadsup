// Test script for SendGrid Inbound Parse webhook functionality
const fetch = require('node-fetch');
const FormData = require('form-data');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3008',
  webhookEndpoint: '/api/webhooks/sendgrid'
};

async function testWebhookEndpoint() {
  console.log('🕸️ Testing SendGrid Inbound Parse Webhook');
  console.log('='.repeat(50));
  
  try {
    console.log('🔍 Step 1: Testing webhook availability...');
    
    // Test GET endpoint first
    const getResponse = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.webhookEndpoint}`);
    const getResult = await getResponse.json();
    
    console.log(`📡 GET Response: ${getResponse.status}`);
    console.log('📋 Webhook Info:', getResult);
    
    if (!getResponse.ok) {
      console.log('❌ Webhook endpoint not accessible');
      return false;
    }
    
    console.log('✅ Webhook endpoint is active');
    return true;
    
  } catch (error) {
    console.log('❌ Error testing webhook endpoint:', error.message);
    return false;
  }
}

async function simulateInboundEmail() {
  console.log('\n📨 Step 2: Simulating inbound email...');
  
  try {
    // Create form data as SendGrid would send it
    const formData = new FormData();
    
    // Basic email data
    formData.append('from', 'customer@example.com');
    formData.append('to', 'contact@leadsup.io');
    formData.append('subject', 'Re: Test Campaign Email');
    formData.append('text', 'Thank you for your email! I am interested in learning more about your service.');
    formData.append('html', '<p>Thank you for your email! I am interested in learning more about your service.</p>');
    
    // SendGrid envelope data
    const envelope = {
      from: 'customer@example.com',
      to: ['contact@leadsup.io']
    };
    formData.append('envelope', JSON.stringify(envelope));
    
    // Additional SendGrid fields
    formData.append('headers', JSON.stringify({
      'Message-Id': '<test-message-id@example.com>',
      'Date': new Date().toISOString(),
      'From': 'customer@example.com',
      'To': 'contact@leadsup.io',
      'Subject': 'Re: Test Campaign Email'
    }));
    
    formData.append('charsets', JSON.stringify({
      'from': 'UTF-8',
      'to': 'UTF-8',
      'subject': 'UTF-8',
      'text': 'UTF-8'
    }));
    
    formData.append('spam_score', '0.5');
    formData.append('spam_report', '');
    formData.append('attachments', '0');
    
    console.log('📤 Sending simulated webhook data...');
    console.log('📋 Simulated email:');
    console.log(`   From: customer@example.com`);
    console.log(`   To: contact@leadsup.io`);
    console.log(`   Subject: Re: Test Campaign Email`);
    
    // Send to webhook
    const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.webhookEndpoint}`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    console.log(`📡 Webhook Response: ${response.status}`);
    console.log('📋 Response Data:', result);
    
    if (response.ok) {
      console.log('✅ Webhook processed email successfully');
      if (result.messageId) {
        console.log(`📨 Created message ID: ${result.messageId}`);
      }
      if (result.conversationId) {
        console.log(`🧵 Conversation ID: ${result.conversationId}`);
      }
      return true;
    } else {
      console.log('❌ Webhook processing failed');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error simulating inbound email:', error.message);
    return false;
  }
}

async function testCampaignSenderEmail() {
  console.log('\n📧 Step 3: Testing with actual campaign sender...');
  
  try {
    // First, let's check if we have any campaign senders
    console.log('🔍 Checking for existing campaign senders...');
    
    const authHeader = Buffer.from(`admin:password`).toString('base64');
    const campaignsResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/campaigns`, {
      headers: {
        'Authorization': `Basic ${authHeader}`
      }
    });
    
    if (!campaignsResponse.ok) {
      console.log('❌ Cannot access campaigns API');
      return false;
    }
    
    const campaignsData = await campaignsResponse.json();
    
    if (!campaignsData.campaigns || campaignsData.campaigns.length === 0) {
      console.log('⚠️ No campaigns found, creating simulated test...');
      return await simulateWithKnownSender();
    }
    
    // Get sender accounts for first campaign
    const firstCampaign = campaignsData.campaigns[0];
    const sendersResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/campaigns/${firstCampaign.id}/senders`, {
      headers: {
        'Authorization': `Basic ${authHeader}`
      }
    });
    
    if (!sendersResponse.ok) {
      console.log('⚠️ Cannot access campaign senders, using simulated test...');
      return await simulateWithKnownSender();
    }
    
    const sendersData = await sendersResponse.json();
    
    if (!sendersData.assignments || sendersData.assignments.length === 0) {
      console.log('⚠️ No sender assignments found, using simulated test...');
      return await simulateWithKnownSender();
    }
    
    // Use first sender account
    const senderAccount = sendersData.assignments[0];
    const senderEmail = senderAccount.email || 'contact@leadsup.io';
    
    console.log(`📧 Testing with real campaign sender: ${senderEmail}`);
    
    // Create realistic inbound email for this sender
    const formData = new FormData();
    
    formData.append('from', 'prospect@company.com');
    formData.append('to', senderEmail);
    formData.append('subject', 'Re: Your outreach about our marketing needs');
    formData.append('text', `Hi there,

Thanks for reaching out! I'm definitely interested in learning more about your solution.

Could you please send me some more information about:
- Pricing options
- Implementation timeline
- Success stories from similar companies

Looking forward to hearing from you.

Best regards,
John Smith
Marketing Director`);
    
    formData.append('html', `<p>Hi there,</p>
<p>Thanks for reaching out! I'm definitely interested in learning more about your solution.</p>
<p>Could you please send me some more information about:</p>
<ul>
<li>Pricing options</li>
<li>Implementation timeline</li>
<li>Success stories from similar companies</li>
</ul>
<p>Looking forward to hearing from you.</p>
<p>Best regards,<br>
John Smith<br>
Marketing Director</p>`);
    
    const envelope = {
      from: 'prospect@company.com',
      to: [senderEmail]
    };
    formData.append('envelope', JSON.stringify(envelope));
    
    // Additional realistic headers
    formData.append('headers', JSON.stringify({
      'Message-Id': `<reply-${Date.now()}@company.com>`,
      'Date': new Date().toISOString(),
      'From': 'John Smith <prospect@company.com>',
      'To': senderEmail,
      'Subject': 'Re: Your outreach about our marketing needs',
      'In-Reply-To': '<original-campaign-email@leadsup.io>',
      'References': '<original-campaign-email@leadsup.io>'
    }));
    
    formData.append('charsets', JSON.stringify({
      'from': 'UTF-8',
      'to': 'UTF-8',
      'subject': 'UTF-8',
      'text': 'UTF-8'
    }));
    
    formData.append('spam_score', '1.2');
    formData.append('spam_report', '');
    formData.append('attachments', '0');
    
    console.log('📤 Sending realistic campaign reply...');
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.webhookEndpoint}`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    console.log(`📡 Response: ${response.status}`);
    console.log('📋 Result:', result);
    
    if (response.ok && result.success !== false) {
      console.log('✅ Campaign reply processed successfully');
      return true;
    } else {
      console.log('⚠️ Campaign reply processed but may not have matched sender');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error testing campaign sender email:', error.message);
    return false;
  }
}

async function simulateWithKnownSender() {
  console.log('📧 Testing with known sender format...');
  
  // Simulate what happens when we have a campaign sender in the database
  const formData = new FormData();
  
  formData.append('from', 'lead@potential-customer.com');
  formData.append('to', 'contact@leadsup.io'); // Known sender domain
  formData.append('subject', 'Re: LeadsUp Marketing Solution');
  formData.append('text', 'Hi! Your email caught my attention. Can we schedule a call to discuss further?');
  formData.append('html', '<p>Hi! Your email caught my attention. Can we schedule a call to discuss further?</p>');
  
  const envelope = {
    from: 'lead@potential-customer.com',
    to: ['contact@leadsup.io']
  };
  formData.append('envelope', JSON.stringify(envelope));
  
  formData.append('headers', JSON.stringify({
    'Message-Id': '<known-sender-test@potential-customer.com>',
    'Date': new Date().toISOString(),
    'From': 'lead@potential-customer.com',
    'To': 'contact@leadsup.io',
    'Subject': 'Re: LeadsUp Marketing Solution'
  }));
  
  formData.append('charsets', '{}');
  formData.append('spam_score', '0.1');
  formData.append('spam_report', '');
  formData.append('attachments', '0');
  
  console.log('📤 Sending known sender test...');
  
  const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.webhookEndpoint}`, {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  console.log(`📡 Response: ${response.status}`);
  console.log('📋 Result:', result);
  
  return response.ok;
}

async function testVariousEmailFormats() {
  console.log('\n📧 Step 4: Testing various email formats...');
  
  const testCases = [
    {
      name: 'Plain text reply',
      from: 'user1@test.com',
      to: 'contact@leadsup.io',
      subject: 'Re: Test',
      text: 'Simple plain text reply',
      html: ''
    },
    {
      name: 'HTML rich reply',
      from: 'user2@test.com',
      to: 'contact@leadsup.io',
      subject: 'Re: Rich Test',
      text: '',
      html: '<h2>Rich Reply</h2><p>This is a <strong>rich HTML</strong> reply with <em>formatting</em>.</p>'
    },
    {
      name: 'Mixed content reply',
      from: 'user3@test.com',
      to: 'contact@leadsup.io',
      subject: 'Re: Mixed Test',
      text: 'This is the plain text version of the reply.',
      html: '<p>This is the <strong>HTML version</strong> of the reply.</p>'
    }
  ];
  
  let successCount = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      
      const formData = new FormData();
      formData.append('from', testCase.from);
      formData.append('to', testCase.to);
      formData.append('subject', testCase.subject);
      formData.append('text', testCase.text);
      formData.append('html', testCase.html);
      
      const envelope = {
        from: testCase.from,
        to: [testCase.to]
      };
      formData.append('envelope', JSON.stringify(envelope));
      
      const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.webhookEndpoint}`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${testCase.name} - Success`);
        successCount++;
      } else {
        console.log(`❌ ${testCase.name} - Failed: ${result.error || 'Unknown error'}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`❌ ${testCase.name} - Error: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Format tests: ${successCount}/${testCases.length} successful`);
  return successCount === testCases.length;
}

// Main test runner
async function runInboundTests() {
  console.log('🕸️ SendGrid Inbound Parse Webhook Tests');
  console.log('='.repeat(60));
  
  const results = {
    webhookAvailable: false,
    basicInbound: false,
    campaignSender: false,
    variousFormats: false
  };
  
  try {
    // Test 1: Webhook endpoint availability
    results.webhookAvailable = await testWebhookEndpoint();
    
    if (!results.webhookAvailable) {
      console.log('❌ Cannot proceed - webhook endpoint not available');
      return results;
    }
    
    // Test 2: Basic inbound email simulation
    results.basicInbound = await simulateInboundEmail();
    
    // Test 3: Campaign sender specific email
    results.campaignSender = await testCampaignSenderEmail();
    
    // Test 4: Various email formats
    results.variousFormats = await testVariousEmailFormats();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 INBOUND WEBHOOK TEST RESULTS');
    console.log('='.repeat(60));
    
    const tests = [
      { name: 'Webhook Endpoint Available', result: results.webhookAvailable },
      { name: 'Basic Inbound Processing', result: results.basicInbound },
      { name: 'Campaign Sender Matching', result: results.campaignSender },
      { name: 'Various Email Formats', result: results.variousFormats }
    ];
    
    tests.forEach(test => {
      const status = test.result ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test.name}`);
    });
    
    const totalPassed = tests.filter(t => t.result).length;
    console.log(`\n📈 Score: ${totalPassed}/${tests.length} tests passed`);
    
    if (totalPassed === tests.length) {
      console.log('\n🎉 All inbound webhook tests passed!');
      console.log('📧 Your inbound email system is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the logs above for details.');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('1. Configure SendGrid Inbound Parse settings');
    console.log('2. Set webhook URL to: https://yourdomain.com/api/webhooks/sendgrid');
    console.log('3. Test with real emails by replying to campaign messages');
    console.log('4. Monitor logs and inbox_messages table for captured replies');
    
    return results;
    
  } catch (error) {
    console.error('\n💥 Inbound webhook tests failed:', error);
    return results;
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  runInboundTests();
}

module.exports = {
  testWebhookEndpoint,
  simulateInboundEmail,
  testCampaignSenderEmail,
  runInboundTests
};