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
  console.log(`Events: ${events.length}, Status: ${response.status}, Response: ${result}`);
  return response.status === 200;
}

// Test a complete email journey with analytics
async function testAnalyticsFlow() {
  console.log('🚀 Testing complete SendGrid analytics flow...\n');
  
  const baseEvent = {
    email: "analytics-test@example.com",
    category: ["campaign_analytics-test-campaign", "user_analytics-test-user"],
    sg_message_id: "analytics-msg-" + Date.now(),
    useragent: "Mozilla/5.0 Test",
    ip: "127.0.0.1"
  };
  
  // 1. Email sent (processed)
  console.log('📤 Step 1: Email processed...');
  await sendWebhookEvent([{
    ...baseEvent,
    sg_event_id: "analytics-processed-" + Date.now(),
    event: "processed",
    timestamp: Math.floor(Date.now() / 1000),
    "smtp-id": "<analytics-test@sendgrid.net>"
  }]);
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  // 2. Email delivered
  console.log('📬 Step 2: Email delivered...');
  await sendWebhookEvent([{
    ...baseEvent,
    sg_event_id: "analytics-delivered-" + Date.now(),
    event: "delivered",
    timestamp: Math.floor(Date.now() / 1000),
    "smtp-id": "<analytics-test@sendgrid.net>"
  }]);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 3. Email opened
  console.log('👀 Step 3: Email opened...');
  await sendWebhookEvent([{
    ...baseEvent,
    sg_event_id: "analytics-open-" + Date.now(),
    event: "open",
    timestamp: Math.floor(Date.now() / 1000)
  }]);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 4. Email clicked
  console.log('🖱️ Step 4: Email clicked...');
  await sendWebhookEvent([{
    ...baseEvent,
    sg_event_id: "analytics-click-" + Date.now(),
    event: "click",
    timestamp: Math.floor(Date.now() / 1000),
    url: "https://example.com/test-link"
  }]);
  
  console.log('\n✅ Analytics flow test completed!');
  console.log('📊 Check your analytics endpoints to see the aggregated metrics');
  
  // Test analytics API
  console.log('\n🔍 Testing analytics API...');
  
  try {
    const analyticsResponse = await fetch('http://localhost:3001/api/analytics/user?userId=analytics-test-user');
    const analyticsData = await analyticsResponse.text();
    console.log('User Analytics API Response:', analyticsData);
    
    const campaignResponse = await fetch('http://localhost:3001/api/analytics/campaign?campaignId=analytics-test-campaign&userId=analytics-test-user');
    const campaignData = await campaignResponse.text();
    console.log('Campaign Analytics API Response:', campaignData);
  } catch (error) {
    console.log('Analytics API test:', error.message);
  }
}

testAnalyticsFlow().catch(console.error);