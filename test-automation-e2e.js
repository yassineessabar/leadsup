#!/usr/bin/env node

const https = require('https');

// Configuration
const API_URL = 'https://app.leadsup.io/api/campaigns/automation/process-pending';
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

console.log(`${colors.bright}${colors.blue}🚀 Testing Email Automation Workflow${colors.reset}\n`);

// Create Basic Auth header
const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

// Function to make API request
function testEndpoint() {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    console.log(`${colors.yellow}📡 Calling API endpoint...${colors.reset}`);
    console.log(`   URL: ${API_URL}`);
    console.log(`   Auth: ${USERNAME}:***\n`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log(`${colors.green}✅ Authentication successful!${colors.reset}`);
            console.log(`${colors.green}   Status: ${res.statusCode}${colors.reset}\n`);
            
            if (response.success) {
              const campaigns = response.data || [];
              
              if (campaigns.length === 0) {
                console.log(`${colors.yellow}📭 No campaigns ready for processing${colors.reset}`);
                console.log(`   This could mean:`);
                console.log(`   - No active campaigns exist`);
                console.log(`   - Not within sending hours for any contacts`);
                console.log(`   - Not an active sending day`);
                console.log(`   - All contacts already processed today\n`);
              } else {
                console.log(`${colors.green}📬 Found ${campaigns.length} campaign(s) to process!${colors.reset}\n`);
                
                campaigns.forEach((campaign, index) => {
                  console.log(`${colors.bright}Campaign ${index + 1}: ${campaign.name}${colors.reset}`);
                  console.log(`   ID: ${campaign.id}`);
                  console.log(`   Type: ${campaign.type || 'email'}`);
                  console.log(`   Status: ${campaign.status}`);
                  
                  if (campaign.contacts && campaign.contacts.length > 0) {
                    console.log(`   ${colors.green}Contacts to process: ${campaign.contacts.length}${colors.reset}`);
                    
                    // Show first 3 contacts
                    campaign.contacts.slice(0, 3).forEach((contact, i) => {
                      console.log(`\n   ${colors.blue}Contact ${i + 1}:${colors.reset}`);
                      console.log(`     Email: ${contact.email}`);
                      console.log(`     Name: ${contact.firstName} ${contact.lastName}`);
                      console.log(`     Company: ${contact.company || 'N/A'}`);
                      console.log(`     Local Time: ${contact.localTime}`);
                      console.log(`     Next Step: ${contact.nextSequence?.title || 'Unknown'}`);
                      console.log(`     Sender: ${contact.sender?.email || 'Not assigned'}`);
                    });
                    
                    if (campaign.contacts.length > 3) {
                      console.log(`\n   ... and ${campaign.contacts.length - 3} more contacts`);
                    }
                  } else {
                    console.log(`   ${colors.yellow}No contacts ready${colors.reset}`);
                  }
                  
                  if (campaign.senders && campaign.senders.length > 0) {
                    console.log(`\n   ${colors.blue}Available Senders: ${campaign.senders.length}${colors.reset}`);
                    campaign.senders.forEach(sender => {
                      console.log(`     - ${sender.email} (Daily limit: ${sender.daily_limit}, Health: ${sender.health_score})`);
                    });
                  }
                  
                  console.log(`\n   ${colors.bright}----------------------------------------${colors.reset}`);
                });
              }
              
              // Show processing timestamp
              if (response.processedAt) {
                const time = new Date(response.processedAt).toLocaleString();
                console.log(`\n${colors.blue}⏰ Processed at: ${time}${colors.reset}`);
              }
              
            } else {
              console.log(`${colors.red}❌ API returned an error:${colors.reset}`);
              console.log(`   ${response.error}`);
            }
            
          } else if (res.statusCode === 401) {
            console.log(`${colors.red}❌ Authentication failed!${colors.reset}`);
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Message: ${response.error || 'Unauthorized'}`);
            console.log(`\n${colors.yellow}📝 Check that:${colors.reset}`);
            console.log(`   1. N8N_API_USERNAME and N8N_API_PASSWORD are set in Vercel`);
            console.log(`   2. The same credentials are configured in n8n workflow`);
            console.log(`   3. The password is correct (no extra spaces)`);
          } else {
            console.log(`${colors.red}❌ Unexpected response:${colors.reset}`);
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Response: ${JSON.stringify(response, null, 2)}`);
          }
          
          resolve(response);
        } catch (error) {
          console.log(`${colors.red}❌ Failed to parse response:${colors.reset}`);
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

    req.end();
  });
}

// Helper function to check prerequisites
async function checkPrerequisites() {
  console.log(`${colors.bright}${colors.yellow}📋 Checking Prerequisites:${colors.reset}\n`);
  
  console.log(`1. ${colors.blue}Active Campaigns:${colors.reset}`);
  console.log(`   - Ensure at least one campaign has status = 'Active'`);
  console.log(`   - Campaign must have active senders assigned`);
  console.log(`   - Campaign must have sequences created`);
  console.log(`   - Campaign must have prospects/contacts added\n`);
  
  console.log(`2. ${colors.blue}Campaign Settings:${colors.reset}`);
  console.log(`   - Active days must include today (${new Date().toLocaleDateString('en', { weekday: 'short' })})`);
  console.log(`   - Current time must be within sending hours`);
  console.log(`   - Daily limits not exceeded\n`);
  
  console.log(`3. ${colors.blue}Contacts/Prospects:${colors.reset}`);
  console.log(`   - Must not be opted out`);
  console.log(`   - Must be within sending hours for their timezone\n`);
  
  console.log(`${colors.bright}${colors.yellow}📊 Running Test...${colors.reset}\n`);
  console.log('═'.repeat(50) + '\n');
}

// Main execution
async function main() {
  try {
    await checkPrerequisites();
    await testEndpoint();
    
    console.log('\n' + '═'.repeat(50));
    console.log(`\n${colors.bright}${colors.green}✅ Test Complete!${colors.reset}\n`);
    
    console.log(`${colors.bright}Next Steps:${colors.reset}`);
    console.log(`1. If contacts were found, check n8n workflow execution`);
    console.log(`2. Monitor the email sending in n8n`);
    console.log(`3. Check your database for tracking updates`);
    console.log(`4. Verify emails are being received\n`);
    
  } catch (error) {
    console.log(`\n${colors.red}Test failed with error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the test
main();