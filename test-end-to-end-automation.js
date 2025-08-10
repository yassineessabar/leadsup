#!/usr/bin/env node

/**
 * End-to-End Automation Test for LeadsUp Email Campaign
 * Tests the complete flow from webhook trigger to email tracking
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  // Your LeadsUp API
  LEADSUP_API_BASE: 'http://localhost:3000',
  LEADSUP_AUTH: Buffer.from('admin:Integral23..').toString('base64'),
  
  // Your n8n webhook URL (replace with your actual n8n webhook URL)
  N8N_WEBHOOK_URL: 'http://localhost:5678/webhook/leadsup-webhook',
  
  // Test campaign ID from your data
  CAMPAIGN_ID: '8008aa2a-32e8-41e8-a819-12b6900349eb'
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testApiEndpoint() {
  console.log('🔍 Step 1: Testing API endpoint directly...');
  
  try {
    const url = new URL(`${CONFIG.LEADSUP_API_BASE}/api/campaigns/automation/process-pending`);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${CONFIG.LEADSUP_AUTH}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options, { campaign_id: CONFIG.CAMPAIGN_ID });
    
    console.log(`📊 API Response Status: ${response.status}`);
    console.log('📧 Email Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      const emailCount = response.data.data?.[0]?.contacts?.length || 0;
      console.log(`✅ API Test SUCCESS: Found ${emailCount} emails to send`);
      return true;
    } else {
      console.log('❌ API Test FAILED:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ API Test ERROR:', error.message);
    return false;
  }
}

async function testN8nWebhook() {
  console.log('🚀 Step 2: Testing n8n webhook...');
  
  try {
    const url = new URL(CONFIG.N8N_WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options, { 
      campaign_id: CONFIG.CAMPAIGN_ID,
      test: true,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📊 n8n Response Status: ${response.status}`);
    console.log('🔄 n8n Response:', response.data);
    
    if (response.status === 200) {
      console.log('✅ n8n Webhook Test SUCCESS');
      return true;
    } else {
      console.log('❌ n8n Webhook Test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ n8n Webhook ERROR:', error.message);
    console.log('💡 Make sure n8n is running and webhook URL is correct');
    return false;
  }
}

async function checkTrackingRecords() {
  console.log('📊 Step 3: Checking tracking records...');
  
  try {
    // First check if we can reach the tracking endpoint
    const url = new URL(`${CONFIG.LEADSUP_API_BASE}/api/campaigns/tracking/sent`);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${CONFIG.LEADSUP_AUTH}`,
        'Content-Type': 'application/json'
      }
    };

    // Test with dummy data to verify endpoint is working
    const testData = {
      campaign_id: CONFIG.CAMPAIGN_ID,
      contact_id: '71ef17da-2ad8-44c2-a9b7-76f97ae12619',
      sequence_id: '98b4a5cf-a51d-4e47-8ebf-de14589163e2',
      status: 'test',
      sent_at: new Date().toISOString(),
      sender_type: 'test'
    };

    const response = await makeRequest(options, testData);
    
    console.log(`📊 Tracking Endpoint Status: ${response.status}`);
    console.log('📝 Tracking Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Tracking Endpoint Test SUCCESS');
      return true;
    } else {
      console.log('❌ Tracking Endpoint Test FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ Tracking Check ERROR:', error.message);
    return false;
  }
}

async function runFullTest() {
  console.log('🏁 Starting End-to-End Automation Test');
  console.log('=' .repeat(50));
  
  const results = {
    apiTest: false,
    webhookTest: false,
    trackingTest: false
  };

  // Step 1: Test API endpoint
  results.apiTest = await testApiEndpoint();
  console.log('');

  // Step 2: Test n8n webhook (if API works)
  if (results.apiTest) {
    results.webhookTest = await testN8nWebhook();
  } else {
    console.log('⏭️  Skipping n8n test due to API failure');
  }
  console.log('');

  // Step 3: Test tracking endpoint
  results.trackingTest = await checkTrackingRecords();
  console.log('');

  // Summary
  console.log('📋 Test Summary');
  console.log('=' .repeat(30));
  console.log(`API Endpoint: ${results.apiTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`n8n Webhook: ${results.webhookTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Tracking: ${results.trackingTest ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('');
    console.log('🎉 ALL TESTS PASSED! Your automation is ready!');
    console.log('');
    console.log('📝 To run the full automation:');
    console.log(`   curl -X POST ${CONFIG.N8N_WEBHOOK_URL} \\`);
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"campaign_id": "${CONFIG.CAMPAIGN_ID}"}'`);
  } else {
    console.log('');
    console.log('❌ Some tests failed. Check the logs above for details.');
  }
  
  return allPassed;
}

// Configuration check
function checkConfiguration() {
  console.log('⚙️  Configuration Check');
  console.log(`LeadsUp API: ${CONFIG.LEADSUP_API_BASE}`);
  console.log(`n8n Webhook: ${CONFIG.N8N_WEBHOOK_URL}`);
  console.log(`Campaign ID: ${CONFIG.CAMPAIGN_ID}`);
  console.log('');
  
  if (CONFIG.N8N_WEBHOOK_URL.includes('localhost:5678')) {
    console.log('⚠️  WARNING: Using default n8n URL. Update N8N_WEBHOOK_URL if different.');
    console.log('');
  }
}

// Main execution
if (require.main === module) {
  checkConfiguration();
  runFullTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Fatal Error:', error);
    process.exit(1);
  });
}

module.exports = { runFullTest, testApiEndpoint, testN8nWebhook, checkTrackingRecords };