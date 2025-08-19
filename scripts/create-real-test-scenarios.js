#!/usr/bin/env node

/**
 * Create REAL Test Scenarios for Automation
 * 
 * Based on understanding the actual automation logic:
 * - Uses contact creation date + sequence timing (NOT manual sequence_time)
 * - Calculates random business hours based on contact ID hash
 * - Only blocks Tokyo timezone outside 9-17 JST
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CAMPAIGN_ID = '695fcc7f-7674-4d1f-adf2-ff910ffdb853'

async function createRealTestScenarios() {
  const now = new Date()
  
  console.log('🎯 Creating REAL Test Scenarios for Email Automation')
  console.log('═'.repeat(80))
  console.log(`⏰ Current Time: ${now.toISOString()}`)
  console.log(`🌍 Current UTC Hour: ${now.getUTCHours()}:00`)
  
  // Calculate Tokyo time for reference
  const tokyoHour = (now.getUTCHours() + 9) % 24
  console.log(`🗾 Tokyo Time: ${tokyoHour}:00 JST (Business hours: ${tokyoHour >= 9 && tokyoHour < 17 ? '✅ YES' : '❌ NO'})`)
  console.log('')

  // Get campaign sequences to understand timing
  const { data: sequences } = await supabase
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('step_number')

  if (!sequences || sequences.length === 0) {
    console.error('❌ No campaign sequences found!')
    return
  }

  console.log('📋 Campaign Sequences:')
  sequences.forEach(seq => {
    console.log(`  Step ${seq.step_number}: "${seq.subject}" (${seq.timing_days} days)`)
  })
  console.log('')

  // Clean up existing test contacts
  console.log('🗑️  Cleaning up existing test contacts...')
  await supabase.from('prospects').delete().like('email_address', 'real.test.%@example.com')
  await supabase.from('contacts').delete().like('email', 'real.test.%@example.com')
  console.log('✅ Cleanup complete\n')

  const realScenarios = [
    // SCENARIO 1: Should send - created days ago, step 1 timing = 0 days
    {
      email: 'real.test.should.send.old@example.com',
      first_name: 'Should',
      last_name: 'SendOld',
      company: 'Old Contact Corp',
      location: 'New York', // Non-Tokyo = good timezone
      description: 'Created 5 days ago, Step 1 (0 days) → SHOULD SEND',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
    },

    // SCENARIO 2: Should send - created yesterday, step 1 timing = 0 days
    {
      email: 'real.test.should.send.recent@example.com',
      first_name: 'Should',
      last_name: 'SendRecent',
      company: 'Recent Contact Corp',
      location: 'Los Angeles', // Non-Tokyo = good timezone
      description: 'Created 1 day ago, Step 1 (0 days) → SHOULD SEND',
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    },

    // SCENARIO 3: Should NOT send - Tokyo timezone (outside business hours)
    {
      email: 'real.test.timezone.block@example.com',
      first_name: 'Timezone',
      last_name: 'Block',
      company: 'Tokyo Corp',
      location: 'Tokyo', // Tokyo = timezone check
      description: `Tokyo timezone (${tokyoHour}:00 JST) → ${tokyoHour >= 9 && tokyoHour < 17 ? 'SHOULD SEND' : 'SHOULD NOT SEND (timezone)'}`,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    },

    // SCENARIO 4: Should NOT send - created in future (impossible but tests edge case)
    {
      email: 'real.test.future.creation@example.com',
      first_name: 'Future',
      last_name: 'Creation',
      company: 'Time Travel Corp',
      location: 'San Francisco',
      description: 'Created 1 hour in future → SHOULD NOT SEND (not due)',
      created_at: new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString() // 1 hour future
    },

    // SCENARIO 5: Mid-sequence - create with progression records
    {
      email: 'real.test.midsequence.due@example.com',
      first_name: 'Mid',
      last_name: 'Sequence',
      company: 'Progress Corp',
      location: 'Chicago',
      description: 'Mid-sequence, last email 4 days ago, next step needs 3 days → SHOULD SEND',
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      sequence_step: 1, // Already sent 1 email
      last_sent_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString() // Last sent 4 days ago
    },

    // SCENARIO 6: Mid-sequence - NOT due yet
    {
      email: 'real.test.midsequence.notdue@example.com',
      first_name: 'Mid',
      last_name: 'NotDue',
      company: 'Wait Corp',
      location: 'Boston',
      description: 'Mid-sequence, last email 1 day ago, next step needs 3 days → SHOULD NOT SEND',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      sequence_step: 1, // Already sent 1 email
      last_sent_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() // Last sent 1 day ago (needs 3 days)
    },

    // SCENARIO 7: Status block - even if due
    {
      email: 'real.test.completed.status@example.com',
      first_name: 'Completed',
      last_name: 'Status',
      company: 'Done Corp',
      location: 'Miami',
      description: 'Completed status → SHOULD NOT SEND (status block)',
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      sequence_step: 2,
      last_sent_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Completed'
    },

    // SCENARIO 8: Just created - should send immediately (0 days timing)
    {
      email: 'real.test.just.created@example.com',
      first_name: 'Just',
      last_name: 'Created',
      company: 'New Corp',
      location: 'Seattle',
      description: 'Just created now, Step 1 (0 days) → SHOULD SEND',
      created_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString() // 10 minutes ago
    }
  ]

  console.log('📝 Creating real test scenarios...')
  console.log('─'.repeat(80))

  let successCount = 0
  let failCount = 0

  for (const scenario of realScenarios) {
    try {
      console.log(`\n📧 Creating: ${scenario.email}`)
      console.log(`   👤 Name: ${scenario.first_name} ${scenario.last_name}`)
      console.log(`   📍 Location: ${scenario.location}`)
      console.log(`   🕐 Created: ${scenario.created_at}`)
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

      // Create progression records if mid-sequence
      if (scenario.sequence_step && scenario.sequence_step > 0) {
        for (let i = 0; i < scenario.sequence_step && i < sequences.length; i++) {
          const sentDate = scenario.last_sent_at || scenario.created_at
          
          await supabase
            .from('prospect_sequence_progress')
            .insert({
              campaign_id: CAMPAIGN_ID,
              prospect_id: prospect.id,
              sequence_id: sequences[i].id,
              status: 'sent',
              sent_at: sentDate,
              created_at: sentDate,
              updated_at: sentDate
            })
        }
        console.log(`   📊 Created ${scenario.sequence_step} progression records`)
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
  console.log(`📧 Total: ${realScenarios.length} scenarios`)

  console.log('\n🎯 EXPECTED AUTOMATION BEHAVIOR (Based on Real Logic):')
  console.log('─'.repeat(80))
  console.log('✅ SHOULD SEND:')
  console.log('  - real.test.should.send.old@example.com (old creation + 0 days)')
  console.log('  - real.test.should.send.recent@example.com (recent creation + 0 days)')
  console.log('  - real.test.just.created@example.com (just created + 0 days)')
  if (tokyoHour >= 9 && tokyoHour < 17) {
    console.log('  - real.test.timezone.block@example.com (Tokyo in business hours)')
  }
  console.log('  - real.test.midsequence.due@example.com (last sent 4 days ago, needs 3)')
  
  console.log('\n❌ SHOULD NOT SEND:')
  console.log('  - real.test.future.creation@example.com (created in future)')
  console.log('  - real.test.midsequence.notdue@example.com (last sent 1 day ago, needs 3)')
  console.log('  - real.test.completed.status@example.com (completed status)')
  if (tokyoHour < 9 || tokyoHour >= 17) {
    console.log('  - real.test.timezone.block@example.com (Tokyo outside business hours)')
  }

  console.log('\n🚀 TEST WITH REAL LOGIC:')
  console.log('─'.repeat(80))
  console.log('1. Run automation: GitHub Actions → Email Automation Processor')
  console.log('2. Check detailed logs for exact timing calculations')
  console.log('3. Verify behavior matches real automation logic')

  return {
    success: successCount,
    failed: failCount,
    total: realScenarios.length
  }
}

// Run the script
createRealTestScenarios()
  .then((result) => {
    console.log(`\n✅ Script completed: ${result.success}/${result.total} real scenarios created`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })