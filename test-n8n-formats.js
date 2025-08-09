#!/usr/bin/env node

const https = require('https');

// Test various possible n8n request formats
const testFormats = [
  {
    name: 'Standard n8n format',
    payload: {
      campaign_id: 'camp-123',
      contact_id: 'contact-456',
      sequence_id: 'seq-789',
      status: 'sent'
    }
  },
  {
    name: 'CamelCase format',
    payload: {
      campaignId: 'camp-123',
      contactId: 'contact-456',
      sequenceId: 'seq-789',
      status: 'sent'
    }
  },
  {
    name: 'N8N JSON format with nested data',
    payload: {
      data: {
        campaign_id: 'camp-123',
        contact_id: 'contact-456',
        sequence_id: 'seq-789'
      },
      status: 'sent'
    }
  },
  {
    name: 'N8N with prospect_id',
    payload: {
      campaign_id: 'camp-123',
      prospect_id: 'contact-456',
      sequence_id: 'seq-789',
      status: 'sent'
    }
  },
  {
    name: 'Empty request',
    payload: {}
  },
  {
    name: 'Only partial data',
    payload: {
      campaign_id: 'camp-123'
    }
  },
  {
    name: 'Mixed case format',
    payload: {
      CampaignId: 'camp-123',
      contact_id: 'contact-456',
      sequenceID: 'seq-789',
      Status: 'sent'
    }
  },
  {
    name: 'Array format (might be sent by n8n)',
    payload: [{
      campaign_id: 'camp-123',
      contact_id: 'contact-456',
      sequence_id: 'seq-789'
    }]
  }
];

function testRequest(testCase, credentials = 'admin:password123') {
  return new Promise((resolve) => {
    const auth = Buffer.from(credentials).toString('base64');
    const payload = JSON.stringify(testCase.payload);
    
    const options = {
      hostname: 'app.leadsup.io',
      path: '/api/campaigns/tracking/sent',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Testing: ${testCase.name}`);
    console.log(`📤 Payload:`, testCase.payload);
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`📥 Status: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          console.log(`📥 Response:`, JSON.stringify(response, null, 2));
          
          if (response.debug) {
            console.log(`🔍 Debug info:`, response.debug);
          }
          
          if (res.statusCode === 200 && response.success) {
            console.log('✅ SUCCESS - Request accepted');
          } else if (res.statusCode === 401) {
            console.log('🔐 AUTH FAILED - Need correct credentials');
          } else if (res.statusCode === 400) {
            console.log('❌ BAD REQUEST');
            if (response.debug) {
              console.log('   Missing:', response.debug.missingFields);
              console.log('   Received keys:', response.debug.received);
              console.log('   Body content:', response.debug.bodyContent);
            }
          } else {
            console.log(`⚠️  Unexpected status ${res.statusCode}`);
          }
        } catch (e) {
          console.log(`❌ Invalid JSON:`, data.substring(0, 200));
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request failed:`, error.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('🚀 Testing various n8n request formats...');
  console.log('This will help us understand what data n8n is actually sending');
  
  for (const testCase of testFormats) {
    try {
      await testRequest(testCase);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Wait between requests
    } catch (error) {
      console.log(`❌ Test failed:`, error.message);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ All tests completed!');
  console.log('Check the server logs to see what data was received and parsed.');
}

main().catch(console.error);