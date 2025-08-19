#!/usr/bin/env node

/**
 * Test Scenarios Creator for Sequence Automation
 * 
 * Creates comprehensive test scenarios for automation timing:
 * - Business hours validation
 * - Timezone handling
 * - Sequence timing (sequence_time < now() vs > now())
 * - Multiple edge cases
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test campaign ID (you can change this to your actual campaign)
const TEST_CAMPAIGN_ID = '695fcc7f-7674-4d1f-adf2-ff910ffdb853'

/**
 * Test Scenarios Definition
 * 
 * Each scenario tests different timing conditions:
 * 1. sequence_time relation to now()
 * 2. Business hours status
 * 3. Timezone differences
 */
const TEST_SCENARIOS = [
  // SCENARIO 1: Inside business hours, sequence_time < now() (SHOULD SEND)
  {
    name: 'NY Morning - Due Now',
    email: 'test.ny.morning.due@example.com',
    first_name: 'John',
    last_name: 'Due-Morning',
    timezone: 'America/New_York',
    sequence_time_offset: -2, // 2 hours ago (due)
    expected_behavior: 'SHOULD SEND - Inside business hours (9-5 EST) and email is due',
    business_hours_check: 'Inside business hours in NY (assuming current time is 10 AM EST)',
    timing_check: 'sequence_time < now() ✓'
  },
  
  // SCENARIO 2: Outside business hours, sequence_time < now() (SHOULD NOT SEND)
  {
    name: 'Tokyo Night - Due but Outside Hours',
    email: 'test.tokyo.night.due@example.com',
    first_name: 'Akira',
    last_name: 'Due-Night',
    timezone: 'Asia/Tokyo',
    sequence_time_offset: -3, // 3 hours ago (due)
    expected_behavior: 'SHOULD NOT SEND - Outside business hours even though email is due',
    business_hours_check: 'Outside business hours in Tokyo (night time)',
    timing_check: 'sequence_time < now() ✓ but business hours ✗'
  },
  
  // SCENARIO 3: Inside business hours, sequence_time > now() (SHOULD NOT SEND)
  {
    name: 'London Afternoon - Not Due Yet',
    email: 'test.london.notdue@example.com',
    first_name: 'Oliver',
    last_name: 'NotDue-Afternoon',
    timezone: 'Europe/London',
    sequence_time_offset: 2, // 2 hours from now (not due)
    expected_behavior: 'SHOULD NOT SEND - Inside business hours but email not due yet',
    business_hours_check: 'Inside business hours in London (afternoon)',
    timing_check: 'sequence_time > now() ✗'
  },
  
  // SCENARIO 4: Edge case - Exactly at business hours start, due
  {
    name: 'Sydney Start of Day - Due',
    email: 'test.sydney.start.due@example.com',
    first_name: 'Emma',
    last_name: 'Due-StartDay',
    timezone: 'Australia/Sydney',
    sequence_time_offset: -1, // 1 hour ago (due)
    expected_behavior: 'SHOULD SEND - At start of business hours (9 AM) and due',
    business_hours_check: 'Exactly at 9 AM Sydney time',
    timing_check: 'sequence_time < now() ✓'
  },
  
  // SCENARIO 5: Edge case - End of business hours, due
  {
    name: 'LA End of Day - Due',
    email: 'test.la.endday.due@example.com',
    first_name: 'Michael',
    last_name: 'Due-EndDay',
    timezone: 'America/Los_Angeles',
    sequence_time_offset: -4, // 4 hours ago (due)
    expected_behavior: 'SHOULD SEND - At end of business hours (4:30 PM) and due',
    business_hours_check: 'Near end of business hours in LA (4:30 PM)',
    timing_check: 'sequence_time < now() ✓'
  },
  
  // SCENARIO 6: Weekend - Due but not business day
  {
    name: 'Chicago Weekend - Due',
    email: 'test.chicago.weekend.due@example.com',
    first_name: 'Sarah',
    last_name: 'Due-Weekend',
    timezone: 'America/Chicago',
    sequence_time_offset: -24, // 1 day ago (due)
    expected_behavior: 'DEPENDS ON WEEKEND RULES - Due but it\'s weekend',
    business_hours_check: 'Weekend check (Saturday/Sunday)',
    timing_check: 'sequence_time < now() ✓ but weekend'
  },
  
  // SCENARIO 7: Multiple sequences due - Priority test
  {
    name: 'Paris Multiple Due',
    email: 'test.paris.multiple.due@example.com',
    first_name: 'Pierre',
    last_name: 'Multiple-Due',
    timezone: 'Europe/Paris',
    sequence_time_offset: -5, // 5 hours ago (due)
    expected_behavior: 'SHOULD SEND - Has multiple sequences due, should process in order',
    business_hours_check: 'Inside business hours in Paris',
    timing_check: 'Multiple sequences with sequence_time < now()',
    multiple_sequences: true
  },
  
  // SCENARIO 8: Future sequence - Far in future
  {
    name: 'Berlin Future',
    email: 'test.berlin.future@example.com',
    first_name: 'Hans',
    last_name: 'Future-Sequence',
    timezone: 'Europe/Berlin',
    sequence_time_offset: 168, // 7 days from now
    expected_behavior: 'SHOULD NOT SEND - Sequence scheduled for next week',
    business_hours_check: 'Inside business hours but irrelevant',
    timing_check: 'sequence_time >> now() (7 days)'
  },
  
  // SCENARIO 9: Just became due - Edge timing
  {
    name: 'Dubai Just Due',
    email: 'test.dubai.justdue@example.com',
    first_name: 'Ahmed',
    last_name: 'JustDue',
    timezone: 'Asia/Dubai',
    sequence_time_offset: -0.05, // 3 minutes ago (just due)
    expected_behavior: 'SHOULD SEND - Just became due (3 minutes ago)',
    business_hours_check: 'Inside business hours in Dubai',
    timing_check: 'sequence_time just passed now()'
  },
  
  // SCENARIO 10: Invalid timezone - Fallback test
  {
    name: 'Invalid TZ - Due',
    email: 'test.invalid.tz.due@example.com',
    first_name: 'Test',
    last_name: 'InvalidTZ',
    timezone: 'Invalid/Timezone',
    sequence_time_offset: -2, // 2 hours ago (due)
    expected_behavior: 'SHOULD USE UTC FALLBACK - Invalid timezone should default to UTC',
    business_hours_check: 'Should use UTC business hours',
    timing_check: 'sequence_time < now() ✓ with UTC fallback'
  }
]

/**
 * Creates test contacts in the database
 */
async function createTestContacts() {
  console.log('🚀 Creating Test Scenarios for Sequence Automation')
  console.log('=' .repeat(60))
  console.log(`📧 Campaign ID: ${TEST_CAMPAIGN_ID}`)
  console.log(`📊 Total Scenarios: ${TEST_SCENARIOS.length}`)
  console.log('')
  
  const results = {
    created: [],
    failed: [],
    skipped: []
  }
  
  for (const scenario of TEST_SCENARIOS) {
    try {
      console.log(`\n📋 SCENARIO: ${scenario.name}`)
      console.log('  ' + '-'.repeat(56))
      
      // Check if contact already exists
      const { data: existing, error: checkError } = await supabase
        .from('prospects')
        .select('id, email_address')
        .eq('email_address', scenario.email)
        .single()
      
      if (existing) {
        console.log(`  ⚠️  Contact already exists: ${scenario.email}`)
        results.skipped.push(scenario.email)
        
        // Update the contact's test data
        const { error: updateError } = await supabase
          .from('prospects')
          .update({
            first_name: scenario.first_name,
            last_name: scenario.last_name,
            timezone: scenario.timezone,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        if (updateError) {
          console.log(`  ❌ Failed to update: ${updateError.message}`)
        } else {
          console.log(`  ✅ Updated existing contact`)
        }
        continue
      }
      
      // Create new prospect
      const { data: prospect, error: createError } = await supabase
        .from('prospects')
        .insert({
          email_address: scenario.email,
          first_name: scenario.first_name,
          last_name: scenario.last_name,
          timezone: scenario.timezone,
          company: 'Test Automation Inc',
          position: 'Test Contact',
          linkedin_url: `https://linkedin.com/in/${scenario.email.split('@')[0]}`,
          source: 'test_automation',
          campaign_id: TEST_CAMPAIGN_ID,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (createError) {
        console.log(`  ❌ Failed to create contact: ${createError.message}`)
        results.failed.push(scenario.email)
        continue
      }
      
      console.log(`  ✅ Created: ${scenario.email}`)
      
      // Calculate sequence_time based on offset
      const sequenceTime = new Date()
      sequenceTime.setHours(sequenceTime.getHours() + scenario.sequence_time_offset)
      
      // Create prospect_progression entry (if your system uses this)
      const { error: progressionError } = await supabase
        .from('prospect_progression')
        .insert({
          prospect_id: prospect.id,
          campaign_id: TEST_CAMPAIGN_ID,
          current_sequence_step: 1,
          sequence_time: sequenceTime.toISOString(),
          status: 'active',
          created_at: new Date().toISOString()
        })
      
      if (progressionError && !progressionError.message.includes('relation')) {
        console.log(`  ⚠️  Progression table issue: ${progressionError.message}`)
      }
      
      // Log scenario details
      console.log(`  📍 Timezone: ${scenario.timezone}`)
      console.log(`  ⏰ Sequence Time: ${sequenceTime.toISOString()}`)
      console.log(`  📝 Expected: ${scenario.expected_behavior}`)
      console.log(`  🕐 Business Hours: ${scenario.business_hours_check}`)
      console.log(`  ✓ Timing: ${scenario.timing_check}`)
      
      results.created.push({
        email: scenario.email,
        name: scenario.name,
        sequence_time: sequenceTime.toISOString()
      })
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
      results.failed.push(scenario.email)
    }
  }
  
  // Print summary
  console.log('\n' + '=' .repeat(60))
  console.log('📊 CREATION SUMMARY')
  console.log('=' .repeat(60))
  console.log(`✅ Created: ${results.created.length}`)
  console.log(`⚠️  Skipped: ${results.skipped.length}`)
  console.log(`❌ Failed: ${results.failed.length}`)
  
  if (results.created.length > 0) {
    console.log('\n📧 Created Contacts:')
    results.created.forEach(c => {
      console.log(`  - ${c.name}: ${c.email}`)
      console.log(`    Sequence Time: ${c.sequence_time}`)
    })
  }
  
  // Testing instructions
  console.log('\n' + '=' .repeat(60))
  console.log('🧪 TESTING INSTRUCTIONS')
  console.log('=' .repeat(60))
  console.log('\n1. Run automation to test scenarios:')
  console.log('   curl -u "admin:password" -X POST http://localhost:3000/api/campaigns/automation/send-emails')
  console.log('\n2. Check logs for each scenario:')
  console.log('   curl -u "admin:password" http://localhost:3000/api/automation/logs')
  console.log('\n3. Verify behavior matches expectations:')
  console.log('   - Contacts with sequence_time < now() AND in business hours → SENT')
  console.log('   - Contacts with sequence_time > now() → SKIPPED (not due)')
  console.log('   - Contacts outside business hours → SKIPPED (outside hours)')
  console.log('\n4. Test timezone calculations:')
  console.log('   curl -u "admin:password" http://localhost:3000/api/debug/test-timezone-hours')
  console.log('\n5. Force business hours for testing:')
  console.log('   curl -u "admin:password" -X POST http://localhost:3000/api/debug/simulate-business-hours')
  
  return results
}

/**
 * Additional test data generator for stress testing
 */
async function createBulkTestData(count = 50) {
  console.log(`\n🔄 Creating ${count} bulk test contacts...`)
  
  const timezones = [
    'America/New_York',
    'America/Los_Angeles', 
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]
  
  const bulkContacts = []
  
  for (let i = 1; i <= count; i++) {
    const tz = timezones[i % timezones.length]
    const offsetHours = (i % 48) - 24 // -24 to +24 hours
    
    const sequenceTime = new Date()
    sequenceTime.setHours(sequenceTime.getHours() + offsetHours)
    
    bulkContacts.push({
      email_address: `bulk.test.${i}@example.com`,
      first_name: `Test${i}`,
      last_name: `Bulk${Math.floor(i/10)}`,
      timezone: tz,
      company: 'Bulk Test Corp',
      position: 'Test Position',
      source: 'bulk_test',
      campaign_id: TEST_CAMPAIGN_ID,
      created_at: new Date().toISOString()
    })
  }
  
  // Insert in batches of 10
  for (let i = 0; i < bulkContacts.length; i += 10) {
    const batch = bulkContacts.slice(i, i + 10)
    const { error } = await supabase
      .from('prospects')
      .insert(batch)
    
    if (error) {
      console.log(`  ⚠️  Batch ${i/10 + 1} failed: ${error.message}`)
    } else {
      console.log(`  ✅ Batch ${i/10 + 1} created`)
    }
  }
  
  console.log(`✅ Bulk test data creation complete`)
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const includeBulk = args.includes('--bulk')
  const bulkCount = args.includes('--count') ? 
    parseInt(args[args.indexOf('--count') + 1]) : 50
  
  try {
    // Create main test scenarios
    await createTestContacts()
    
    // Optionally create bulk data
    if (includeBulk) {
      await createBulkTestData(bulkCount)
    }
    
    console.log('\n✨ Test scenario creation complete!')
    process.exit(0)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
main()