#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test Campaign ID
const CAMPAIGN_ID = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';

async function clearExistingTestData() {
  console.log('🗑️  Clearing existing test data...');
  
  // Delete all test contacts in the campaign
  const { error } = await supabase
    .from('prospects')
    .delete()
    .eq('campaign_id', CAMPAIGN_ID);
  
  if (error) {
    console.log('Error clearing data:', error.message);
  } else {
    console.log('✅ Cleared existing test contacts');
  }
}

async function setupCampaignSequences() {
  console.log('\n📝 Checking campaign sequences...');
  
  // Check existing sequences
  const { data: sequences } = await supabase
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('step_number');
  
  if (sequences && sequences.length > 0) {
    console.log(`✅ Found ${sequences.length} existing sequences:`);
    sequences.forEach(seq => {
      console.log(`   Step ${seq.step_number}: Delay ${seq.delay_days} days`);
    });
    return sequences;
  }
  
  // Create basic sequences if none exist
  const newSequences = [
    { campaign_id: CAMPAIGN_ID, step_number: 1, delay_days: 0, subject: 'Introduction' },
    { campaign_id: CAMPAIGN_ID, step_number: 2, delay_days: 3, subject: 'Follow-up' },
    { campaign_id: CAMPAIGN_ID, step_number: 3, delay_days: 3, subject: 'Check-in' },
    { campaign_id: CAMPAIGN_ID, step_number: 4, delay_days: 7, subject: 'Final' }
  ];
  
  const { data: created, error } = await supabase
    .from('campaign_sequences')
    .insert(newSequences)
    .select();
  
  if (error) {
    console.log('Note: Could not create sequences (may already exist)');
    return [];
  }
  
  console.log(`✅ Created ${created.length} sequences`);
  return created;
}

async function createTestContacts() {
  console.log('\n🚀 Creating test contacts for automation...\n');
  
  const now = new Date();
  
  // Check current time in different locations
  const locations = {
    'New York': new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"})).getHours(),
    'Tokyo': new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"})).getHours(),
    'London': new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"})).getHours(),
    'Sydney': new Date(now.toLocaleString("en-US", {timeZone: "Australia/Sydney"})).getHours(),
    'Los Angeles': new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"})).getHours()
  };
  
  console.log('📍 Current local times:');
  Object.entries(locations).forEach(([city, hour]) => {
    const inBusiness = hour >= 9 && hour < 17;
    console.log(`   ${city}: ${hour}:00 ${inBusiness ? '✅ Business hours' : '❌ Outside hours'}`);
  });
  console.log('');
  
  const testContacts = [
    // IMMEDIATE SENDS - Fresh contacts ready for Step 1
    {
      email_address: 'test.immediate.ny@automation.com',
      first_name: 'John',
      last_name: 'Immediate-NY',
      location: 'New York',
      company: 'Test Corp NY',
      title: 'Manager',
      description: '✅ Should send Step 1 immediately'
    },
    {
      email_address: 'test.immediate.tokyo@automation.com',
      first_name: 'Hiroshi',
      last_name: 'Immediate-Tokyo',
      location: 'Tokyo',
      company: 'Test Corp Tokyo',
      title: 'Director',
      description: locations.Tokyo >= 9 && locations.Tokyo < 17 
        ? '✅ Should send Step 1 (business hours)' 
        : '❌ Should wait (outside hours)'
    },
    {
      email_address: 'test.immediate.london@automation.com',
      first_name: 'Oliver',
      last_name: 'Immediate-London',
      location: 'London',
      company: 'Test Corp UK',
      title: 'VP Sales',
      description: locations.London >= 9 && locations.London < 17 
        ? '✅ Should send Step 1 (business hours)' 
        : '❌ Should wait (outside hours)'
    },
    {
      email_address: 'test.immediate.sydney@automation.com',
      first_name: 'Emma',
      last_name: 'Immediate-Sydney',
      location: 'Sydney',
      company: 'Test Corp AU',
      title: 'CEO',
      description: locations.Sydney >= 9 && locations.Sydney < 17 
        ? '✅ Should send Step 1 (business hours)' 
        : '❌ Should wait (outside hours)'
    },
    {
      email_address: 'test.immediate.la@automation.com',
      first_name: 'Michael',
      last_name: 'Immediate-LA',
      location: 'Los Angeles',
      company: 'Test Corp LA',
      title: 'Founder',
      description: locations['Los Angeles'] >= 9 && locations['Los Angeles'] < 17 
        ? '✅ Should send Step 1 (business hours)' 
        : '❌ Should wait (outside hours)'
    },
    
    // MID-SEQUENCE CONTACTS - Need to simulate being at different steps
    {
      email_address: 'test.step2.ready@automation.com',
      first_name: 'Sarah',
      last_name: 'Step2-Ready',
      location: 'Chicago',
      company: 'Progress Corp',
      title: 'Director',
      description: '✅ Ready for Step 2 (will simulate Step 1 sent 4 days ago)',
      simulateProgress: { step: 1, daysAgo: 4 }
    },
    {
      email_address: 'test.step2.notready@automation.com',
      first_name: 'James',
      last_name: 'Step2-Wait',
      location: 'Boston',
      company: 'Wait Corp',
      title: 'Manager',
      description: '❌ NOT ready for Step 2 (will simulate Step 1 sent 1 day ago)',
      simulateProgress: { step: 1, daysAgo: 1 }
    },
    {
      email_address: 'test.step3.ready@automation.com',
      first_name: 'Lisa',
      last_name: 'Step3-Ready',
      location: 'Seattle',
      company: 'Advanced Corp',
      title: 'VP',
      description: '✅ Ready for Step 3 (will simulate Step 2 sent 5 days ago)',
      simulateProgress: { step: 2, daysAgo: 5 }
    },
    {
      email_address: 'test.step4.ready@automation.com',
      first_name: 'Robert',
      last_name: 'Step4-Ready',
      location: 'Miami',
      company: 'Final Corp',
      title: 'CEO',
      description: '✅ Ready for Step 4 (will simulate Step 3 sent 8 days ago)',
      simulateProgress: { step: 3, daysAgo: 8 }
    },
    {
      email_address: 'test.step4.notready@automation.com',
      first_name: 'Jennifer',
      last_name: 'Step4-Wait',
      location: 'Denver',
      company: 'Almost Corp',
      title: 'Director',
      description: '❌ NOT ready for Step 4 (will simulate Step 3 sent 5 days ago)',
      simulateProgress: { step: 3, daysAgo: 5 }
    },
    
    // COMPLETED SEQUENCE
    {
      email_address: 'test.completed@automation.com',
      first_name: 'Complete',
      last_name: 'Done',
      location: 'Phoenix',
      company: 'Finished Corp',
      title: 'CEO',
      description: '❌ Completed all 4 steps (will simulate all steps sent)',
      simulateProgress: { step: 4, daysAgo: 10 }
    }
  ];
  
  console.log('📧 Creating test contacts:\n');
  
  for (const contact of testContacts) {
    try {
      // Create the prospect
      const prospectData = {
        email_address: contact.email_address,
        first_name: contact.first_name,
        last_name: contact.last_name,
        location: contact.location,
        company: contact.company,
        title: contact.title,
        campaign_id: CAMPAIGN_ID,
        linkedin_url: `https://linkedin.com/in/${contact.first_name.toLowerCase()}-test`,
        created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() // Created 30 days ago
      };
      
      const { data: prospect, error } = await supabase
        .from('prospects')
        .insert(prospectData)
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Failed to create ${contact.first_name}:`, error.message);
        continue;
      }
      
      // Create progress records if needed
      if (contact.simulateProgress) {
        const progressRecords = [];
        
        for (let step = 1; step <= contact.simulateProgress.step; step++) {
          let sentDate;
          if (step === contact.simulateProgress.step) {
            // Last step - use specified days ago
            sentDate = new Date(now.getTime() - contact.simulateProgress.daysAgo * 24 * 60 * 60 * 1000);
          } else {
            // Earlier steps - add more days
            const extraDays = (contact.simulateProgress.step - step) * 4;
            sentDate = new Date(now.getTime() - (contact.simulateProgress.daysAgo + extraDays) * 24 * 60 * 60 * 1000);
          }
          
          progressRecords.push({
            prospect_id: prospect.id,
            campaign_id: CAMPAIGN_ID,
            sequence_step: step,
            status: 'sent',
            sent_at: sentDate.toISOString(),
            created_at: sentDate.toISOString()
          });
        }
        
        const { error: progressError } = await supabase
          .from('prospect_sequence_progress')
          .insert(progressRecords);
        
        if (progressError) {
          console.log(`   ⚠️  Note: Could not create progress records (table may not exist)`);
        }
      }
      
      console.log(`✅ ${contact.first_name} ${contact.last_name}`);
      console.log(`   Email: ${contact.email_address}`);
      console.log(`   Location: ${contact.location}`);
      console.log(`   Expected: ${contact.description}`);
      console.log('');
      
    } catch (err) {
      console.error(`❌ Error creating ${contact.first_name}:`, err.message);
    }
  }
}

async function verifyResults() {
  console.log('\n📊 Verification Summary:\n');
  
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID);
  
  if (error) {
    console.error('Error fetching prospects:', error);
    return;
  }
  
  console.log(`✅ Total test contacts created: ${prospects?.length || 0}`);
  
  if (prospects && prospects.length > 0) {
    console.log('\n📋 Test contacts ready for automation:');
    prospects.forEach(p => {
      console.log(`   - ${p.first_name} ${p.last_name} (${p.location}): ${p.email_address}`);
    });
  }
}

async function main() {
  console.log('🎯 AUTOMATION TEST SETUP');
  console.log('═'.repeat(70));
  console.log(`Campaign ID: ${CAMPAIGN_ID}`);
  console.log(`Current UTC: ${new Date().toISOString()}`);
  console.log('═'.repeat(70));
  
  try {
    await clearExistingTestData();
    await setupCampaignSequences();
    await createTestContacts();
    await verifyResults();
    
    console.log('\n✨ Setup complete!\n');
    console.log('📋 Next Steps:');
    console.log('1. Check GitHub Actions workflow status:');
    console.log('   gh workflow list');
    console.log('');
    console.log('2. Trigger the automation manually:');
    console.log('   gh workflow run automation.yml');
    console.log('');
    console.log('3. Monitor the automation run:');
    console.log('   gh run list --workflow=automation.yml');
    console.log('');
    console.log('4. View detailed logs:');
    console.log('   gh run view [run-id] --log');
    console.log('');
    console.log('🔍 The automation should:');
    console.log('   • Process fresh contacts immediately (Step 1)');
    console.log('   • Check business hours based on location/timezone');
    console.log('   • Respect sequence timing (3/3/7 days between steps)');
    console.log('   • Apply the email_date < today condition');
    console.log('');
    console.log('📱 Monitor from frontend:');
    console.log('   Open your campaign dashboard to see sequence processing in real-time');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the setup
main();