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
  
  // Get all prospects in the campaign
  const { data: prospects } = await supabase
    .from('prospects')
    .select('id')
    .eq('campaign_id', CAMPAIGN_ID);
  
  if (prospects && prospects.length > 0) {
    const prospectIds = prospects.map(p => p.id);
    
    // Delete sequence progress
    await supabase
      .from('prospect_sequence_progress')
      .delete()
      .in('prospect_id', prospectIds);
    
    // Delete prospects
    await supabase
      .from('prospects')
      .delete()
      .eq('campaign_id', CAMPAIGN_ID);
    
    console.log(`✅ Deleted ${prospects.length} existing test contacts`);
  } else {
    console.log('No existing test contacts found');
  }
}

async function createCampaignSequences() {
  console.log('\n📝 Setting up campaign sequences...');
  
  // Check if sequences exist
  const { data: existingSequences } = await supabase
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('step_number');
  
  if (existingSequences && existingSequences.length > 0) {
    console.log(`✅ Found ${existingSequences.length} existing sequences`);
    return existingSequences;
  }
  
  // Create sequences if they don't exist
  const sequences = [
    {
      campaign_id: CAMPAIGN_ID,
      step_number: 1,
      delay_days: 0,
      subject: 'Introduction - {{first_name}}',
      body: 'Hi {{first_name}}, I wanted to reach out...',
      created_at: new Date().toISOString()
    },
    {
      campaign_id: CAMPAIGN_ID,
      step_number: 2,
      delay_days: 3,
      subject: 'Following up - {{first_name}}',
      body: 'Hi {{first_name}}, Just following up on my previous email...',
      created_at: new Date().toISOString()
    },
    {
      campaign_id: CAMPAIGN_ID,
      step_number: 3,
      delay_days: 3,
      subject: 'Quick question - {{first_name}}',
      body: 'Hi {{first_name}}, I had a quick question...',
      created_at: new Date().toISOString()
    },
    {
      campaign_id: CAMPAIGN_ID,
      step_number: 4,
      delay_days: 7,
      subject: 'Final check-in - {{first_name}}',
      body: 'Hi {{first_name}}, This is my final check-in...',
      created_at: new Date().toISOString()
    }
  ];
  
  const { data: createdSequences, error } = await supabase
    .from('campaign_sequences')
    .insert(sequences)
    .select();
  
  if (error) {
    console.error('Error creating sequences:', error);
    return [];
  }
  
  console.log(`✅ Created ${createdSequences.length} sequences`);
  return createdSequences;
}

async function createTestContacts() {
  console.log('\n🚀 Creating test contacts with various scenarios...\n');
  
  const now = new Date();
  
  // Get current time in different timezones
  const timezones = {
    'New York': { tz: 'America/New_York', hour: new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"})).getHours() },
    'Tokyo': { tz: 'Asia/Tokyo', hour: new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"})).getHours() },
    'London': { tz: 'Europe/London', hour: new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"})).getHours() },
    'Sydney': { tz: 'Australia/Sydney', hour: new Date(now.toLocaleString("en-US", {timeZone: "Australia/Sydney"})).getHours() }
  };
  
  console.log('Current time zones:');
  Object.entries(timezones).forEach(([city, info]) => {
    const inBusinessHours = info.hour >= 9 && info.hour < 17;
    console.log(`  ${city}: ${info.hour}:00 (Business hours: ${inBusinessHours ? '✅' : '❌'})`);
  });
  console.log('');
  
  const testScenarios = [
    // FRESH CONTACTS - Should send Step 1 immediately
    {
      name: 'Fresh Lead - New York',
      email: 'test.fresh.ny@example.com',
      firstName: 'John',
      lastName: 'Fresh',
      location: 'New York',
      expectedBehavior: '✅ SHOULD SEND Step 1 immediately'
    },
    {
      name: 'Fresh Lead - Tokyo',
      email: 'test.fresh.tokyo@example.com',
      firstName: 'Hiroshi',
      lastName: 'New',
      location: 'Tokyo',
      expectedBehavior: timezones.Tokyo.hour >= 9 && timezones.Tokyo.hour < 17 
        ? '✅ SHOULD SEND Step 1 (in business hours)' 
        : '❌ BLOCKED (outside business hours)'
    },
    {
      name: 'Fresh Lead - London',
      email: 'test.fresh.london@example.com',
      firstName: 'Oliver',
      lastName: 'Start',
      location: 'London',
      expectedBehavior: timezones.London.hour >= 9 && timezones.London.hour < 17 
        ? '✅ SHOULD SEND Step 1 (in business hours)' 
        : '❌ BLOCKED (outside business hours)'
    },
    
    // MID-SEQUENCE CONTACTS - Already sent some emails
    {
      name: 'Mid-Sequence - Ready for Step 2',
      email: 'test.step2.ready@example.com',
      firstName: 'Michael',
      lastName: 'Progress',
      location: 'Chicago',
      progressSetup: {
        step: 1,
        sentDaysAgo: 4 // Sent 4 days ago, ready for step 2 (needs 3 days)
      },
      expectedBehavior: '✅ SHOULD SEND Step 2 (4 days since Step 1)'
    },
    {
      name: 'Mid-Sequence - NOT Ready for Step 2',
      email: 'test.step2.notready@example.com',
      firstName: 'Sarah',
      lastName: 'Waiting',
      location: 'Boston',
      progressSetup: {
        step: 1,
        sentDaysAgo: 1 // Sent 1 day ago, not ready for step 2
      },
      expectedBehavior: '❌ NOT READY for Step 2 (only 1 day since Step 1)'
    },
    {
      name: 'Mid-Sequence - Ready for Step 3',
      email: 'test.step3.ready@example.com',
      firstName: 'Emma',
      lastName: 'Advanced',
      location: 'Seattle',
      progressSetup: {
        step: 2,
        sentDaysAgo: 5 // Sent 5 days ago, ready for step 3 (needs 3 days)
      },
      expectedBehavior: '✅ SHOULD SEND Step 3 (5 days since Step 2)'
    },
    {
      name: 'Mid-Sequence - Ready for Step 4',
      email: 'test.step4.ready@example.com',
      firstName: 'Robert',
      lastName: 'Final',
      location: 'Miami',
      progressSetup: {
        step: 3,
        sentDaysAgo: 8 // Sent 8 days ago, ready for step 4 (needs 7 days)
      },
      expectedBehavior: '✅ SHOULD SEND Step 4 (8 days since Step 3)'
    },
    {
      name: 'Mid-Sequence - NOT Ready for Step 4',
      email: 'test.step4.notready@example.com',
      firstName: 'Jessica',
      lastName: 'Almost',
      location: 'Denver',
      progressSetup: {
        step: 3,
        sentDaysAgo: 5 // Sent 5 days ago, not ready for step 4 (needs 7 days)
      },
      expectedBehavior: '❌ NOT READY for Step 4 (only 5 days since Step 3)'
    },
    
    // COMPLETED SEQUENCE
    {
      name: 'Completed All Steps',
      email: 'test.completed@example.com',
      firstName: 'Diana',
      lastName: 'Done',
      location: 'Los Angeles',
      progressSetup: {
        step: 4,
        sentDaysAgo: 10
      },
      expectedBehavior: '❌ COMPLETED - All 4 steps already sent'
    }
  ];
  
  for (const scenario of testScenarios) {
    try {
      // Create prospect
      const { data: prospect, error: prospectError } = await supabase
        .from('prospects')
        .insert({
          email_address: scenario.email,
          first_name: scenario.firstName,
          last_name: scenario.lastName,
          company: 'Test Automation Corp',
          title: 'Test Role',
          location: scenario.location,
          source: 'test_automation',
          campaign_id: CAMPAIGN_ID,
          status: 'Active',
          created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Created 30 days ago
          linkedin_url: `https://linkedin.com/in/test-${scenario.firstName.toLowerCase()}`
        })
        .select()
        .single();
      
      if (prospectError) {
        console.error(`❌ Error creating ${scenario.name}:`, prospectError);
        continue;
      }
      
      // Create progress records if needed
      if (scenario.progressSetup) {
        const progressRecords = [];
        
        // Create sent records for previous steps
        for (let i = 1; i <= scenario.progressSetup.step; i++) {
          let sentDate;
          if (i === scenario.progressSetup.step) {
            // Last sent step
            sentDate = new Date(now.getTime() - scenario.progressSetup.sentDaysAgo * 24 * 60 * 60 * 1000);
          } else {
            // Earlier steps - add more days
            const daysAgo = scenario.progressSetup.sentDaysAgo + ((scenario.progressSetup.step - i) * 4);
            sentDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          }
          
          progressRecords.push({
            prospect_id: prospect.id,
            campaign_id: CAMPAIGN_ID,
            sequence_step: i,
            status: 'sent',
            sent_at: sentDate.toISOString(),
            created_at: sentDate.toISOString()
          });
        }
        
        const { error: progressError } = await supabase
          .from('prospect_sequence_progress')
          .insert(progressRecords);
        
        if (progressError) {
          console.error(`❌ Error creating progress for ${scenario.name}:`, progressError);
        }
      }
      
      console.log(`✅ Created: ${scenario.name}`);
      console.log(`   Email: ${scenario.email}`);
      console.log(`   Location: ${scenario.location}`);
      if (scenario.progressSetup) {
        console.log(`   Current Step: ${scenario.progressSetup.step}`);
        console.log(`   Last Sent: ${scenario.progressSetup.sentDaysAgo} days ago`);
      } else {
        console.log(`   Current Step: 0 (fresh contact)`);
      }
      console.log(`   Expected: ${scenario.expectedBehavior}`);
      console.log('');
      
    } catch (error) {
      console.error(`❌ Unexpected error for ${scenario.name}:`, error);
    }
  }
}

async function verifySetup() {
  console.log('\n📊 Verifying test setup...\n');
  
  // Get all test prospects
  const { data: prospects } = await supabase
    .from('prospects')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('created_at', { ascending: false });
  
  console.log(`Total test contacts: ${prospects?.length || 0}`);
  
  // Get progress records
  const { data: progressRecords } = await supabase
    .from('prospect_sequence_progress')
    .select('*')
    .in('prospect_id', prospects?.map(p => p.id) || []);
  
  console.log(`Total progress records: ${progressRecords?.length || 0}`);
  
  // Count by status
  const freshContacts = prospects?.filter(p => {
    const hasProgress = progressRecords?.some(pr => pr.prospect_id === p.id);
    return !hasProgress;
  }).length || 0;
  
  const inProgress = prospects?.filter(p => {
    const progress = progressRecords?.filter(pr => pr.prospect_id === p.id) || [];
    return progress.length > 0 && progress.length < 4;
  }).length || 0;
  
  const completed = prospects?.filter(p => {
    const progress = progressRecords?.filter(pr => pr.prospect_id === p.id) || [];
    return progress.length >= 4;
  }).length || 0;
  
  console.log(`\n📈 Status Summary:`);
  console.log(`  Fresh contacts (Step 0): ${freshContacts}`);
  console.log(`  In progress (Steps 1-3): ${inProgress}`);
  console.log(`  Completed (Step 4+): ${completed}`);
}

async function main() {
  console.log('🎯 AUTOMATION TEST SETUP');
  console.log('═'.repeat(60));
  console.log('Campaign ID:', CAMPAIGN_ID);
  console.log('Current time:', new Date().toISOString());
  console.log('');
  
  try {
    await clearExistingTestData();
    await createCampaignSequences();
    await createTestContacts();
    await verifySetup();
    
    console.log('\n✨ Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Check the GitHub Actions workflow');
    console.log('2. Trigger the automation: gh workflow run automation.yml');
    console.log('3. Monitor logs: gh run list --workflow=automation.yml');
    console.log('4. View the frontend to see sequence processing');
    console.log('\n🔍 The automation should:');
    console.log('  - Process fresh contacts immediately (Step 1)');
    console.log('  - Check business hours for each contact\'s timezone');
    console.log('  - Respect sequence timing (3 days between steps 1-3, 7 days for step 4)');
    console.log('  - Skip contacts not ready for their next step');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();