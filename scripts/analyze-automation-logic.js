#!/usr/bin/env node

/**
 * Analyze Real Automation Logic
 * 
 * This script explains exactly how the automation timing works
 * and simulates what should happen for our test contacts
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CAMPAIGN_ID = '695fcc7f-7674-4d1f-adf2-ff910ffdb853'

async function analyzeAutomationLogic() {
  const now = new Date()
  
  console.log('🕵️ ANALYZING REAL AUTOMATION LOGIC')
  console.log('═'.repeat(80))
  console.log(`⏰ Analysis Time: ${now.toISOString()}`)
  console.log(`🌍 Current UTC Hour: ${now.getUTCHours()}:00`)
  console.log('')

  // Get campaign sequences
  const { data: sequences, error: seqError } = await supabase
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('step_number', { ascending: true })

  if (seqError || !sequences) {
    console.error('❌ Error fetching sequences:', seqError)
    return
  }

  console.log(`📋 CAMPAIGN SEQUENCES (${sequences.length} steps):`)
  console.log('─'.repeat(80))
  sequences.forEach(seq => {
    console.log(`Step ${seq.step_number}: "${seq.subject}"`)
    console.log(`  Timing: ${seq.timing_days} days after previous step`)
    console.log('')
  })

  // Get our test contacts
  const { data: contacts, error: contactError } = await supabase
    .from('prospects')
    .select('*')
    .like('email_address', 'precise.test.%@example.com')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('email_address')

  if (contactError || !contacts) {
    console.error('❌ Error fetching contacts:', contactError)
    return
  }

  console.log(`📧 ANALYZING ${contacts.length} TEST CONTACTS:`)
  console.log('═'.repeat(80))

  for (const contact of contacts) {
    console.log(`\n📧 ${contact.email_address}`)
    console.log(`   👤 ${contact.first_name} ${contact.last_name}`)
    console.log(`   📍 Location: ${contact.location}`)
    console.log(`   🕐 Created: ${contact.created_at}`)

    // Check progression records to see current step
    const { data: progression } = await supabase
      .from('prospect_sequence_progress')
      .select('*')
      .eq('prospect_id', contact.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })

    const currentStep = progression?.length || 0
    const lastSentAt = progression?.[0]?.sent_at || null
    
    console.log(`   📊 Current Step: ${currentStep} (${progression?.length || 0} emails sent)`)
    if (lastSentAt) {
      console.log(`   📤 Last Sent: ${lastSentAt}`)
    }

    // Calculate what the automation would do
    if (currentStep >= sequences.length) {
      console.log(`   ✅ SEQUENCE COMPLETE - No more emails to send`)
      continue
    }

    const nextSequence = sequences[currentStep]
    console.log(`   📝 Next Email: Step ${currentStep + 1} - "${nextSequence.subject}"`)
    console.log(`   ⏱️  Timing: ${nextSequence.timing_days} days after ${currentStep === 0 ? 'creation' : 'last email'}`)

    // Calculate scheduled date (automation logic)
    let scheduledDate
    if (currentStep === 0) {
      // First email: contact creation + timing_days
      scheduledDate = new Date(contact.created_at)
      scheduledDate.setDate(scheduledDate.getDate() + nextSequence.timing_days)
    } else if (lastSentAt) {
      // Subsequent emails: last sent + timing_days
      scheduledDate = new Date(lastSentAt)
      scheduledDate.setDate(scheduledDate.getDate() + nextSequence.timing_days)
    } else {
      console.log(`   ❌ Cannot calculate - no last sent date`)
      continue
    }

    // Add business hours (simulation of automation's hash logic)
    const contactHash = String(contact.id).split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0)
    }, 0)
    const seedValue = (contactHash + (currentStep + 1)) % 1000
    const hour = 9 + (seedValue % 8) // 9-16
    const minute = (seedValue * 7) % 60
    scheduledDate.setHours(hour, minute, 0, 0)

    console.log(`   🎯 Calculated Send Time: ${scheduledDate.toISOString()}`)

    // Check if due
    const isDue = scheduledDate <= now
    const timeDiff = Math.abs(now - scheduledDate) / (1000 * 60)
    console.log(`   ⏰ Is Due: ${isDue ? '✅ YES' : '❌ NO'} (${timeDiff.toFixed(0)} minutes ${isDue ? 'overdue' : 'remaining'})`)

    // Check timezone
    let skipForTimezone = false
    let timezoneReason = ''
    const currentHour = now.getUTCHours()
    
    if (contact.location && contact.location.includes('Tokyo')) {
      const tokyoHour = (currentHour + 9) % 24
      timezoneReason = `Tokyo timezone: ${tokyoHour}:00 JST (business hours: 9-17)`
      skipForTimezone = tokyoHour < 9 || tokyoHour >= 17
    } else {
      timezoneReason = `Location: ${contact.location || 'Unknown'} - assuming business hours OK`
    }
    
    console.log(`   🌍 Timezone: ${skipForTimezone ? '❌ BLOCKED' : '✅ OK'} (${timezoneReason})`)

    // Final decision
    const shouldSend = isDue && !skipForTimezone
    console.log(`   🎯 AUTOMATION DECISION: ${shouldSend ? '✅ SEND' : '❌ SKIP'}`)
    
    if (shouldSend) {
      console.log(`   📤 Would send: Step ${currentStep + 1} - "${nextSequence.subject}"`)
    } else {
      const reason = !isDue ? 'Not due yet' : 'Timezone blocked'
      console.log(`   ⏭️  Would skip: ${reason}`)
    }
  }

  console.log('\n═'.repeat(80))
  console.log('🧠 AUTOMATION LOGIC SUMMARY')
  console.log('═'.repeat(80))
  console.log('The automation IGNORES our manual sequence_time values!')
  console.log('Instead it calculates timing as:')
  console.log('')
  console.log('1️⃣  First Email (Step 1):')
  console.log('   📅 Base Date = contact.created_at + sequence.timing_days')
  console.log('   🕐 Time = random business hour (9-16) based on contact ID hash')
  console.log('')
  console.log('2️⃣  Subsequent Emails:')
  console.log('   📅 Base Date = last_sent_at + sequence.timing_days')
  console.log('   🕐 Time = random business hour (9-16) based on contact ID hash')
  console.log('')
  console.log('3️⃣  Timezone Check:')
  console.log('   🌏 Tokyo contacts: blocked if current Tokyo time outside 9-17')
  console.log('   🌍 Other locations: assumed to be in good timezone')
  console.log('')
  console.log('4️⃣  Decision:')
  console.log('   ✅ SEND if: calculated_time <= now AND timezone_ok')
  console.log('   ❌ SKIP if: calculated_time > now OR timezone_blocked')

  console.log('\n💡 This explains why our "future" and "not due" contacts were sent!')
  console.log('   The automation calculated they were due based on creation date + timing.')
}

// Run analysis
analyzeAutomationLogic()
  .then(() => {
    console.log('\n✅ Analysis complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Analysis failed:', error)
    process.exit(1)
  })