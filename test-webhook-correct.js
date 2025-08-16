const crypto = require('crypto');

// Test payload that mimics SendGrid webhook format
const testPayload = [{
  email: "test@example.com",
  timestamp: Math.floor(Date.now() / 1000),
  "smtp-id": "<test-message-id@sendgrid.net>",
  event: "delivered",
  category: ["campaign_test-campaign-123", "user_test-user-456"],
  sg_event_id: "test-event-" + Date.now(),
  sg_message_id: "test-msg-" + Date.now(),
  useragent: "Mozilla/5.0",
  ip: "127.0.0.1"
}];

const payloadString = JSON.stringify(testPayload);
const timestamp = Math.floor(Date.now() / 1000).toString();

// SendGrid webhook secret from .env.local (using HMAC, not ECDSA)
const webhookSecret = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEIz1AgcV78CoiJ4gGbCC8J6JEUlen6W9EPxYfaOVxjRkg/7dKIyVGETT7aSnAjQhcmL7WUVsXRnD6/ISqxOKbZA==';

// Create HMAC signature (the way the webhook expects it)
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(timestamp + payloadString)
  .digest('base64');

// Format signature as SendGrid expects: t=timestamp,v1=signature
const formattedSignature = `t=${timestamp},v1=${expectedSignature}`;

console.log('Testing SendGrid webhook with correct HMAC signature...');
console.log('Payload:', JSON.stringify(testPayload, null, 2));
console.log('Timestamp:', timestamp);
console.log('Signature:', formattedSignature);

// Test the webhook endpoint
fetch('http://localhost:3001/api/sendgrid/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Twilio-Email-Event-Webhook-Signature': formattedSignature,
    'X-Twilio-Email-Event-Webhook-Timestamp': timestamp
  },
  body: payloadString
})
.then(response => {
  console.log('Response status:', response.status);
  return response.text();
})
.then(text => {
  console.log('Response body:', text);
  
  if (text.includes('"success":true')) {
    console.log('🎉 Webhook test SUCCESSFUL!');
  } else {
    console.log('❌ Webhook test failed');
  }
})
.catch(error => {
  console.error('Error:', error);
});