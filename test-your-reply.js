#!/usr/bin/env node

const https = require('https');
const http = require('http');
const querystring = require('querystring');

// Simulate your actual reply to info@leadsup.io
const postData = querystring.stringify({
  'from': 'essabar.yassine@gmail.com',
  'to': 'info@leadsup.io',
  'subject': 'Re: Second Test Email - Please Reply to Test Inbound! 🧪',
  'text': 'Hi! I received your second test email and I\'m replying as requested. This should test the complete inbound email processing workflow. The system looks great!',
  'html': '<p>Hi! I received your second test email and I\'m replying as requested.</p><p>This should test the complete inbound email processing workflow. The system looks great!</p>',
  'envelope': '{"from": "essabar.yassine@gmail.com", "to": ["info@leadsup.io"]}',
  'headers': '{"Message-Id": "<your-reply-' + Date.now() + '@gmail.com>", "In-Reply-To": "<5cJO_WWTTma65SGYlPB6sg@sendgrid.net>"}',
  'charsets': '{"from": "UTF-8", "to": "UTF-8", "subject": "UTF-8", "text": "UTF-8"}',
  'spam_score': '0.0',
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

console.log('🧪 Testing your reply to info@leadsup.io...');
console.log('📧 Simulating reply from: essabar.yassine@gmail.com');
console.log('📧 To: info@leadsup.io');
console.log('📧 Original Message ID: 5cJO_WWTTma65SGYlPB6sg');

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
        console.log('🎉 Your reply was processed successfully!');
        if (response.messageId) {
          console.log(`📨 New Message ID: ${response.messageId}`);
        }
        if (response.conversationId) {
          console.log(`🧵 Conversation ID: ${response.conversationId}`);
        }
        
        console.log('\n🔍 Now checking if it appears in the inbox...');
        
        // Test inbox API
        setTimeout(() => {
          const curl = require('child_process').spawn('curl', [
            '-s',
            'http://localhost:3000/api/inbox?folder=inbox&view=threads&limit=5',
            '-H', 'Cookie: session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkMTU1ZDRjMi0yZjA2LTQ1YjctOWM5MC05MDVlMzY0OGU4ZGYiLCJpYXQiOjE3MzQ5MTk0NjYsImV4cCI6MTczNTAwNTg2Nn0.fLLqEYy2xo7bPGjh0Wh8Z-6e7NqXCXiGBqwuTZn6hGY'
          ]);
          
          let inboxData = '';
          curl.stdout.on('data', (chunk) => inboxData += chunk);
          curl.on('close', () => {
            try {
              const inbox = JSON.parse(inboxData);
              if (inbox.emails && inbox.emails.length > 0) {
                console.log(`📥 Found ${inbox.emails.length} conversations in inbox:`);
                inbox.emails.forEach((email, i) => {
                  console.log(`  ${i+1}. From: ${email.sender} | Subject: ${email.subject}`);
                });
              } else {
                console.log('📭 No conversations found in inbox (may take a moment to appear)');
              }
            } catch (e) {
              console.log('📊 Inbox check completed (response format changed)');
            }
          });
        }, 1000);
        
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