const crypto = require('crypto');

// Test payload that mimics SendGrid webhook format
const testPayload = [{
  email: "test@example.com",
  timestamp: Math.floor(Date.now() / 1000),
  "smtp-id": "<test-message-id@sendgrid.net>",
  event: "delivered",
  category: ["test-campaign-123", "user-456"],
  sg_event_id: "test-event-" + Date.now(),
  sg_message_id: "test-msg-" + Date.now(),
  useragent: "Mozilla/5.0",
  ip: "127.0.0.1"
}];

const payloadString = JSON.stringify(testPayload);
const timestamp = Math.floor(Date.now() / 1000).toString();

// SendGrid verification key from .env.local
const publicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEIz1AgcV78CoiJ4gGbCC8J6JEUlen6W9EPxYfaOVxjRkg/7dKIyVGETT7aSnAjQhcmL7WUVsXRnD6/ISqxOKbZA==
-----END PUBLIC KEY-----`;

// Create ECDSA signature
const signedPayload = timestamp + payloadString;
const signature = crypto.sign('sha256', Buffer.from(signedPayload), {
  key: publicKey,
  format: 'pem'
});

const base64Signature = signature.toString('base64');

console.log('Testing SendGrid webhook...');
console.log('Payload:', JSON.stringify(testPayload, null, 2));
console.log('Timestamp:', timestamp);
console.log('Signature:', base64Signature);

// Test the webhook endpoint
fetch('http://localhost:3001/api/sendgrid/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Twilio-Email-Event-Webhook-Signature': base64Signature,
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
})
.catch(error => {
  console.error('Error:', error);
});