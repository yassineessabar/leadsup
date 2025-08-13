const fetch = require('node-fetch');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_USERNAME = process.env.N8N_API_USERNAME || 'admin';
const API_PASSWORD = process.env.N8N_API_PASSWORD || 'password';
const SENDGRID_WEBHOOK_URL = `${BASE_URL}/api/webhooks/sendgrid`;

// Test data
let testCampaignId = null;
let testSenderEmail = null;
let testRecipientEmail = null;

async function testOutboundEmail() {
  console.log('\n=================================================');
  console.log('📤 TESTING OUTBOUND EMAIL VIA SENDGRID');
  console.log('=================================================\n');

  try {
    // Get campaign ID and sender details
    testCampaignId = await question('Enter the campaign ID to test: ');
    testSenderEmail = await question('Enter the sender email address attached to the campaign: ');
    testRecipientEmail = await question('Enter a test recipient email address: ');

    console.log('\n🔍 Fetching campaign details...');
    
    // First, let's verify the campaign and sender exist
    const verifyResponse = await fetch(`${BASE_URL}/api/campaigns/${testCampaignId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
      }
    });

    if (!verifyResponse.ok) {
      throw new Error(`Campaign ${testCampaignId} not found`);
    }

    console.log('✅ Campaign found');

    // Create a test prospect
    console.log('\n📝 Creating test prospect...');
    const testProspect = {
      email: testRecipientEmail,
      firstName: 'Test',
      lastName: 'User',
      company: 'Test Company',
      title: 'QA Tester',
      timezone_group: 'T1',
      sender_email: testSenderEmail
    };

    // Add test prospect to campaign
    const addProspectResponse = await fetch(`${BASE_URL}/api/campaigns/${testCampaignId}/prospects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({
        prospects: [testProspect]
      })
    });

    if (!addProspectResponse.ok) {
      const error = await addProspectResponse.json();
      console.error('❌ Failed to add prospect:', error);
      throw new Error('Failed to add test prospect to campaign');
    }

    console.log('✅ Test prospect added to campaign');

    // Send test email
    console.log('\n📧 Sending test email via SendGrid...');
    const sendEmailResponse = await fetch(`${BASE_URL}/api/campaigns/automation/send-emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
      }
    });

    const sendResult = await sendEmailResponse.json();
    
    if (!sendResult.success) {
      throw new Error(`Failed to send email: ${JSON.stringify(sendResult)}`);
    }

    console.log('✅ Email sent successfully!');
    console.log('📊 Send results:', {
      sent: sendResult.sent,
      failed: sendResult.failed,
      sender_usage: sendResult.sender_usage,
      features_used: sendResult.features_used
    });

    // Check inbox messages table
    console.log('\n🔍 Verifying email was logged to inbox_messages...');
    const inboxCheckResponse = await fetch(`${BASE_URL}/api/inbox/messages?campaign_id=${testCampaignId}&direction=outbound`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
      }
    });

    if (inboxCheckResponse.ok) {
      const inboxData = await inboxCheckResponse.json();
      if (inboxData.messages && inboxData.messages.length > 0) {
        const latestMessage = inboxData.messages[0];
        console.log('✅ Outbound email logged in inbox_messages:');
        console.log('   - Message ID:', latestMessage.message_id);
        console.log('   - From:', latestMessage.sender_email);
        console.log('   - To:', latestMessage.contact_email);
        console.log('   - Subject:', latestMessage.subject);
        console.log('   - Status:', latestMessage.status);
        console.log('   - Direction:', latestMessage.direction);
      }
    }

    return true;

  } catch (error) {
    console.error('❌ Outbound email test failed:', error);
    return false;
  }
}

async function testInboundEmail() {
  console.log('\n=================================================');
  console.log('📥 TESTING INBOUND EMAIL (WEBHOOK SIMULATION)');
  console.log('=================================================\n');

  try {
    if (!testSenderEmail || !testRecipientEmail) {
      console.log('⚠️ Need to run outbound test first to set up test data');
      return false;
    }

    console.log('🔍 Simulating email reply via SendGrid webhook...');
    console.log(`   From: ${testRecipientEmail} (the prospect)`);
    console.log(`   To: ${testSenderEmail} (the campaign sender)`);

    // Simulate SendGrid webhook payload
    const formData = new URLSearchParams();
    formData.append('from', `Test User <${testRecipientEmail}>`);
    formData.append('to', testSenderEmail);
    formData.append('subject', 'Re: Test Campaign Email');
    formData.append('text', 'This is a test reply to your campaign email. I am interested in learning more about your product.');
    formData.append('html', '<p>This is a test reply to your campaign email. I am interested in learning more about your product.</p>');
    formData.append('envelope', JSON.stringify({
      from: testRecipientEmail,
      to: [testSenderEmail]
    }));
    formData.append('spam_score', '0.1');
    formData.append('spam_report', 'Spam detection software, running on the system "example.com"');
    formData.append('attachments', '0');
    formData.append('charsets', '{"to":"UTF-8","subject":"UTF-8","from":"UTF-8","text":"UTF-8"}');
    formData.append('headers', `Received: from mail.example.com
From: Test User <${testRecipientEmail}>
To: ${testSenderEmail}
Subject: Re: Test Campaign Email
Date: ${new Date().toISOString()}`);

    // Send webhook request
    const webhookResponse = await fetch(SENDGRID_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const webhookResult = await webhookResponse.json();
    
    if (!webhookResult.success) {
      throw new Error(`Webhook processing failed: ${JSON.stringify(webhookResult)}`);
    }

    console.log('✅ Webhook processed successfully!');
    console.log('📊 Webhook result:', {
      messageId: webhookResult.messageId,
      conversationId: webhookResult.conversationId,
      processed: webhookResult.processed
    });

    // Verify the inbound message was stored
    console.log('\n🔍 Verifying inbound email was stored...');
    const inboxCheckResponse = await fetch(`${BASE_URL}/api/inbox/messages?campaign_id=${testCampaignId}&direction=inbound`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
      }
    });

    if (inboxCheckResponse.ok) {
      const inboxData = await inboxCheckResponse.json();
      if (inboxData.messages && inboxData.messages.length > 0) {
        const latestMessage = inboxData.messages[0];
        console.log('✅ Inbound email stored in inbox_messages:');
        console.log('   - Message ID:', latestMessage.message_id);
        console.log('   - From:', latestMessage.contact_email);
        console.log('   - To:', latestMessage.sender_email);
        console.log('   - Subject:', latestMessage.subject);
        console.log('   - Status:', latestMessage.status);
        console.log('   - Direction:', latestMessage.direction);
        console.log('   - Body preview:', latestMessage.body_text?.substring(0, 100));
      }
    }

    return true;

  } catch (error) {
    console.error('❌ Inbound email test failed:', error);
    return false;
  }
}

async function testFullEmailFlow() {
  console.log('\n=================================================');
  console.log('🔄 COMPLETE EMAIL FLOW TEST');
  console.log('=================================================');
  console.log('\nThis test will:');
  console.log('1. Send an outbound email via SendGrid');
  console.log('2. Simulate an inbound reply via webhook');
  console.log('3. Verify both messages are properly stored\n');

  const proceed = await question('Continue with test? (y/n): ');
  
  if (proceed.toLowerCase() !== 'y') {
    console.log('Test cancelled');
    rl.close();
    return;
  }

  // Run outbound test
  const outboundSuccess = await testOutboundEmail();
  
  if (!outboundSuccess) {
    console.log('\n❌ Outbound test failed. Aborting full flow test.');
    rl.close();
    return;
  }

  // Wait a moment before testing inbound
  console.log('\n⏳ Waiting 3 seconds before testing inbound...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Run inbound test
  const inboundSuccess = await testInboundEmail();

  // Summary
  console.log('\n=================================================');
  console.log('📊 TEST SUMMARY');
  console.log('=================================================');
  console.log(`✅ Outbound Email Test: ${outboundSuccess ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Inbound Email Test: ${inboundSuccess ? 'PASSED' : 'FAILED'}`);
  
  if (outboundSuccess && inboundSuccess) {
    console.log('\n🎉 All tests passed! Email flow is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('1. Check your test recipient inbox for the actual email');
    console.log('2. Try replying to the email to test real inbound processing');
    console.log('3. Monitor the SendGrid webhook logs for real replies');
    console.log('4. Check the inbox UI to see the conversation thread');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the error messages above.');
  }

  rl.close();
}

async function testEmailThreading() {
  console.log('\n=================================================');
  console.log('🧵 TESTING EMAIL THREADING');
  console.log('=================================================\n');

  try {
    if (!testCampaignId) {
      testCampaignId = await question('Enter the campaign ID to test: ');
    }

    console.log('🔍 Fetching conversation threads...');
    
    const threadsResponse = await fetch(`${BASE_URL}/api/inbox/threads?campaign_id=${testCampaignId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
      }
    });

    if (!threadsResponse.ok) {
      throw new Error('Failed to fetch threads');
    }

    const threadsData = await threadsResponse.json();
    
    if (threadsData.threads && threadsData.threads.length > 0) {
      console.log(`\n✅ Found ${threadsData.threads.length} conversation thread(s):\n`);
      
      for (const thread of threadsData.threads) {
        console.log(`📧 Thread: ${thread.conversation_id}`);
        console.log(`   Contact: ${thread.contact_email} (${thread.contact_name || 'Unknown'})`);
        console.log(`   Subject: ${thread.subject}`);
        console.log(`   Last Message: ${thread.last_message_preview}`);
        console.log(`   Last Activity: ${new Date(thread.last_message_at).toLocaleString()}`);
        console.log(`   Status: ${thread.status}`);
        console.log('');

        // Fetch messages in this thread
        const messagesResponse = await fetch(`${BASE_URL}/api/inbox/messages?conversation_id=${thread.conversation_id}`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
          }
        });

        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          if (messagesData.messages && messagesData.messages.length > 0) {
            console.log(`   📨 Messages in thread (${messagesData.messages.length}):`);
            for (const msg of messagesData.messages) {
              const direction = msg.direction === 'outbound' ? '➡️' : '⬅️';
              console.log(`      ${direction} ${new Date(msg.sent_at).toLocaleString()} - ${msg.body_text?.substring(0, 50)}...`);
            }
          }
        }
        console.log('   ---');
      }
    } else {
      console.log('❌ No conversation threads found');
    }

  } catch (error) {
    console.error('❌ Threading test failed:', error);
  }
}

// Main menu
async function main() {
  console.log('\n🚀 SENDGRID EMAIL FLOW TEST SUITE');
  console.log('=====================================\n');
  console.log('Select a test to run:');
  console.log('1. Full Email Flow Test (Outbound + Inbound)');
  console.log('2. Outbound Email Test Only');
  console.log('3. Inbound Webhook Test Only');
  console.log('4. View Email Threads');
  console.log('5. Exit\n');

  const choice = await question('Enter your choice (1-5): ');

  switch(choice) {
    case '1':
      await testFullEmailFlow();
      break;
    case '2':
      await testOutboundEmail();
      rl.close();
      break;
    case '3':
      await testInboundEmail();
      rl.close();
      break;
    case '4':
      await testEmailThreading();
      rl.close();
      break;
    case '5':
      console.log('Goodbye!');
      rl.close();
      break;
    default:
      console.log('Invalid choice');
      rl.close();
  }
}

// Run the test
main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});