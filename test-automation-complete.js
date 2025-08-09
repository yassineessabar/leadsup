// Complete Email Automation Test Script
// Run with: node test-automation-complete.js

const API_BASE = process.env.API_URL || 'http://localhost:3000';

// For local development - you might need auth headers
const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  // Add your local auth if needed
  // 'Authorization': 'Bearer your-local-token'
};

async function testEmailAutomation() {
  console.log('🚀 Starting Email Automation Test...\n');

  // Test 1: Check API connectivity
  console.log('1️⃣ Testing API connectivity...');
  try {
    const response = await fetch(`${API_BASE}/api/campaigns/automation/process-pending`, {
      headers: AUTH_HEADERS
    });
    const data = await response.json();
    console.log('✅ API Response:', JSON.stringify(data, null, 2));
    
    if (!data.success) {
      console.log('⚠️ API returned success: false');
    }
    
    if (!data.data || data.data.length === 0) {
      console.log('📭 No campaigns ready for processing');
      return await createTestData();
    }
    
    console.log(`📧 Found ${data.data.length} campaigns ready\n`);
    
  } catch (error) {
    console.error('❌ API connectivity failed:', error.message);
    return false;
  }

  // Test 2: Test status update endpoint
  console.log('2️⃣ Testing status update endpoint...');
  const testStatusUpdate = {
    campaignId: 'test-campaign-id',
    contactId: 'test-contact-id', 
    sequenceId: 'test-sequence-id',
    status: 'sent',
    sentAt: new Date().toISOString(),
    senderAccount: 'test@example.com'
  };

  try {
    const response = await fetch(`${API_BASE}/api/campaigns/automation/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testStatusUpdate)
    });
    
    const result = await response.json();
    console.log('✅ Status Update Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Status update failed:', error.message);
  }

  console.log('\n3️⃣ Testing n8n webhook simulation...');
  await simulateN8nFlow();

  console.log('\n🎉 Test completed! Check your n8n workflow next.');
  return true;
}

async function createTestData() {
  console.log('\n📝 Creating test data for automation...');
  
  console.log(`
🔧 To create test data, run these SQL commands in your database:

-- 1. Create a test campaign
INSERT INTO campaigns (id, name, status, user_id, type, trigger_type) 
VALUES (
  gen_random_uuid(),
  'Test Email Campaign',
  'Active',
  (SELECT id FROM auth.users LIMIT 1),
  'email_sequence',
  'manual'
);

-- 2. Add campaign settings
INSERT INTO campaign_settings (
  campaign_id,
  daily_contacts_limit,
  daily_sequence_limit,
  active_days,
  sending_start_time,
  sending_end_time
) VALUES (
  (SELECT id FROM campaigns WHERE name = 'Test Email Campaign'),
  50,
  100,
  '["Mon","Tue","Wed","Thu","Fri"]'::jsonb,
  '09:00',
  '17:00'
);

-- 3. Add a sender account
INSERT INTO campaign_senders (
  campaign_id,
  email,
  name,
  sender_type,
  is_active,
  daily_limit,
  health_score
) VALUES (
  (SELECT id FROM campaigns WHERE name = 'Test Email Campaign'),
  'sender@example.com',
  'Test Sender',
  'smtp',
  true,
  100,
  100
);

-- 4. Create a sequence
INSERT INTO campaign_sequences (
  campaign_id,
  step_number,
  sequence_number,
  sequence_step,
  title,
  subject,
  content,
  timing_days,
  outreach_method,
  is_active
) VALUES (
  (SELECT id FROM campaigns WHERE name = 'Test Email Campaign'),
  1,
  1,
  1,
  'Welcome Email',
  'Hello {{firstName}}! Welcome to {{company}}',
  'Hi {{firstName}},\n\nWelcome to our platform! We are excited to have you.\n\nBest regards,\n{{senderName}}',
  0,
  'email',
  true
);

-- 5. Add test prospects
INSERT INTO prospects (
  campaign_id,
  email_address,
  first_name,
  last_name,
  company_name,
  job_title,
  time_zone,
  opted_out
) VALUES (
  (SELECT id FROM campaigns WHERE name = 'Test Email Campaign'),
  'test1@example.com',
  'John',
  'Doe',
  'Test Company',
  'CEO',
  'America/New_York',
  false
),
(
  (SELECT id FROM campaigns WHERE name = 'Test Email Campaign'),
  'test2@example.com',
  'Jane',
  'Smith',
  'Another Company',
  'CTO',
  'America/New_York',
  false
);
  `);
  
  return false;
}

async function simulateN8nFlow() {
  console.log('🔄 Simulating n8n workflow execution...');
  
  try {
    // Step 1: Fetch pending campaigns (like n8n would)
    const campaignsResponse = await fetch(`${API_BASE}/api/campaigns/automation/process-pending`);
    const campaignsData = await campaignsResponse.json();
    
    if (!campaignsData.success || !campaignsData.data?.length) {
      console.log('📭 No data to process');
      return;
    }
    
    console.log(`📊 Processing ${campaignsData.data.length} campaigns...`);
    
    // Step 2: Process each campaign (like n8n code node would)
    for (const campaign of campaignsData.data) {
      console.log(`\n📧 Campaign: ${campaign.name}`);
      console.log(`   Contacts: ${campaign.contacts?.length || 0}`);
      console.log(`   Senders: ${campaign.senders?.length || 0}`);
      
      // Step 3: For each contact, simulate sending
      for (const contact of campaign.contacts || []) {
        console.log(`   → ${contact.email} (${contact.firstName} ${contact.lastName})`);
        console.log(`     Sequence: ${contact.nextSequence?.title}`);
        console.log(`     Sender: ${contact.sender?.email}`);
        console.log(`     Timezone: ${contact.timezoneGroup} (${contact.localTime})`);
        
        // Step 4: Simulate successful send and status update
        const statusUpdate = {
          campaignId: campaign.id,
          contactId: contact.id,
          sequenceId: contact.nextSequence?.id,
          status: 'sent',
          sentAt: new Date().toISOString(),
          senderAccount: contact.sender?.email
        };
        
        try {
          const updateResponse = await fetch(`${API_BASE}/api/campaigns/automation/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(statusUpdate)
          });
          
          const updateResult = await updateResponse.json();
          console.log(`     Status: ${updateResult.success ? '✅ Updated' : '❌ Failed'}`);
        } catch (error) {
          console.log(`     Status: ❌ Error - ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
  }
}

// Run the test
testEmailAutomation().catch(console.error);