const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test Campaign ID
const TEST_CAMPAIGN_ID = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4';

async function deleteExistingContacts() {
  console.log('🗑️  Deleting existing contacts from campaign...');
  
  // Delete all test contacts
  const { error: deleteError } = await supabase
    .from('prospects')
    .delete()
    .eq('campaign_id', TEST_CAMPAIGN_ID);
  
  if (deleteError) {
    console.error('Error deleting prospects:', deleteError);
  } else {
    console.log('✅ Deleted existing contacts');
  }
}

async function createTestContacts() {
  console.log('\n📧 Creating test contacts with sequence timing scenarios...\n');
  
  const now = new Date();
  
  // Get current time in different timezones for display
  const nyHour = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"})).getHours();
  const tokyoHour = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"})).getHours();
  const londonHour = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"})).getHours();
  const sydneyHour = new Date(now.toLocaleString("en-US", {timeZone: "Australia/Sydney"})).getHours();
  
  console.log('Current time zones:');
  console.log(`  New York: ${nyHour}:00 (Business hours: ${nyHour >= 9 && nyHour < 17 ? '✅' : '❌'})`);
  console.log(`  Tokyo: ${tokyoHour}:00 (Business hours: ${tokyoHour >= 9 && tokyoHour < 17 ? '✅' : '❌'})`);
  console.log(`  London: ${londonHour}:00 (Business hours: ${londonHour >= 9 && londonHour < 17 ? '✅' : '❌'})`);
  console.log(`  Sydney: ${sydneyHour}:00 (Business hours: ${sydneyHour >= 9 && sydneyHour < 17 ? '✅' : '❌'})`);
  console.log('');
  
  const testScenarios = [
    // IMMEDIATE SENDS - Should process immediately
    {
      name: 'Immediate Send - Fresh Lead',
      email: 'test.immediate.fresh@example.com',
      firstName: 'John',
      lastName: 'Fresh',
      location: 'New York',
      sequence_step: 0, // Not started
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      expectedBehavior: '✅ SHOULD SEND - Fresh lead, Step 1 immediate'
    },
    {
      name: 'Immediate Send - Just Added',
      email: 'test.immediate.new@example.com',
      firstName: 'Sarah',
      lastName: 'NewLead',
      location: 'San Francisco',
      sequence_step: 0,
      created_at: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
      expectedBehavior: '✅ SHOULD SEND - New contact, Step 1 immediate'
    },
    
    // TIMEZONE TESTS - Business hours checks
    {
      name: 'Tokyo Contact - Business Hours Check',
      email: 'test.tokyo.hours@example.com',
      firstName: 'Hiroshi',
      lastName: 'Tanaka',
      location: 'Tokyo',
      sequence_step: 0,
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      expectedBehavior: tokyoHour >= 9 && tokyoHour < 17 ? '✅ SHOULD SEND - In business hours' : '❌ BLOCKED - Outside business hours'
    },
    {
      name: 'London Contact - Business Hours Check',
      email: 'test.london.hours@example.com',
      firstName: 'Oliver',
      lastName: 'Smith',
      location: 'London',
      sequence_step: 0,
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      expectedBehavior: londonHour >= 9 && londonHour < 17 ? '✅ SHOULD SEND - In business hours' : '❌ BLOCKED - Outside business hours'
    },
    {
      name: 'Sydney Contact - Business Hours Check',
      email: 'test.sydney.hours@example.com',
      firstName: 'Emma',
      lastName: 'Wilson',
      location: 'Sydney',
      sequence_step: 0,
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      expectedBehavior: sydneyHour >= 9 && sydneyHour < 17 ? '✅ SHOULD SEND - In business hours' : '❌ BLOCKED - Outside business hours'
    },
    
    // SEQUENCE TIMING TESTS - Ready for next steps
    {
      name: 'Step 2 Ready - 3+ Days After Step 1',
      email: 'test.step2.ready@example.com',
      firstName: 'Michael',
      lastName: 'Progress',
      location: 'Chicago',
      sequence_step: 1,
      last_sent_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // Last sent 4 days ago
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // Created 10 days ago
      expectedBehavior: '✅ SHOULD SEND - Step 2 (3+ days after Step 1)'
    },
    {
      name: 'Step 2 Not Ready - Only 1 Day After Step 1',
      email: 'test.step2.notready@example.com',
      firstName: 'Jessica',
      lastName: 'Waiting',
      location: 'Boston',
      sequence_step: 1,
      last_sent_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Last sent 1 day ago
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Created 7 days ago
      expectedBehavior: '❌ NOT READY - Only 1 day since Step 1 (need 3 days)'
    },
    {
      name: 'Step 3 Ready - 3+ Days After Step 2',
      email: 'test.step3.ready@example.com',
      firstName: 'Robert',
      lastName: 'Advanced',
      location: 'Seattle',
      sequence_step: 2,
      last_sent_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // Last sent 5 days ago
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // Created 15 days ago
      expectedBehavior: '✅ SHOULD SEND - Step 3 (3+ days after Step 2)'
    },
    {
      name: 'Step 4 Ready - 7+ Days After Step 3',
      email: 'test.step4.ready@example.com',
      firstName: 'Diana',
      lastName: 'Complete',
      location: 'Miami',
      sequence_step: 3,
      last_sent_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // Last sent 8 days ago
      created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // Created 20 days ago
      expectedBehavior: '✅ SHOULD SEND - Step 4 (7+ days after Step 3)'
    },
    {
      name: 'Step 4 Not Ready - Only 5 Days After Step 3',
      email: 'test.step4.notready@example.com',
      firstName: 'Thomas',
      lastName: 'Almost',
      location: 'Denver',
      sequence_step: 3,
      last_sent_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // Last sent 5 days ago
      created_at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000), // Created 18 days ago
      expectedBehavior: '❌ NOT READY - Only 5 days since Step 3 (need 7 days)'
    },
    
    // EDGE CASES
    {
      name: 'Invalid Location - Should Use Default',
      email: 'test.invalid.location@example.com',
      firstName: 'Test',
      lastName: 'Invalid',
      location: 'InvalidLocation',
      sequence_step: 0,
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      expectedBehavior: '✅ SHOULD SEND - Invalid location, use default timezone'
    },
    {
      name: 'Completed Sequence - Step 5',
      email: 'test.completed.sequence@example.com',
      firstName: 'Complete',
      lastName: 'Done',
      location: 'Los Angeles',
      sequence_step: 5, // Beyond last step
      last_sent_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // Last sent 10 days ago
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Created 30 days ago
      expectedBehavior: '❌ COMPLETED - Already finished all 4 steps'
    }
  ];
  
  for (const scenario of testScenarios) {
    try {
      // Create prospect
      const prospectData = {
        email_address: scenario.email,
        first_name: scenario.firstName,
        last_name: scenario.lastName,
        company: 'Test Automation Inc',
        title: 'Test Contact',
        location: scenario.location,
        source: 'test_automation',
        campaign_id: TEST_CAMPAIGN_ID,
        created_at: scenario.created_at.toISOString(),
        sequence_step: scenario.sequence_step || 0,
        linkedin_url: `https://linkedin.com/in/${scenario.firstName.toLowerCase()}-${scenario.lastName.toLowerCase()}`
      };
      
      // Add last_sent_at if provided
      if (scenario.last_sent_at) {
        prospectData.last_sent_at = scenario.last_sent_at.toISOString();
      }
      
      const { data: prospect, error: prospectError } = await supabase
        .from('prospects')
        .insert(prospectData)
        .select()
        .single();
      
      if (prospectError) {
        console.error(`❌ Error creating ${scenario.name}:`, prospectError);
        continue;
      }
      
      console.log(`✅ Created: ${scenario.name}`);
      console.log(`   Email: ${scenario.email}`);
      console.log(`   Location: ${scenario.location}`);
      console.log(`   Sequence Step: ${scenario.sequence_step}`);
      if (scenario.last_sent_at) {
        const daysSinceSent = Math.floor((now - new Date(scenario.last_sent_at)) / (24 * 60 * 60 * 1000));
        console.log(`   Last Sent: ${daysSinceSent} days ago`);
      }
      console.log(`   Expected: ${scenario.expectedBehavior}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Unexpected error for ${scenario.name}:`, error);
    }
  }
}

async function verifyTestContacts() {
  console.log('\n📊 Verifying test contacts...\n');
  
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('campaign_id', TEST_CAMPAIGN_ID)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching test contacts:', error);
    return;
  }
  
  console.log(`Total test contacts created: ${prospects.length}`);
  
  const now = new Date();
  let readyToSend = 0;
  let notReady = 0;
  let completed = 0;
  
  // Check sequence timing for each contact
  prospects.forEach(prospect => {
    if (prospect.sequence_step === 0) {
      // Step 1 is immediate
      readyToSend++;
    } else if (prospect.sequence_step >= 5) {
      // Completed sequence
      completed++;
    } else if (prospect.last_sent_at) {
      const daysSinceSent = (now - new Date(prospect.last_sent_at)) / (24 * 60 * 60 * 1000);
      const requiredDays = prospect.sequence_step === 3 ? 7 : 3;
      
      if (daysSinceSent >= requiredDays) {
        readyToSend++;
      } else {
        notReady++;
      }
    }
  });
  
  console.log(`✅ Ready to send: ${readyToSend}`);
  console.log(`⏰ Not ready yet: ${notReady}`);
  console.log(`🏁 Completed sequence: ${completed}`);
  console.log('\n🎯 Test contacts are ready for automation testing!');
  console.log('\nThe automation should check:');
  console.log('1. email_date < today condition (sequence timing)');
  console.log('2. Business hours for contact timezone');
  console.log('3. Proper sequence step progression');
}

async function main() {
  console.log('🚀 Setting up test contacts for automation testing\n');
  console.log('Campaign ID:', TEST_CAMPAIGN_ID);
  console.log('Current time:', new Date().toISOString());
  console.log('═'.repeat(60));
  
  try {
    await deleteExistingContacts();
    await createTestContacts();
    await verifyTestContacts();
    
    console.log('\n✨ Setup complete! Ready for automation testing.');
    console.log('\nNext steps:');
    console.log('1. Trigger the GitHub automation workflow');
    console.log('2. Monitor the sequence processing from the frontend');
    console.log('3. Verify that only contacts meeting the timing conditions are processed');
    console.log('4. Check that timezone-based business hours are respected');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();