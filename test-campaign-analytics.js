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
  console.log(`✅ Event sent: ${events[0].event} - Status: ${response.status}`);
  return response.status === 200;
}

// Simulate a realistic campaign with multiple emails
async function createCampaignAnalyticsData() {
  console.log('🚀 Creating realistic campaign analytics data...\n');
  
  const campaignId = 'demo-campaign-123';
  const userId = 'demo-user-456';
  
  // Simulate 100 emails sent for this campaign
  const baseTimestamp = Math.floor(Date.now() / 1000) - (24 * 60 * 60); // 24 hours ago
  
  console.log('📤 Simulating 100 emails sent...');
  
  // Send 100 "processed" events (emails sent)
  for (let i = 0; i < 20; i++) {
    const batch = [];
    for (let j = 0; j < 5; j++) {
      const emailNum = i * 5 + j + 1;
      batch.push({
        email: `contact${emailNum}@example.com`,
        category: [`campaign_${campaignId}`, `user_${userId}`],
        sg_message_id: `campaign-msg-${campaignId}-${emailNum}`,
        sg_event_id: `processed-${campaignId}-${emailNum}-${Date.now()}`,
        event: "processed",
        timestamp: baseTimestamp + (i * 60), // Spread over time
        "smtp-id": `<campaign-smtp-${emailNum}@sendgrid.net>`
      });
    }
    
    await sendWebhookEvent(batch);
    if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }
  
  console.log('📬 Simulating 95 emails delivered (95% delivery rate)...');
  
  // 95 delivered (95% delivery rate)
  for (let i = 1; i <= 95; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `campaign-msg-${campaignId}-${i}`,
      sg_event_id: `delivered-${campaignId}-${i}-${Date.now()}`,
      event: "delivered",
      timestamp: baseTimestamp + (i * 60) + 300 // 5 minutes after sent
    }]);
    
    if (i % 10 === 0) await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('👀 Simulating 38 emails opened (40% open rate)...');
  
  // 38 opens (40% open rate of delivered)
  for (let i = 1; i <= 38; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `campaign-msg-${campaignId}-${i}`,
      sg_event_id: `open-${campaignId}-${i}-${Date.now()}`,
      event: "open",
      timestamp: baseTimestamp + (i * 60) + 1800 // 30 minutes after sent
    }]);
    
    if (i % 10 === 0) await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('🖱️ Simulating 9 emails clicked (10% click rate)...');
  
  // 9 clicks (10% click rate of delivered)
  for (let i = 1; i <= 9; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `campaign-msg-${campaignId}-${i}`,
      sg_event_id: `click-${campaignId}-${i}-${Date.now()}`,
      event: "click",
      timestamp: baseTimestamp + (i * 60) + 3600, // 1 hour after sent
      url: "https://example.com/demo-link"
    }]);
    
    if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('📉 Simulating 5 bounces and 3 unsubscribes...');
  
  // 5 bounces
  for (let i = 96; i <= 100; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `campaign-msg-${campaignId}-${i}`,
      sg_event_id: `bounce-${campaignId}-${i}-${Date.now()}`,
      event: "bounce",
      timestamp: baseTimestamp + (i * 60) + 600, // 10 minutes after sent
      reason: "Mailbox does not exist"
    }]);
  }
  
  // 3 unsubscribes 
  for (let i = 1; i <= 3; i++) {
    await sendWebhookEvent([{
      email: `contact${i + 20}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `campaign-msg-${campaignId}-${i + 20}`,
      sg_event_id: `unsubscribe-${campaignId}-${i + 20}-${Date.now()}`,
      event: "unsubscribe",
      timestamp: baseTimestamp + ((i + 20) * 60) + 7200 // 2 hours after sent
    }]);
  }
  
  console.log('\n✅ Campaign analytics data created successfully!');
  console.log('\n📊 Expected metrics for campaign:', campaignId);
  console.log('   📤 Emails Sent: 100');
  console.log('   📬 Delivery Rate: 95%');
  console.log('   👀 Open Rate: ~40%');
  console.log('   🖱️ Click Rate: ~10%');
  console.log('   📉 Bounce Rate: 5%');
  console.log('   ❌ Unsubscribe Rate: ~3%');
  
  console.log('\n🔍 You can now test the analytics in your frontend by:');
  console.log('   1. Creating a campaign with ID:', campaignId);
  console.log('   2. Using user ID:', userId);
  console.log('   3. The metrics should show the above numbers');
  
  return { campaignId, userId };
}

createCampaignAnalyticsData().catch(console.error);