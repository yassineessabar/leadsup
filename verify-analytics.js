const crypto = require('crypto');

// SendGrid webhook secret
const webhookSecret = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEIz1AgcV78CoiJ4gGbCC8J6JEUlen6W9EPxYfaOVxjRkg/7dKIyVGETT7aSnAjQhcmL7WUVsXRnD6/ISqxOKbZA==';

// Function to send webhook event
async function sendWebhookEvent(events) {
  const payloadString = JSON.stringify(events);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(timestamp + payloadString)
    .digest('base64');
  
  const formattedSignature = `t=${timestamp},v1=${expectedSignature}`;
  
  const response = await fetch('http://localhost:3001/api/sendgrid/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Twilio-Email-Event-Webhook-Signature': formattedSignature,
      'X-Twilio-Email-Event-Webhook-Timestamp': timestamp
    },
    body: payloadString
  });
  
  const result = await response.text();
  console.log(`✅ ${events[0].event}: Status ${response.status}`);
  return response.status === 200;
}

async function testCampaignMetrics() {
  console.log('🚀 Testing campaign analytics metrics...\n');
  
  const campaignId = 'test-campaign-' + Date.now();
  const userId = 'test-user-' + Date.now();
  
  console.log(`📋 Campaign ID: ${campaignId}`);
  console.log(`👤 User ID: ${userId}\n`);
  
  // Send 10 emails
  console.log('📤 Sending 10 emails...');
  for (let i = 1; i <= 10; i++) {
    await sendWebhookEvent([{
      email: `test${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `msg-${campaignId}-${i}`,
      sg_event_id: `processed-${campaignId}-${i}-${Date.now()}`,
      event: "processed",
      timestamp: Math.floor(Date.now() / 1000),
      "smtp-id": `<smtp-${i}@sendgrid.net>`
    }]);
  }
  
  // Deliver 9 emails (90% delivery rate)
  console.log('📬 Delivering 9 emails (90% delivery rate)...');
  for (let i = 1; i <= 9; i++) {
    await sendWebhookEvent([{
      email: `test${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `msg-${campaignId}-${i}`,
      sg_event_id: `delivered-${campaignId}-${i}-${Date.now()}`,
      event: "delivered",
      timestamp: Math.floor(Date.now() / 1000)
    }]);
  }
  
  // 4 opens (44% open rate of delivered)
  console.log('👀 Recording 4 opens (44% open rate)...');
  for (let i = 1; i <= 4; i++) {
    await sendWebhookEvent([{
      email: `test${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `msg-${campaignId}-${i}`,
      sg_event_id: `open-${campaignId}-${i}-${Date.now()}`,
      event: "open",
      timestamp: Math.floor(Date.now() / 1000)
    }]);
  }
  
  // 2 clicks (22% click rate of delivered)
  console.log('🖱️ Recording 2 clicks (22% click rate)...');
  for (let i = 1; i <= 2; i++) {
    await sendWebhookEvent([{
      email: `test${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `msg-${campaignId}-${i}`,
      sg_event_id: `click-${campaignId}-${i}-${Date.now()}`,
      event: "click",
      timestamp: Math.floor(Date.now() / 1000),
      url: "https://example.com/test-link"
    }]);
  }
  
  // 1 bounce (10% bounce rate)
  console.log('📉 Recording 1 bounce (10% bounce rate)...');
  await sendWebhookEvent([{
    email: `test10@example.com`,
    category: [`campaign_${campaignId}`, `user_${userId}`],
    sg_message_id: `msg-${campaignId}-10`,
    sg_event_id: `bounce-${campaignId}-10-${Date.now()}`,
    event: "bounce",
    timestamp: Math.floor(Date.now() / 1000),
    reason: "Mailbox does not exist"
  }]);
  
  console.log('\n✅ Test campaign metrics created!');
  console.log('\n📊 Expected Analytics Results:');
  console.log('   📤 Emails Sent: 10');
  console.log('   📬 Delivery Rate: 90% (9 delivered)');
  console.log('   👀 Open Rate: ~44% (4 opens / 9 delivered)');
  console.log('   🖱️ Click Rate: ~22% (2 clicks / 9 delivered)');
  console.log('   📉 Bounce Rate: 10% (1 bounce / 10 sent)');
  
  console.log('\n🎯 Campaign Details for Testing:');
  console.log(`   Campaign ID: ${campaignId}`);
  console.log(`   User ID: ${userId}`);
  console.log('\n💡 These metrics should now appear in your campaign analytics dashboard!');
  
  return { campaignId, userId };
}

testCampaignMetrics().catch(console.error);