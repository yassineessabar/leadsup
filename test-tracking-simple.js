#!/usr/bin/env node

const https = require('https');

// Test with various parameter formats to see which one works
const testCases = [
  {
    name: 'camelCase format',
    payload: {
      campaignId: 'test-campaign-123',
      contactId: 'test-contact-456', 
      sequenceId: 'test-sequence-789',
      status: 'sent',
      sentAt: new Date().toISOString(),
      messageId: 'test-message-123',
      senderType: 'gmail'
    }
  },
  {
    name: 'snake_case format',
    payload: {
      campaign_id: 'test-campaign-123',
      contact_id: 'test-contact-456',
      sequence_id: 'test-sequence-789', 
      status: 'sent',
      sent_at: new Date().toISOString(),
      message_id: 'test-message-123',
      sender_type: 'gmail'
    }
  },
  {
    name: 'prospect_id format (alternative)',
    payload: {
      campaign_id: 'test-campaign-123',
      prospect_id: 'test-contact-456',
      sequence_id: 'test-sequence-789',
      status: 'sent'
    }
  }
];

function testEndpoint(testCase, credentials = 'admin:password123') {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(credentials).toString('base64');
    const payload = JSON.stringify(testCase.payload);
    
    const url = new URL('https://app.leadsup.io/api/campaigns/tracking/sent');
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📤 Payload:`, testCase.payload);
    console.log(`🔐 Auth: ${credentials.split(':')[0]}:***`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`📥 Status: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          console.log(`📥 Response:`, response);
          
          if (res.statusCode === 200 && response.success) {
            console.log('✅ SUCCESS');
          } else if (res.statusCode === 401) {
            console.log('🔐 AUTH FAILED');
          } else if (res.statusCode === 400) {
            console.log('❌ BAD REQUEST:', response.error);
            if (response.received) {
              console.log('   Received keys:', response.received);
              console.log('   Expected keys:', response.expected);
            }
          } else {
            console.log(`⚠️  Status ${res.statusCode}:`, response.error || response.message);
          }
        } catch (e) {
          console.log(`❌ Invalid JSON response:`, data);
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request failed:`, error.message);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('🚀 Testing tracking endpoint with different parameter formats...');
  
  // Try different credential combinations
  const credentialOptions = [
    'admin:password123',
    'admin:admin', 
    'leadsup:leadsup123',
    'n8n:n8n123'
  ];
  
  for (const creds of credentialOptions) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔐 Trying credentials: ${creds.split(':')[0]}:***`);
    console.log(`${'='.repeat(50)}`);
    
    for (const testCase of testCases) {
      try {
        await testEndpoint(testCase, creds);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between requests
      } catch (error) {
        console.log(`❌ Test failed:`, error.message);
      }
    }
    
    // If we get past auth with any credentials, break
    break;
  }
}

main().catch(console.error);