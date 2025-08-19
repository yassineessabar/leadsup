#!/usr/bin/env node

/**
 * Precise Test Scenarios for Email Automation
 * 
 * Creates exact test scenarios based on current time:
 * 1. Inside business hours + sequence_time < now() → SHOULD SEND
 * 2. Outside business hours + sequence_time < now() → SHOULD NOT SEND (timezone)
 * 3. Inside business hours + sequence_time > now() → SHOULD NOT SEND (not due)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CAMPAIGN_ID = '695fcc7f-7674-4d1f-adf2-ff910ffdb853'

async function createPreciseTestScenarios() {
  const now = new Date()
  console.log('🎯 Creating PRECISE Test Scenarios for Email Automation')
  console.log('═'.repeat(80))
  console.log(`⏰ Current Time: ${now.toISOString()}`)
  console.log(`📅 Current Date: ${now.toDateString()}`)
  console.log(`🌍 Current UTC Hour: ${now.getUTCHours()}:00`)
  console.log('')

  // Calculate timezone-specific times
  const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
  const tokyoTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}))
  
  console.log(`🗽 New York Time: ${nyTime.toLocaleString()} (Hour: ${nyTime.getHours()})`)
  console.log(`🗾 Tokyo Time: ${tokyoTime.toLocaleString()} (Hour: ${tokyoTime.getHours()})`)
  console.log('')

  // Check if we're in business hours for different zones
  const nyBusinessHours = nyTime.getHours() >= 9 && nyTime.getHours() < 17
  const tokyoBusinessHours = tokyoTime.getHours() >= 9 && tokyoTime.getHours() < 17
  
  console.log(`🕘 NY Business Hours (9-17): ${nyBusinessHours ? '✅ YES' : '❌ NO'}`)
  console.log(`🕘 Tokyo Business Hours (9-17): ${tokyoBusinessHours ? '✅ YES' : '❌ NO'}`)
  console.log('')

  // Clean up existing test contacts
  console.log('🗑️  Cleaning up existing test contacts...')
  await supabase.from('prospects').delete().like('email_address', 'precise.test.%@example.com')
  await supabase.from('contacts').delete().like('email', 'precise.test.%@example.com')
  console.log('✅ Cleanup complete\n')

  const testScenarios = [
    // SCENARIO 1: Inside business hours + sequence_time < now() → SHOULD SEND
    {
      email: 'precise.test.inside.due@example.com',
      first_name: 'Inside',
      last_name: 'Due',
      company: 'Should Send Corp',
      location: nyBusinessHours ? 'New York' : 'Los Angeles', // Use timezone in business hours
      description: `Inside business hours + sequence_time < now() → SHOULD SEND`,
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      sequence_step: 0,
      status: 'Active',
      // Set sequence_time to 2 hours ago (definitely due)
      sequence_time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    },

    // SCENARIO 2: Outside business hours + sequence_time < now() → SHOULD NOT SEND
    {
      email: 'precise.test.outside.due@example.com',
      first_name: 'Outside',
      last_name: 'Due',
      company: 'Timezone Block Corp',
      location: tokyoBusinessHours ? 'Los Angeles' : 'Tokyo', // Use timezone outside business hours
      description: `Outside business hours + sequence_time < now() → SHOULD NOT SEND (timezone)`,
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
      sequence_step: 0,
      status: 'Active',
      // Set sequence_time to 3 hours ago (due but blocked by timezone)
      sequence_time: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
    },

    // SCENARIO 3: Inside business hours + sequence_time > now() → SHOULD NOT SEND
    {
      email: 'precise.test.inside.notdue@example.com',
      first_name: 'Inside',
      last_name: 'NotDue',
      company: 'Future Email Corp',
      location: nyBusinessHours ? 'New York' : 'Los Angeles', // Use timezone in business hours
      description: `Inside business hours + sequence_time > now() → SHOULD NOT SEND (not due)`,
      created_at: new Date().toISOString(), // Just created
      sequence_step: 0,
      status: 'Active',
      // Set sequence_time to 2 hours in future (not due yet)
      sequence_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
    },

    // ADDITIONAL SCENARIOS for comprehensive testing

    // SCENARIO 4: Completed status (should not send regardless)
    {
      email: 'precise.test.completed@example.com',
      first_name: 'Completed',
      last_name: 'Contact',
      company: 'Done Corp',
      location: 'New York',
      description: `Completed status → SHOULD NOT SEND (status block)`,
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      sequence_step: 2,
      status: 'Completed',
      sequence_time: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString() // Due but status blocks
    },

    // SCENARIO 5: Edge case - Just became due (1 minute ago)
    {
      email: 'precise.test.just.due@example.com',
      first_name: 'Just',
      last_name: 'Due',
      company: 'Edge Case Corp',
      location: nyBusinessHours ? 'New York' : 'Los Angeles',
      description: `Just became due (1 min ago) + business hours → SHOULD SEND`,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      sequence_step: 0,
      status: 'Active',
      sequence_time: new Date(now.getTime() - 1 * 60 * 1000).toISOString() // 1 minute ago
    },

    // SCENARIO 6: Far future - 1 week ahead
    {
      email: 'precise.test.far.future@example.com',
      first_name: 'Far',
      last_name: 'Future',
      company: 'Next Week Corp',
      location: 'New York',
      description: `Far future (1 week) → SHOULD NOT SEND (way not due)`,
      created_at: new Date().toISOString(),
      sequence_step: 0,
      status: 'Active',
      sequence_time: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week future
    },

    // SCENARIO 7: Mid-sequence, next email due
    {
      email: 'precise.test.midsequence.due@example.com',
      first_name: 'Mid',
      last_name: 'Sequence',
      company: 'Progress Corp',
      location: nyBusinessHours ? 'New York' : 'Los Angeles',
      description: `Mid-sequence (step 2) + due → SHOULD SEND`,
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      sequence_step: 1, // Already sent 1 email
      status: 'Active',
      sequence_time: new Date(now.getTime() - 30 * 60 * 1000).toISOString() // 30 min ago
    },

    // SCENARIO 8: Replied status (should not send)
    {
      email: 'precise.test.replied@example.com',
      first_name: 'Replied',
      last_name: 'Contact',
      company: 'Response Corp',
      location: 'New York',
      description: `Replied status → SHOULD NOT SEND (replied block)`,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      sequence_step: 1,
      status: 'Replied',
      sequence_time: new Date(now.getTime() - 45 * 60 * 1000).toISOString() // Due but replied
    }
  ]

  console.log('📝 Creating test scenarios...')
  console.log('─'.repeat(80))

  let successCount = 0
  let failCount = 0

  for (const scenario of testScenarios) {
    try {
      console.log(`\n📧 Creating: ${scenario.email}`)
      console.log(`   👤 Name: ${scenario.first_name} ${scenario.last_name}`)
      console.log(`   📍 Location: ${scenario.location}`)
      console.log(`   📊 Status: ${scenario.status}`)
      console.log(`   🕐 Created: ${scenario.created_at}`)
      console.log(`   ⏰ Sequence Time: ${scenario.sequence_time}`)
      console.log(`   📝 Expected: ${scenario.description}`)

      // Create prospect
      const { data: prospect, error: insertError } = await supabase
        .from('prospects')
        .insert({
          email_address: scenario.email,
          first_name: scenario.first_name,
          last_name: scenario.last_name,
          company: scenario.company,
          location: scenario.location,
          campaign_id: CAMPAIGN_ID,
          created_at: scenario.created_at,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.log(`   ❌ Failed: ${insertError.message}`)
        failCount++
        continue
      }

      // If this is mid-sequence, create progression records
      if (scenario.sequence_step > 0) {
        // Get campaign sequences
        const { data: sequences } = await supabase
          .from('campaign_sequences')
          .select('*')
          .eq('campaign_id', CAMPAIGN_ID)
          .order('step_number', { ascending: true })

        if (sequences && sequences.length > 0) {
          for (let i = 0; i < scenario.sequence_step && i < sequences.length; i++) {
            const sentDate = new Date(scenario.created_at)
            sentDate.setDate(sentDate.getDate() + (i * 2)) // Space out by 2 days

            await supabase
              .from('prospect_sequence_progress')
              .insert({
                campaign_id: CAMPAIGN_ID,
                prospect_id: prospect.id,
                sequence_id: sequences[i].id,
                status: 'sent',
                sent_at: sentDate.toISOString(),
                created_at: sentDate.toISOString(),
                updated_at: sentDate.toISOString()
              })
          }
          console.log(`   📊 Created ${scenario.sequence_step} progression records`)
        }
      }

      console.log(`   ✅ Success`)
      successCount++

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
      failCount++
    }
  }

  console.log('\n' + '═'.repeat(80))
  console.log('📊 CREATION SUMMARY')
  console.log('═'.repeat(80))
  console.log(`✅ Created: ${successCount} contacts`)
  console.log(`❌ Failed: ${failCount} contacts`)
  console.log(`📧 Total: ${testScenarios.length} scenarios`)

  console.log('\n🎯 EXPECTED AUTOMATION BEHAVIOR:')
  console.log('─'.repeat(80))
  console.log('✅ SHOULD SEND:')
  console.log('  - precise.test.inside.due@example.com (inside hours + due)')
  console.log('  - precise.test.just.due@example.com (just became due)')
  console.log('  - precise.test.midsequence.due@example.com (mid-sequence + due)')
  
  console.log('\n❌ SHOULD NOT SEND:')
  console.log('  - precise.test.outside.due@example.com (outside hours)')
  console.log('  - precise.test.inside.notdue@example.com (not due yet)')
  console.log('  - precise.test.completed@example.com (completed status)')
  console.log('  - precise.test.far.future@example.com (far future)')
  console.log('  - precise.test.replied@example.com (replied status)')

  console.log('\n🚀 NEXT STEPS:')
  console.log('─'.repeat(80))
  console.log('1. Verify scenarios: node scripts/verify-precise-scenarios.js')
  console.log('2. Test automation: GitHub Actions → Email Automation Processor → Run workflow')
  console.log('3. Check logs for detailed reasoning')

  return {
    success: successCount,
    failed: failCount,
    total: testScenarios.length,
    scenarios: testScenarios
  }
}

// Run the script
createPreciseTestScenarios()
  .then((result) => {
    console.log(`\n✅ Script completed: ${result.success}/${result.total} scenarios created`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })