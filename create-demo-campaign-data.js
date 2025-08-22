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
  
  return response.status === 200;
}

async function createDemoCampaignData() {
  console.log('🚫 DISABLED: This script creates fake analytics data.')
  console.log('📊 Use real SendGrid webhook events for accurate analytics.')
  console.log('🧹 Run "node clear-fake-analytics.js" to remove fake data.')
  console.log('')
  console.log('⚠️ If you need to re-enable this script for testing, edit this file.')
  return // Exit early - script is disabled
  
  // Use a realistic campaign ID that could exist in your database
  const campaignId = 'ac2fa28f-5360-4fa2-80c6-0c3cc217785b'; // The one from your logs
  const userId = 'demo-user-' + Date.now();
  
  console.log(`📋 Campaign ID: ${campaignId}`);
  console.log(`👤 User ID: ${userId}\n`);
  
  console.log('📤 Creating 50 email campaign...');
  
  // 50 emails sent (processed)
  for (let i = 1; i <= 50; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `demo-msg-${campaignId}-${i}`,
      sg_event_id: `processed-${campaignId}-${i}-${Date.now()}`,
      event: "processed",
      timestamp: Math.floor(Date.now() / 1000) - (i * 60), // Spread over time
      "smtp-id": `<demo-smtp-${i}@sendgrid.net>`
    }]);
    
    if (i % 10 === 0) {
      console.log(`   ✅ Sent ${i} emails`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('📬 Processing deliveries (94% delivery rate)...');
  
  // 47 delivered (94% delivery rate)
  for (let i = 1; i <= 47; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `demo-msg-${campaignId}-${i}`,
      sg_event_id: `delivered-${campaignId}-${i}-${Date.now()}`,
      event: "delivered",
      timestamp: Math.floor(Date.now() / 1000) - (i * 30)
    }]);
    
    if (i % 10 === 0) {
      console.log(`   ✅ Delivered ${i} emails`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  console.log('👀 Processing opens (32% open rate)...');
  
  // 15 opens (32% open rate of delivered)
  for (let i = 1; i <= 15; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `demo-msg-${campaignId}-${i}`,
      sg_event_id: `open-${campaignId}-${i}-${Date.now()}`,
      event: "open",
      timestamp: Math.floor(Date.now() / 1000) - (i * 20)
    }]);
    
    if (i % 5 === 0) {
      console.log(`   👀 ${i} opens recorded`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  console.log('🖱️ Processing clicks (6.4% click rate)...');
  
  // 3 clicks (6.4% click rate of delivered)
  for (let i = 1; i <= 3; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `demo-msg-${campaignId}-${i}`,
      sg_event_id: `click-${campaignId}-${i}-${Date.now()}`,
      event: "click",
      timestamp: Math.floor(Date.now() / 1000) - (i * 10),
      url: "https://example.com/demo-link"
    }]);
    
    console.log(`   🖱️ Click ${i} recorded`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('📉 Processing bounces and issues...');
  
  // 3 bounces (6% bounce rate)
  for (let i = 48; i <= 50; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `demo-msg-${campaignId}-${i}`,
      sg_event_id: `bounce-${campaignId}-${i}-${Date.now()}`,
      event: "bounce",
      timestamp: Math.floor(Date.now() / 1000) - (i * 15),
      reason: "Mailbox does not exist"
    }]);
  }
  
  // 1 unsubscribe
  await sendWebhookEvent([{
    email: `contact16@example.com`,
    category: [`campaign_${campaignId}`, `user_${userId}`],
    sg_message_id: `demo-msg-${campaignId}-16`,
    sg_event_id: `unsubscribe-${campaignId}-16-${Date.now()}`,
    event: "unsubscribe",
    timestamp: Math.floor(Date.now() / 1000) - 300
  }]);
  
  console.log('\n✅ Demo campaign analytics data created successfully!');
  console.log('\n📊 Expected Analytics Results:');
  console.log('   📤 Emails Sent: 50');
  console.log('   📬 Delivery Rate: 94% (47 delivered)');
  console.log('   👀 Open Rate: ~32% (15 opens / 47 delivered)');
  console.log('   🖱️ Click Rate: ~6.4% (3 clicks / 47 delivered)');
  console.log('   📉 Bounce Rate: 6% (3 bounces / 50 sent)');
  
  console.log('\n🎯 Campaign Details:');
  console.log(`   Campaign ID: ${campaignId}`);
  console.log(`   User ID: ${userId}`);
  
  console.log('\n💡 Go to your campaign analytics page to see these metrics!');
  console.log('   The metrics should now show real SendGrid data in your dashboard.');
  
  return { campaignId, userId };
}

createDemoCampaignData().catch(console.error);