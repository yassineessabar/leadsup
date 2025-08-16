// Simple webhook test without signature verification
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

console.log('Testing SendGrid webhook endpoint...');
console.log('Payload:', JSON.stringify(testPayload, null, 2));

// Test the webhook endpoint
fetch('http://localhost:3001/api/sendgrid/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Add fake signature headers to test the endpoint structure
    'X-Twilio-Email-Event-Webhook-Signature': 'test-signature',
    'X-Twilio-Email-Event-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString()
  },
  body: JSON.stringify(testPayload)
})
.then(response => {
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  return response.text();
})
.then(text => {
  console.log('Response body:', text);
})
.catch(error => {
  console.error('Error:', error);
});