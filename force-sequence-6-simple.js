#!/usr/bin/env node
/**
 * Simple script to force sequence 6 by making direct API calls to your localhost
 * This simulates running the SQL update via your existing API
 */

const http = require('http');

const API_BASE = 'http://localhost:3001';
const AUTH = Buffer.from('admin:password').toString('base64');

function makeAPICall(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function forceSequence6() {
  console.log('🔧 Forcing sequence 6 for essabar.yassine@gmail.com...\n');

  try {
    // First check current status
    console.log('1️⃣ Checking current status...');
    const checkResponse = await makeAPICall('/api/campaigns/automation/process-pending');
    
    if (checkResponse.status === 200 && checkResponse.data.success) {
      const campaigns = checkResponse.data.data || [];
      console.log(`✅ Found ${campaigns.length} campaigns ready`);
      
      if (campaigns.length > 0) {
        const contacts = campaigns[0].contacts || [];
        console.log(`📧 ${contacts.length} contacts ready for processing`);
        
        if (contacts.length > 0) {
          console.log('✅ Sequence 6 is already available!');
          console.log('🚀 Try running the send-emails API now.');
          return;
        }
      }
      
      console.log('⚠️ No contacts ready - need to update sequence 5 timestamp\n');
    }

    // Manual timestamp update via direct database query simulation
    console.log('2️⃣ The quickest way is to run this SQL query:');
    console.log('');
    console.log('UPDATE prospect_sequence_progress');
    console.log('SET sent_at = NOW() - INTERVAL \'14 days\',');
    console.log('    updated_at = NOW()');
    console.log('WHERE prospect_id = (');
    console.log('  SELECT id FROM prospects WHERE email_address = \'essabar.yassine@gmail.com\'');
    console.log(')');
    console.log('AND sequence_id IN (');
    console.log('  SELECT id FROM campaign_sequences');
    console.log('  WHERE campaign_id = \'6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4\'');
    console.log('  AND step_number = 5');
    console.log(')');
    console.log('AND status = \'sent\';');
    console.log('');

    console.log('3️⃣ Or use this quick command:');
    console.log('');
    console.log('# Update sequence 5 to 14 days ago');
    console.log('curl -X POST YOUR_SUPABASE_REST_API_ENDPOINT');
    console.log('');

    console.log('4️⃣ Alternative: Create sequence 6 with 0-day timing');
    console.log('If sequence 6 has timing_days = 0, it will be available immediately');
    console.log('after sequence 5, regardless of when sequence 5 was sent.');
    console.log('');

    console.log('5️⃣ After updating, test again:');
    console.log('curl -u \'admin:password\' -X POST http://localhost:3001/api/campaigns/automation/send-emails');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

forceSequence6().catch(console.error);