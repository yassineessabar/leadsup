const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_USERNAME = process.env.N8N_API_USERNAME || 'admin';
const API_PASSWORD = process.env.N8N_API_PASSWORD || 'password';

async function testCampaignEmail() {
  console.log('\n=================================================');
  console.log('📧 TESTING CAMPAIGN EMAIL SENDING');
  console.log('=================================================\n');

  try {
    // First, let's get the list of campaigns to find one with attached senders
    console.log('🔍 Fetching campaigns with attached senders...\n');
    
    const campaignsResponse = await fetch(`${BASE_URL}/api/campaigns`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
      }
    });

    if (!campaignsResponse.ok) {
      throw new Error('Failed to fetch campaigns');
    }

    const campaignsData = await campaignsResponse.json();
    
    if (!campaignsData.campaigns || campaignsData.campaigns.length === 0) {
      console.log('❌ No campaigns found');
      return;
    }

    // Find a campaign with attached senders
    let selectedCampaign = null;
    let campaignSenders = [];

    for (const campaign of campaignsData.campaigns) {
      console.log(`Checking campaign: ${campaign.name} (${campaign.id})`);
      
      // Get senders for this campaign
      const sendersResponse = await fetch(`${BASE_URL}/api/campaign-senders?campaign_id=${campaign.id}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
        }
      });

      if (sendersResponse.ok) {
        const sendersData = await sendersResponse.json();
        if (sendersData.senders && sendersData.senders.length > 0) {
          selectedCampaign = campaign;
          campaignSenders = sendersData.senders;
          console.log(`  ✅ Found ${campaignSenders.length} sender(s) attached\n`);
          break;
        }
      }
    }

    if (!selectedCampaign) {
      console.log('❌ No campaigns with attached senders found');
      console.log('Please attach email accounts to a campaign first');
      return;
    }

    console.log('📋 Selected Campaign:', selectedCampaign.name);
    console.log('📧 Attached Senders:');
    campaignSenders.forEach((sender, index) => {
      console.log(`   ${index + 1}. ${sender.email} (${sender.name || 'No name'})`);
    });

    // Send a test email through the campaign automation
    console.log('\n📤 Triggering campaign email send...');
    
    const sendResponse = await fetch(`${BASE_URL}/api/campaigns/automation/send-emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
      }
    });

    const sendResult = await sendResponse.json();
    
    console.log('\n📊 Send Results:');
    console.log('=================');
    
    if (sendResult.success) {
      console.log('✅ Email sending completed!');
      console.log(`   Emails sent: ${sendResult.sent || 0}`);
      console.log(`   Emails failed: ${sendResult.failed || 0}`);
      console.log(`   Skipped (timezone): ${sendResult.skipped_timezone || 0}`);
      console.log(`   Skipped (sender limit): ${sendResult.skipped_sender_limit || 0}`);
      
      if (sendResult.sender_usage) {
        console.log('\n📧 Sender Usage:');
        Object.entries(sendResult.sender_usage).forEach(([email, count]) => {
          console.log(`   ${email}: ${count} email(s)`);
        });
      }

      if (sendResult.timezone_stats) {
        console.log('\n🌍 Timezone Statistics:');
        Object.entries(sendResult.timezone_stats).forEach(([tz, count]) => {
          console.log(`   ${tz}: ${count} email(s)`);
        });
      }

      if (sendResult.errors && sendResult.errors.length > 0) {
        console.log('\n⚠️ Errors encountered:');
        sendResult.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.contact}: ${error.error}`);
        });
      }
    } else {
      console.log('❌ Email sending failed:', sendResult.error || 'Unknown error');
    }

    // Check inbox messages for sent emails
    console.log('\n🔍 Checking inbox messages for sent emails...');
    
    const inboxResponse = await fetch(`${BASE_URL}/api/inbox/messages?campaign_id=${selectedCampaign.id}&direction=outbound&limit=5`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`
      }
    });

    if (inboxResponse.ok) {
      const inboxData = await inboxResponse.json();
      
      if (inboxData.messages && inboxData.messages.length > 0) {
        console.log(`\n✅ Found ${inboxData.messages.length} recent outbound email(s):`);
        
        inboxData.messages.forEach((msg, index) => {
          console.log(`\n   ${index + 1}. Email Details:`);
          console.log(`      From: ${msg.sender_email}`);
          console.log(`      To: ${msg.contact_email}`);
          console.log(`      Subject: ${msg.subject}`);
          console.log(`      Sent: ${new Date(msg.sent_at).toLocaleString()}`);
          console.log(`      Status: ${msg.status}`);
          console.log(`      Provider: ${msg.provider}`);
        });
      } else {
        console.log('No recent outbound emails found in inbox');
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Test inbound webhook
async function testInboundWebhook() {
  console.log('\n=================================================');
  console.log('📥 TESTING INBOUND EMAIL WEBHOOK');
  console.log('=================================================\n');

  const webhookUrl = `${BASE_URL}/api/webhooks/sendgrid`;
  
  console.log('🔍 Testing webhook endpoint availability...');
  
  try {
    // First check if webhook is accessible
    const checkResponse = await fetch(webhookUrl, {
      method: 'GET'
    });

    if (checkResponse.ok) {
      const info = await checkResponse.json();
      console.log('✅ Webhook endpoint is active!');
      console.log('📊 Endpoint info:', info);
      
      console.log('\n📝 Simulating inbound email...');
      
      // Simulate an inbound email
      const formData = new URLSearchParams();
      formData.append('from', 'test@example.com');
      formData.append('to', 'campaign@leadsup.io');
      formData.append('subject', 'Re: Test Campaign Email');
      formData.append('text', 'This is a simulated reply to test the webhook.');
      formData.append('html', '<p>This is a simulated reply to test the webhook.</p>');
      formData.append('envelope', JSON.stringify({
        from: 'test@example.com',
        to: ['campaign@leadsup.io']
      }));
      formData.append('spam_score', '0.1');
      formData.append('attachments', '0');
      formData.append('charsets', '{"to":"UTF-8","subject":"UTF-8","from":"UTF-8","text":"UTF-8"}');

      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      const result = await webhookResponse.json();
      
      if (result.success) {
        console.log('✅ Webhook processed successfully!');
        if (result.messageId) {
          console.log('   Message ID:', result.messageId);
          console.log('   Conversation ID:', result.conversationId);
        }
      } else {
        console.log('⚠️ Webhook processed but returned:', result.message || result.error);
      }
    } else {
      console.log('❌ Webhook endpoint not accessible');
    }
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
  }
}

// Main function
async function main() {
  console.log('🚀 CAMPAIGN EMAIL TESTING SUITE');
  console.log('===================================');
  
  // Test outbound
  await testCampaignEmail();
  
  // Wait a bit
  console.log('\n⏳ Waiting 3 seconds before testing inbound...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test inbound
  await testInboundWebhook();
  
  console.log('\n=================================================');
  console.log('✅ TESTING COMPLETE');
  console.log('=================================================');
  console.log('\n📝 Summary:');
  console.log('1. Check your email inbox for any sent emails');
  console.log('2. Try replying to a campaign email to test real inbound processing');
  console.log('3. Monitor the application logs for webhook activity');
  console.log('4. Check the inbox UI to see conversation threads');
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});