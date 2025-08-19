#!/usr/bin/env node

/**
 * Create Production Test Contacts for Automation
 * 
 * Creates realistic test contacts to demonstrate automation behavior
 * with various timing scenarios and edge cases
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CAMPAIGN_ID = '695fcc7f-7674-4d1f-adf2-ff910ffdb853'

async function createProductionTestContacts() {
  const now = new Date()
  
  console.log('🎯 Creating Production Test Contacts for Automation')
  console.log('═'.repeat(80))
  console.log(`⏰ Current Time: ${now.toISOString()}`)
  console.log(`🌍 Current UTC Hour: ${now.getUTCHours()}:00`)
  
  // Calculate Tokyo time for reference
  const tokyoHour = (now.getUTCHours() + 9) % 24
  console.log(`🗾 Tokyo Time: ${tokyoHour}:00 JST (Business hours: ${tokyoHour >= 9 && tokyoHour < 17 ? '✅ YES' : '❌ NO'})`)
  console.log('')

  // Clean up existing automation test contacts
  console.log('🗑️  Cleaning up existing automation test contacts...')
  await supabase.from('prospects').delete().like('email_address', 'automation.test.%@example.com')
  console.log('✅ Cleanup complete\n')

  const testContacts = [
    // 🚀 IMMEDIATE SENDS - Should send right away
    {
      email: 'automation.test.immediate.send@example.com',
      first_name: 'John',
      last_name: 'Immediate',
      company: 'Quick Start Corp',
      title: 'CEO',
      location: 'New York',
      description: 'Should send immediately (Step 1, 0 days timing)',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      linkedin_url: 'https://linkedin.com/in/john-immediate'
    },

    {
      email: 'automation.test.fresh.lead@example.com',
      first_name: 'Sarah',
      last_name: 'Fresh',
      company: 'New Business Inc',
      title: 'Marketing Director', 
      location: 'San Francisco',
      description: 'Fresh lead, should send Step 1 immediately',
      created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      linkedin_url: 'https://linkedin.com/in/sarah-fresh'
    },

    // ⏰ TIMEZONE TESTS - Tokyo contacts
    {
      email: 'automation.test.tokyo.blocked@example.com',
      first_name: 'Hiroshi',
      last_name: 'Tanaka',
      company: 'Tokyo Tech Solutions',
      title: 'CTO',
      location: 'Tokyo',
      description: `Tokyo contact - ${tokyoHour >= 9 && tokyoHour < 17 ? 'should send (business hours)' : 'should be blocked (outside hours)'}`,
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      linkedin_url: 'https://linkedin.com/in/hiroshi-tanaka'
    },

    {
      email: 'automation.test.tokyo.fresh@example.com',
      first_name: 'Yuki',
      last_name: 'Sato',
      company: 'Japan Innovation Ltd',
      title: 'Product Manager',
      location: 'Tokyo',
      description: `Fresh Tokyo contact - ${tokyoHour >= 9 && tokyoHour < 17 ? 'should send (business hours)' : 'should be blocked (outside hours)'}`,
      created_at: new Date(now.getTime() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
      linkedin_url: 'https://linkedin.com/in/yuki-sato'
    },

    // 📈 MID-SEQUENCE CONTACTS - Already in progress
    {
      email: 'automation.test.midsequence.ready@example.com',
      first_name: 'Michael',
      last_name: 'Progress',
      company: 'Growth Analytics',
      title: 'VP Sales',
      location: 'Chicago',
      description: 'Mid-sequence contact, ready for Step 2 (3 days after Step 1)',
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      sequence_step: 1,
      last_sent_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // Last sent 4 days ago
      linkedin_url: 'https://linkedin.com/in/michael-progress'
    },

    {
      email: 'automation.test.midsequence.waiting@example.com',
      first_name: 'Lisa',
      last_name: 'Waiting',
      company: 'Patience Partners',
      title: 'Head of Operations',
      location: 'Austin',
      description: 'Mid-sequence contact, waiting for Step 2 (needs 3 days, only 1 day passed)',
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      sequence_step: 1,
      last_sent_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Last sent 1 day ago
      linkedin_url: 'https://linkedin.com/in/lisa-waiting'
    },

    // 🎯 EDGE CASES
    {
      email: 'automation.test.very.old@example.com',
      first_name: 'Robert',
      last_name: 'Ancient',
      company: 'Legacy Systems Corp',
      title: 'Senior Engineer',
      location: 'Boston',
      description: 'Very old contact, should definitely be ready for Step 1',
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      linkedin_url: 'https://linkedin.com/in/robert-ancient'
    },

    {
      email: 'automation.test.brand.new@example.com',
      first_name: 'Emma',
      last_name: 'Brand',
      company: 'Startup Ventures',
      title: 'Founder',
      location: 'Seattle',
      description: 'Brand new contact, just created',
      created_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      linkedin_url: 'https://linkedin.com/in/emma-brand'
    },

    // 🌍 GEOGRAPHIC DIVERSITY
    {
      email: 'automation.test.london.contact@example.com',
      first_name: 'James',
      last_name: 'London',
      company: 'British Innovations',
      title: 'Managing Director',
      location: 'London',
      description: 'London contact, should send (non-Tokyo timezone)',
      created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      linkedin_url: 'https://linkedin.com/in/james-london'
    },

    {
      email: 'automation.test.sydney.contact@example.com',
      first_name: 'Sophie',
      last_name: 'Sydney',
      company: 'Aussie Tech Co',
      title: 'Chief Innovation Officer',
      location: 'Sydney',
      description: 'Sydney contact, should send (non-Tokyo timezone)',
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      linkedin_url: 'https://linkedin.com/in/sophie-sydney'
    },

    // 🏢 DIFFERENT COMPANY SIZES
    {
      email: 'automation.test.enterprise@example.com',
      first_name: 'David',
      last_name: 'Enterprise',
      company: 'Fortune 500 Giant',
      title: 'VP of Digital Transformation',
      location: 'Dallas',
      description: 'Enterprise contact, large company',
      created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      linkedin_url: 'https://linkedin.com/in/david-enterprise'
    },

    {
      email: 'automation.test.startup@example.com',
      first_name: 'Alex',
      last_name: 'Startup',
      company: 'Tiny Innovations',
      title: 'Co-Founder & CTO',
      location: 'Portland',
      description: 'Startup contact, small company',
      created_at: new Date(now.getTime() - 90 * 60 * 1000).toISOString(), // 90 minutes ago
      linkedin_url: 'https://linkedin.com/in/alex-startup'
    }
  ]

  console.log('📝 Creating production test contacts...')
  console.log('─'.repeat(80))

  let successCount = 0
  let failCount = 0

  for (const contact of testContacts) {
    try {
      console.log(`\n📧 Creating: ${contact.email}`)
      console.log(`   👤 ${contact.first_name} ${contact.last_name} - ${contact.title}`)
      console.log(`   🏢 ${contact.company}`)
      console.log(`   📍 ${contact.location}`)
      console.log(`   🕐 Created: ${contact.created_at}`)
      console.log(`   📝 ${contact.description}`)

      // Create prospect
      const { data: prospect, error: insertError } = await supabase
        .from('prospects')
        .insert({
          email_address: contact.email,
          first_name: contact.first_name,
          last_name: contact.last_name,
          company: contact.company,
          title: contact.title,
          location: contact.location,
          linkedin_url: contact.linkedin_url,
          campaign_id: CAMPAIGN_ID,
          created_at: contact.created_at,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.log(`   ❌ Failed: ${insertError.message}`)
        failCount++
        continue
      }

      // Create progression records for mid-sequence contacts
      if (contact.sequence_step && contact.sequence_step > 0) {
        // Get campaign sequences
        const { data: sequences } = await supabase
          .from('campaign_sequences')
          .select('*')
          .eq('campaign_id', CAMPAIGN_ID)
          .order('step_number')

        if (sequences && sequences.length > 0) {
          for (let i = 0; i < contact.sequence_step && i < sequences.length; i++) {
            const sentDate = contact.last_sent_at || contact.created_at
            
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
          console.log(`   📊 Created ${contact.sequence_step} progression records`)
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
  console.log(`📧 Total: ${testContacts.length} contacts`)

  console.log('\n🎯 EXPECTED AUTOMATION BEHAVIOR:')
  console.log('─'.repeat(80))
  console.log('✅ SHOULD SEND IMMEDIATELY:')
  console.log('  - automation.test.immediate.send@example.com (2 hours old)')
  console.log('  - automation.test.fresh.lead@example.com (30 min old)')
  console.log('  - automation.test.very.old@example.com (30 days old)')
  console.log('  - automation.test.brand.new@example.com (5 min old)')
  console.log('  - automation.test.london.contact@example.com (6 hours old)')
  console.log('  - automation.test.sydney.contact@example.com (3 hours old)')
  console.log('  - automation.test.enterprise@example.com (8 hours old)')
  console.log('  - automation.test.startup@example.com (90 min old)')
  console.log('  - automation.test.midsequence.ready@example.com (Step 2 due)')

  if (tokyoHour >= 9 && tokyoHour < 17) {
    console.log('  - automation.test.tokyo.blocked@example.com (Tokyo in business hours)')
    console.log('  - automation.test.tokyo.fresh@example.com (Tokyo in business hours)')
  }

  console.log('\n❌ SHOULD NOT SEND:')
  console.log('  - automation.test.midsequence.waiting@example.com (Step 2 not due yet)')
  
  if (tokyoHour < 9 || tokyoHour >= 17) {
    console.log('  - automation.test.tokyo.blocked@example.com (Tokyo outside business hours)')
    console.log('  - automation.test.tokyo.fresh@example.com (Tokyo outside business hours)')
  }

  console.log('\n🚀 TESTING INSTRUCTIONS:')
  console.log('─'.repeat(80))
  console.log('1. Run GitHub Action: Email Automation Processor → Run workflow')
  console.log('2. Check logs for detailed processing decisions')
  console.log('3. Expected results:')
  console.log(`   - Should send: ${tokyoHour >= 9 && tokyoHour < 17 ? '11' : '9'} emails`)
  console.log(`   - Should skip: ${tokyoHour >= 9 && tokyoHour < 17 ? '1' : '3'} emails`)
  console.log('4. Verify timing calculations and timezone handling')

  return {
    success: successCount,
    failed: failCount,
    total: testContacts.length,
    expected_sends: tokyoHour >= 9 && tokyoHour < 17 ? 11 : 9,
    expected_skips: tokyoHour >= 9 && tokyoHour < 17 ? 1 : 3
  }
}

// Run the script
createProductionTestContacts()
  .then((result) => {
    console.log(`\n✅ Production test contacts created: ${result.success}/${result.total}`)
    console.log(`🎯 Expected sends: ${result.expected_sends}, Expected skips: ${result.expected_skips}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })