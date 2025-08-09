#!/usr/bin/env node

/**
 * Complete End-to-End Test for Email Automation
 * This script will:
 * 1. Create a test campaign
 * 2. Configure campaign settings
 * 3. Add a test sender
 * 4. Create email sequences
 * 5. Add test prospects
 * 6. Trigger the automation
 * 7. Verify the results
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

// Test configuration
const TEST_CONFIG = {
  campaignName: `Test Automation ${new Date().toISOString().slice(0, 10)}`,
  senderEmail: 'test.sender@example.com', // Change to a real email for actual sending
  testProspects: [
    {
      email: 'test1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Test Company 1',
      title: 'CEO'
    },
    {
      email: 'test2@example.com', 
      firstName: 'Jane',
      lastName: 'Smith',
      company: 'Test Company 2',
      title: 'CTO'
    },
    {
      email: 'test3@example.com',
      firstName: 'Bob',
      lastName: 'Johnson',
      company: 'Test Company 3',
      title: 'VP Sales'
    }
  ]
};

console.log(`${colors.bright}${colors.magenta}🚀 Complete End-to-End Automation Test${colors.reset}\n`);
console.log('═'.repeat(60) + '\n');

// Helper function to log steps
function logStep(step, message) {
  console.log(`${colors.bright}${colors.blue}Step ${step}: ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.yellow}ℹ️  ${message}${colors.reset}`);
}

// Step 1: Create Test Campaign
async function createTestCampaign() {
  logStep(1, 'Creating Test Campaign');
  
  try {
    // First, get or create a test user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
    
    if (userError) {
      logError(`Failed to get user: ${userError.message}`);
      return null;
    }
    
    const userId = userData.id;
    
    // Create the campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        name: TEST_CONFIG.campaignName,
        status: 'Active',
        user_id: userId,
        type: 'email',
        trigger_type: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logError(`Failed to create campaign: ${error.message}`);
      return null;
    }
    
    logSuccess(`Campaign created: ${campaign.name} (ID: ${campaign.id})`);
    return campaign;
  } catch (error) {
    logError(`Error creating campaign: ${error.message}`);
    return null;
  }
}

// Step 2: Configure Campaign Settings
async function configureCampaignSettings(campaignId) {
  logStep(2, 'Configuring Campaign Settings');
  
  try {
    const currentDay = new Date().toLocaleDateString('en', { weekday: 'short' });
    const currentHour = new Date().getHours();
    
    // Set sending hours to include current time for immediate testing
    const startHour = Math.max(0, currentHour - 1);
    const endHour = Math.min(23, currentHour + 2);
    
    const { data: settings, error } = await supabase
      .from('campaign_settings')
      .insert({
        campaign_id: campaignId,
        daily_contacts_limit: 10,
        daily_sequence_limit: 5,
        active_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], // All days for testing
        sending_start_time: `${startHour.toString().padStart(2, '0')}:00`,
        sending_end_time: `${endHour.toString().padStart(2, '0')}:00`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logError(`Failed to configure settings: ${error.message}`);
      return null;
    }
    
    logSuccess(`Settings configured:`);
    console.log(`   - Active Days: All days`);
    console.log(`   - Sending Hours: ${startHour}:00 - ${endHour}:00`);
    console.log(`   - Daily Limit: 10 contacts`);
    console.log(`   - Current Day: ${currentDay} (included ✓)`);
    
    return settings;
  } catch (error) {
    logError(`Error configuring settings: ${error.message}`);
    return null;
  }
}

// Step 3: Add Test Sender
async function addTestSender(campaignId) {
  logStep(3, 'Adding Test Sender Account');
  
  try {
    const { data: sender, error } = await supabase
      .from('campaign_senders')
      .insert({
        campaign_id: campaignId,
        email: TEST_CONFIG.senderEmail,
        name: 'Test Sender',
        health_score: 100,
        daily_limit: 50,
        is_active: true,
        sender_type: 'smtp',
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logError(`Failed to add sender: ${error.message}`);
      return null;
    }
    
    logSuccess(`Sender added: ${sender.email} (Daily limit: ${sender.daily_limit})`);
    return sender;
  } catch (error) {
    logError(`Error adding sender: ${error.message}`);
    return null;
  }
}

// Step 4: Create Email Sequences
async function createEmailSequences(campaignId) {
  logStep(4, 'Creating Email Sequences');
  
  try {
    const sequences = [
      {
        campaign_id: campaignId,
        step_number: 1,
        sequence_number: 1,
        sequence_step: 1,
        title: 'Initial Outreach',
        subject: 'Quick question about {{company}}',
        content: `Hi {{firstName}},

I noticed you're the {{title}} at {{company}}. 

I wanted to reach out because we've helped similar companies improve their email automation workflows.

Would you be interested in a quick chat to see if we could help {{company}} as well?

Best regards,
{{senderName}}`,
        timing_days: 0,
        outreach_method: 'email',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        campaign_id: campaignId,
        step_number: 2,
        sequence_number: 1,
        sequence_step: 2,
        title: 'Follow-up 1',
        subject: 'Re: Quick question about {{company}}',
        content: `Hi {{firstName}},

Just following up on my previous email. 

I understand you're busy, but I think a 15-minute call could be really valuable for {{company}}.

Are you available this week?

Thanks,
{{senderName}}`,
        timing_days: 3,
        outreach_method: 'email',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    const { data: createdSequences, error } = await supabase
      .from('campaign_sequences')
      .insert(sequences)
      .select();
    
    if (error) {
      logError(`Failed to create sequences: ${error.message}`);
      return null;
    }
    
    logSuccess(`Created ${createdSequences.length} email sequences`);
    createdSequences.forEach(seq => {
      console.log(`   - Step ${seq.step_number}: ${seq.title}`);
    });
    
    return createdSequences;
  } catch (error) {
    logError(`Error creating sequences: ${error.message}`);
    return null;
  }
}

// Step 5: Add Test Prospects
async function addTestProspects(campaignId) {
  logStep(5, 'Adding Test Prospects');
  
  try {
    const prospects = TEST_CONFIG.testProspects.map(p => ({
      campaign_id: campaignId,
      email_address: p.email,
      first_name: p.firstName,
      last_name: p.lastName,
      company_name: p.company,
      job_title: p.title,
      time_zone: 'America/New_York',
      opted_out: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data: createdProspects, error } = await supabase
      .from('prospects')
      .insert(prospects)
      .select();
    
    if (error) {
      logError(`Failed to add prospects: ${error.message}`);
      return null;
    }
    
    logSuccess(`Added ${createdProspects.length} test prospects:`);
    createdProspects.forEach(p => {
      console.log(`   - ${p.first_name} ${p.last_name} (${p.email_address})`);
    });
    
    return createdProspects;
  } catch (error) {
    logError(`Error adding prospects: ${error.message}`);
    return null;
  }
}

// Step 6: Test the API Endpoint
async function testAutomationAPI() {
  logStep(6, 'Testing Automation API Endpoint');
  
  const API_URL = process.env.NEXT_PUBLIC_APP_URL === 'http://localhost:3000' 
    ? 'http://localhost:3000/api/campaigns/automation/process-pending'
    : 'https://app.leadsup.io/api/campaigns/automation/process-pending';
    
  const USERNAME = process.env.N8N_API_USERNAME || 'admin';
  const PASSWORD = process.env.N8N_API_PASSWORD;
  
  const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
  
  return new Promise((resolve) => {
    const isLocal = API_URL.startsWith('http://localhost');
    const protocol = isLocal ? require('http') : https;
    const url = new URL(API_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isLocal ? 3000 : 443),
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };
    
    logInfo(`Calling API: ${API_URL}`);
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 && response.success) {
            const campaigns = response.data || [];
            
            if (campaigns.length > 0) {
              logSuccess(`API returned ${campaigns.length} campaign(s) ready for processing`);
              
              // Find our test campaign
              const testCampaign = campaigns.find(c => c.name === TEST_CONFIG.campaignName);
              
              if (testCampaign) {
                logSuccess(`Test campaign found in response!`);
                console.log(`   - Contacts to process: ${testCampaign.contacts?.length || 0}`);
                console.log(`   - Senders available: ${testCampaign.senders?.length || 0}`);
                
                if (testCampaign.contacts && testCampaign.contacts.length > 0) {
                  console.log(`\n${colors.bright}Contacts ready for processing:${colors.reset}`);
                  testCampaign.contacts.forEach((c, i) => {
                    console.log(`   ${i + 1}. ${c.firstName} ${c.lastName} (${c.email})`);
                    console.log(`      - Company: ${c.company}`);
                    console.log(`      - Next Step: ${c.nextSequence?.title}`);
                    console.log(`      - Sender: ${c.sender?.email}`);
                  });
                }
              } else {
                logInfo('Test campaign not in response (may not meet sending criteria)');
              }
            } else {
              logInfo('No campaigns ready for processing (check time/day settings)');
            }
            
            resolve(response);
          } else {
            logError(`API error: ${response.error || 'Unknown error'}`);
            resolve(null);
          }
        } catch (error) {
          logError(`Failed to parse response: ${error.message}`);
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      logError(`Request failed: ${error.message}`);
      resolve(null);
    });
    
    req.end();
  });
}

// Step 7: Trigger n8n Workflow
async function triggerN8nWorkflow() {
  logStep(7, 'Triggering n8n Workflow');
  
  logInfo('In n8n, you can:');
  console.log('   1. Manually execute the workflow');
  console.log('   2. Wait for the scheduled trigger (every 15 minutes)');
  console.log('   3. Check the execution history for results');
  
  return true;
}

// Step 8: Verify Results
async function verifyResults(campaignId) {
  logStep(8, 'Verifying Results');
  
  try {
    // Check for any email logs or tracking
    const { data: logs, error } = await supabase
      .from('prospect_sequence_progress')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!error && logs && logs.length > 0) {
      logSuccess(`Found ${logs.length} tracking records`);
      logs.forEach(log => {
        console.log(`   - Status: ${log.status}, Sent at: ${log.sent_at || 'Pending'}`);
      });
    } else {
      logInfo('No tracking records yet (emails may still be processing)');
    }
    
    return true;
  } catch (error) {
    logError(`Error checking results: ${error.message}`);
    return false;
  }
}

// Step 9: Cleanup (optional)
async function cleanup(campaignId) {
  console.log(`\n${colors.yellow}Do you want to clean up test data? (Keep it to test n8n)${colors.reset}`);
  
  // For now, we'll keep the data for testing
  logInfo('Test data retained for n8n workflow testing');
  console.log(`   Campaign ID: ${campaignId}`);
  console.log(`   Campaign Name: ${TEST_CONFIG.campaignName}`);
  
  return true;
}

// Main execution
async function main() {
  console.log(`${colors.bright}Starting at: ${new Date().toLocaleString()}${colors.reset}\n`);
  
  let campaignId = null;
  
  try {
    // Step 1: Create campaign
    const campaign = await createTestCampaign();
    if (!campaign) {
      throw new Error('Failed to create campaign');
    }
    campaignId = campaign.id;
    
    // Step 2: Configure settings
    const settings = await configureCampaignSettings(campaignId);
    if (!settings) {
      throw new Error('Failed to configure settings');
    }
    
    // Step 3: Add sender
    const sender = await addTestSender(campaignId);
    if (!sender) {
      throw new Error('Failed to add sender');
    }
    
    // Step 4: Create sequences
    const sequences = await createEmailSequences(campaignId);
    if (!sequences) {
      throw new Error('Failed to create sequences');
    }
    
    // Step 5: Add prospects
    const prospects = await addTestProspects(campaignId);
    if (!prospects) {
      throw new Error('Failed to add prospects');
    }
    
    // Wait a moment for data to propagate
    console.log(`\n${colors.yellow}Waiting 2 seconds for data to propagate...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Test API
    const apiResponse = await testAutomationAPI();
    
    // Step 7: Provide n8n instructions
    await triggerN8nWorkflow();
    
    // Step 8: Check results
    await verifyResults(campaignId);
    
    // Step 9: Cleanup decision
    await cleanup(campaignId);
    
    console.log('\n' + '═'.repeat(60));
    console.log(`\n${colors.bright}${colors.green}✅ End-to-End Test Complete!${colors.reset}\n`);
    
    console.log(`${colors.bright}Next Steps:${colors.reset}`);
    console.log(`1. Go to n8n and manually execute the workflow`);
    console.log(`2. Check the workflow execution for:`);
    console.log(`   - Successful API call`);
    console.log(`   - Campaigns and contacts fetched`);
    console.log(`   - Emails being sent`);
    console.log(`3. Monitor your database for tracking updates`);
    console.log(`4. Check email logs in your sender service`);
    
    console.log(`\n${colors.bright}Test Data Created:${colors.reset}`);
    console.log(`Campaign ID: ${campaignId}`);
    console.log(`Campaign Name: ${TEST_CONFIG.campaignName}`);
    console.log(`Test Prospects: ${TEST_CONFIG.testProspects.length}`);
    
  } catch (error) {
    console.log(`\n${colors.red}Test failed: ${error.message}${colors.reset}`);
    
    if (campaignId) {
      console.log(`\n${colors.yellow}Campaign ID for debugging: ${campaignId}${colors.reset}`);
    }
    
    process.exit(1);
  }
}

// Check for required environment variables
function checkEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'N8N_API_USERNAME',
    'N8N_API_PASSWORD'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logError('Missing environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log(`\n${colors.yellow}Please update your .env.local file${colors.reset}`);
    process.exit(1);
  }
  
  // Warning for placeholder password
  if (process.env.N8N_API_PASSWORD === 'your-secure-password-here') {
    logInfo('Using placeholder password - make sure to update for production');
  }
}

// Run the test
checkEnvironment();
main();