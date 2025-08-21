#!/usr/bin/env node

const https = require('https');
const http = require('http');
const querystring = require('querystring');

// Simulate your inbound reply
const postData = querystring.stringify({
  'from': 'essabar.yassine@gmail.com',
  'to': 'contact@leadsup.io',
  'subject': 'Re: End-to-End Email Test - Your Reply Test',
  'text': 'Hi! I received your test email and replied as requested. This is testing the inbound functionality. Everything looks good!',
  'html': '<p>Hi! I received your test email and replied as requested.</p><p>This is testing the inbound functionality. Everything looks good!</p>',
  'envelope': '{"from": "essabar.yassine@gmail.com", "to": ["contact@leadsup.io"]}',
  'headers': '{"Message-Id": "<test-reply-123@gmail.com>"}',
  'charsets': '{"from": "UTF-8", "to": "UTF-8", "subject": "UTF-8", "text": "UTF-8"}',
  'spam_score': '0.1',
  'attachments': '0'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/sendgrid',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing inbound email webhook...');
console.log('📧 Simulating reply from: essabar.yassine@gmail.com');
console.log('📧 To: contact@leadsup.io');

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ Response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('🎉 Inbound email processed successfully!');
        if (response.messageId) {
          console.log(`📨 Message ID: ${response.messageId}`);
        }
        if (response.conversationId) {
          console.log(`🧵 Conversation ID: ${response.conversationId}`);
        }
      } else {
        console.log('❌ Processing failed:', response.error);
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse response as JSON');
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(postData);
req.end();