#!/usr/bin/env node
/**
 * Test the JavaScript email API endpoint instead of n8n
 * This calls our new /api/campaigns/automation/send-emails route
 */

const https = require('https');
const http = require('http');

const TEST_CONFIG = {
  // API endpoint - change to production URL when ready
  api_base: 'http://localhost:3001', // or 'https://app.leadsup.io'
  
  // Basic auth credentials (same as n8n)
  auth: {
    username: 'admin',
    password: 'password' // or process.env.N8N_API_PASSWORD
  }
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${TEST_CONFIG.auth.username}:${TEST_CONFIG.auth.password}`).toString('base64')}`,
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testProcessPending() {
  console.log('1️⃣ Testing process-pending API...\n');
  
  try {
    const response = await makeRequest(
      `${TEST_CONFIG.api_base}/api/campaigns/automation/process-pending`
    );

    console.log(`📊 Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      console.log(`✅ Found ${response.data.data?.length || 0} campaigns ready`);
      
      if (response.data.data && response.data.data.length > 0) {
        const campaign = response.data.data[0];
        console.log(`📧 Campaign: ${campaign.name}`);
        console.log(`👥 Contacts: ${campaign.contacts?.length || 0}`);
        console.log(`📮 Senders: ${campaign.senders?.length || 0}`);
        
        if (campaign.contacts && campaign.contacts.length > 0) {
          console.log('\n📋 Sample contacts:');
          campaign.contacts.slice(0, 3).forEach((contact, i) => {
            console.log(`  ${i + 1}. ${contact.email} ← ${contact.sender?.email} (Step ${contact.nextSequence?.step_number})`);
          });
        }
      }
    } else {
      console.log('❌ No campaigns ready or API error');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Error testing process-pending:', error);
    return null;
  }
}

async function testJSEmailSending() {
  console.log('\n2️⃣ Testing JavaScript email sending...\n');
  
  try {
    const response = await makeRequest(
      `${TEST_CONFIG.api_base}/api/campaigns/automation/send-emails`,
      { method: 'POST' }
    );

    console.log(`📊 Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      console.log(`✅ JavaScript email sending complete!`);
      console.log(`📧 Sent: ${response.data.sent || 0}`);
      console.log(`❌ Failed: ${response.data.failed || 0}`);
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.log('\n⚠️  Errors:');
        response.data.errors.forEach((error, i) => {
          console.log(`  ${i + 1}. ${error.contact} (${error.sender}): ${error.error}`);
        });
      }
      
      console.log(`\n⏰ Processed at: ${response.data.processedAt}`);
      
    } else {
      console.log('❌ Email sending failed or no emails to send');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing JS email sending:', error);
  }
}

async function compareBothApproaches() {
  console.log('3️⃣ Comparing n8n vs JavaScript approaches...\n');
  
  console.log('📋 Feature Comparison:');
  console.log('┌─────────────────────┬─────────────────┬──────────────────┐');
  console.log('│ Feature             │ n8n Workflow    │ JavaScript API   │');
  console.log('├─────────────────────┼─────────────────┼──────────────────┤');
  console.log('│ Client Setup        │ Manual OAuth    │ Self-service     │');
  console.log('│ Scalability         │ Limited nodes   │ Unlimited        │');
  console.log('│ Dependencies        │ n8n server      │ Node.js only     │');
  console.log('│ Error Handling      │ Workflow logic  │ Try/catch        │');
  console.log('│ Rate Limiting       │ Wait nodes      │ setTimeout       │');
  console.log('│ Monitoring          │ n8n dashboard   │ API logs         │');
  console.log('│ Auth Methods        │ OAuth only      │ OAuth + App Pass │');
  console.log('└─────────────────────┴─────────────────┴──────────────────┘');
  
  // Test n8n webhook for comparison
  try {
    console.log('\n🔄 Testing n8n webhook (for comparison)...');
    const n8nResponse = await makeRequest('https://yessabar.app.n8n.cloud/webhook-test/leadsup-webhook', {
      method: 'POST'
    });
    
    console.log(`n8n Status: ${n8nResponse.status}`);
    if (n8nResponse.status === 200) {
      console.log('✅ n8n workflow still works');
    } else {
      console.log('❌ n8n workflow issue');
    }
    
  } catch (error) {
    console.log('❌ n8n webhook unreachable');
  }
}

async function main() {
  console.log('🧪 Testing JavaScript Email System vs n8n\n');
  console.log('═'.repeat(50));
  
  const args = process.argv.slice(2);
  
  if (args.includes('--pending-only')) {
    await testProcessPending();
  } else if (args.includes('--send-only')) {
    await testJSEmailSending();
  } else if (args.includes('--compare')) {
    await compareBothApproaches();
  } else {
    // Run full test suite
    const pendingData = await testProcessPending();
    
    if (pendingData && pendingData.success && pendingData.data?.length > 0) {
      await testJSEmailSending();
    } else {
      console.log('\n⚠️  Skipping email sending test - no campaigns ready');
      console.log('💡 Make sure you have:');
      console.log('   • Active campaigns with prospects');
      console.log('   • Configured sequences');
      console.log('   • Active senders');
      console.log('   • Prospects due for next sequence step');
    }
    
    await compareBothApproaches();
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('🎯 Test complete!');
  
  console.log('\n📋 Next steps:');
  console.log('1. Set up Gmail App Passwords for senders');
  console.log('2. Update campaign_senders table with auth credentials');
  console.log('3. Test with real email sending');
  console.log('4. Consider migrating from n8n to JavaScript for client deployments');
}

main().catch(console.error);