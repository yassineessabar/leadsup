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
  console.log(`✅ ${events[0].event}: ${response.status === 200 ? 'Success' : 'Failed'}`);
  return response.status === 200;
}

async function fixAnalyticsData() {
  console.log('🚫 DISABLED: This script injected fake analytics data.')
  console.log('📊 Use real SendGrid webhook events for accurate analytics.')
  console.log('🧹 Run "node clear-fake-analytics.js" to remove fake data.')
  console.log('')
  console.log('⚠️ If you need to re-enable this script for testing, edit this file.')
  return // Exit early - script is disabled
  
  const campaignId = 'ac2fa28f-5360-4fa2-80c6-0c3cc217785b';
  const userId = 'd155d4c2-2f06-45b7-9c90-905e3648e8df'; // From debug data
  
  console.log('👀 Adding 14 more opens (15 total)...');
  
  // Add 14 more opens (we already have 1)
  for (let i = 2; i <= 15; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `demo-msg-${campaignId}-${i}`,
      sg_event_id: `open-fix-${campaignId}-${i}-${Date.now()}`,
      event: "open",
      timestamp: Math.floor(Date.now() / 1000)
    }]);
    
    if (i % 5 === 0) {
      console.log(`   👀 ${i} opens total`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('🖱️ Adding 3 clicks...');
  
  // Add 3 clicks
  for (let i = 1; i <= 3; i++) {
    await sendWebhookEvent([{
      email: `contact${i}@example.com`,
      category: [`campaign_${campaignId}`, `user_${userId}`],
      sg_message_id: `demo-msg-${campaignId}-${i}`,
      sg_event_id: `click-fix-${campaignId}-${i}-${Date.now()}`,
      event: "click",
      timestamp: Math.floor(Date.now() / 1000),
      url: "https://example.com/demo-link"
    }]);
    
    console.log(`   🖱️ Click ${i} added`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n✅ Analytics data fixed!');
  console.log('\n📊 Expected Results Now:');
  console.log('   📤 Emails Sent: 50');
  console.log('   📬 Delivery Rate: 92% (46 delivered)');
  console.log('   👀 Open Rate: ~33% (15 opens / 46 delivered)');
  console.log('   🖱️ Click Rate: ~6.5% (3 clicks / 46 delivered)');
  
  console.log('\n🔄 Refresh your campaign analytics page to see the updated metrics!');
}

fixAnalyticsData().catch(console.error);