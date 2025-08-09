#!/usr/bin/env node

const https = require('https');

// Configuration
const TRACKING_URL = 'https://app.leadsup.io/api/campaigns/tracking/sent';
const USERNAME = process.env.N8N_API_USERNAME || 'admin';
const PASSWORD = process.env.N8N_API_PASSWORD || 'your-password-here';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m'
};

console.log(`${colors.bright}${colors.blue}🧪 Testing Track Success Endpoint${colors.reset}\n`);

// Create Basic Auth header
const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

// Test payload similar to what n8n sends
const testPayload = {
  campaignId: 'test-campaign-123',
  contactId: 'test-contact-456',
  sequenceId: 'test-sequence-789',
  status: 'sent',
  sentAt: new Date().toISOString(),
  messageId: 'test-message-123',
  senderType: 'gmail'
};

// Function to test the tracking endpoint
function testTrackingEndpoint() {
  return new Promise((resolve, reject) => {
    const url = new URL(TRACKING_URL);
    const payload = JSON.stringify(testPayload);
    
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

    console.log(`${colors.yellow}📡 Calling tracking endpoint...${colors.reset}`);
    console.log(`   URL: ${TRACKING_URL}`);
    console.log(`   Method: POST`);
    console.log(`   Auth: ${USERNAME}:***`);
    console.log(`   Payload:`, testPayload);
    console.log();

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          console.log(`${colors.blue}📤 Response Status: ${res.statusCode}${colors.reset}`);
          console.log(`${colors.blue}📤 Response Headers:${colors.reset}`, res.headers);
          
          let response;
          try {
            response = JSON.parse(data);
            console.log(`${colors.blue}📤 Response Body:${colors.reset}`);
            console.log(JSON.stringify(response, null, 2));
          } catch (parseError) {
            console.log(`${colors.red}❌ Failed to parse JSON response:${colors.reset}`);
            console.log(`   Raw response: ${data}`);
            response = { rawResponse: data };
          }
          
          if (res.statusCode === 200) {
            console.log(`${colors.green}✅ Request successful!${colors.reset}`);
            if (response.success) {
              console.log(`${colors.green}✅ Tracking updated successfully${colors.reset}`);
            } else {
              console.log(`${colors.yellow}⚠️ API returned success=false: ${response.error}${colors.reset}`);
            }
          } else if (res.statusCode === 401) {
            console.log(`${colors.red}❌ Authentication failed!${colors.reset}`);
            console.log(`   Message: ${response.error || 'Unauthorized'}`);
          } else if (res.statusCode === 400) {
            console.log(`${colors.red}❌ Bad Request!${colors.reset}`);
            console.log(`   Message: ${response.error || 'Bad Request'}`);
          } else if (res.statusCode === 500) {
            console.log(`${colors.red}❌ Server Error!${colors.reset}`);
            console.log(`   Message: ${response.error || 'Internal Server Error'}`);
            if (response.details) {
              console.log(`   Details:`, response.details);
            }
          } else {
            console.log(`${colors.red}❌ Unexpected response:${colors.reset}`);
            console.log(`   Status: ${res.statusCode}`);
          }
          
          resolve(response);
        } catch (error) {
          console.log(`${colors.red}❌ Failed to process response:${colors.reset}`);
          console.log(`   ${error.message}`);
          console.log(`   Raw response: ${data}`);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`${colors.red}❌ Request failed:${colors.reset}`);
      console.log(`   ${error.message}`);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// Test failed status as well
function testFailedStatus() {
  return new Promise((resolve, reject) => {
    const failedPayload = {
      ...testPayload,
      status: 'failed',
      errorMessage: 'Test error: Email sending failed'
    };
    
    const url = new URL(TRACKING_URL);
    const payload = JSON.stringify(failedPayload);
    
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

    console.log(`${colors.yellow}📡 Testing failed status...${colors.reset}`);
    console.log(`   Payload:`, failedPayload);
    console.log();

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`${colors.blue}📤 Failed Status Test - Response:${colors.reset}`);
          console.log(JSON.stringify(response, null, 2));
          resolve(response);
        } catch (error) {
          console.log(`${colors.red}❌ Failed to parse response for failed status test:${colors.reset}`);
          console.log(`   Raw response: ${data}`);
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    console.log('═'.repeat(60) + '\n');
    console.log(`${colors.bright}${colors.yellow}📊 Test 1: Success Status${colors.reset}\n`);
    
    await testTrackingEndpoint();
    
    console.log('\n' + '═'.repeat(60) + '\n');
    console.log(`${colors.bright}${colors.yellow}📊 Test 2: Failed Status${colors.reset}\n`);
    
    await testFailedStatus();
    
    console.log('\n' + '═'.repeat(60));
    console.log(`\n${colors.bright}${colors.green}✅ All Tests Complete!${colors.reset}\n`);
    
  } catch (error) {
    console.log(`\n${colors.red}Test failed with error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the test
main();