#!/usr/bin/env node

/**
 * Verify Production Test Contacts
 * Shows current state and automation predictions
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CAMPAIGN_ID = '695fcc7f-7674-4d1f-adf2-ff910ffdb853'

async function verifyProductionContacts() {
  const now = new Date()
  
  console.log('🔍 VERIFYING PRODUCTION TEST CONTACTS')
  console.log('═'.repeat(80))
  console.log(`⏰ Current Time: ${now.toISOString()}`)
  console.log(`🌍 Current UTC Hour: ${now.getUTCHours()}:00`)
  
  const tokyoHour = (now.getUTCHours() + 9) % 24
  console.log(`🗾 Tokyo Time: ${tokyoHour}:00 JST`)
  console.log('')

  // Get campaign sequences
  const { data: sequences } = await supabase
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('step_number')

  // Get all automation test contacts
  const { data: contacts } = await supabase
    .from('prospects')
    .select('*')
    .like('email_address', 'automation.test.%@example.com')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('created_at')

  if (!contacts || contacts.length === 0) {
    console.log('❌ No automation test contacts found!')
    return
  }

  console.log(`📧 Found ${contacts.length} automation test contacts`)
  console.log('')

  const categories = {
    shouldSend: [],
    shouldNotSend: []
  }

  for (const contact of contacts) {
    console.log(`📧 ${contact.email_address}`)
    console.log(`   👤 ${contact.first_name} ${contact.last_name}`)
    console.log(`   🏢 ${contact.company}`)
    console.log(`   📍 ${contact.location}`)
    console.log(`   🕐 Created: ${contact.created_at}`)

    // Check progression to determine current step
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
      const timeSinceLastSent = (now - new Date(lastSentAt)) / (1000 * 60 * 60 * 24)
      console.log(`   📤 Last Sent: ${lastSentAt} (${timeSinceLastSent.toFixed(1)} days ago)`)
    }

    // Simulate automation logic
    if (currentStep >= sequences.length) {
      console.log(`   ✅ SEQUENCE COMPLETE`)
      continue
    }

    const nextSequence = sequences[currentStep]
    console.log(`   📝 Next: Step ${currentStep + 1} - "${nextSequence.subject}" (${nextSequence.timing_days} days)`)

    // Calculate scheduled date
    let scheduledDate
    if (currentStep === 0) {
      scheduledDate = new Date(contact.created_at)
      scheduledDate.setDate(scheduledDate.getDate() + nextSequence.timing_days)
    } else if (lastSentAt) {
      scheduledDate = new Date(lastSentAt)
      scheduledDate.setDate(scheduledDate.getDate() + nextSequence.timing_days)
    } else {
      console.log(`   ❌ Cannot calculate timing`)
      continue
    }

    // Add business hours simulation
    const contactHash = String(contact.id).split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0)
    }, 0)
    const seedValue = (contactHash + (currentStep + 1)) % 1000
    const hour = 9 + (seedValue % 8)
    const minute = (seedValue * 7) % 60
    scheduledDate.setHours(hour, minute, 0, 0)

    const isDue = scheduledDate <= now
    const timeDiff = Math.abs(now - scheduledDate) / (1000 * 60)
    
    console.log(`   ⏰ Scheduled: ${scheduledDate.toISOString()}`)
    console.log(`   🎯 Due: ${isDue ? '✅ YES' : '❌ NO'} (${timeDiff.toFixed(0)} minutes ${isDue ? 'overdue' : 'remaining'})`)

    // Check timezone
    let timezoneBlocked = false
    if (contact.location && contact.location.includes('Tokyo')) {
      timezoneBlocked = tokyoHour < 9 || tokyoHour >= 17
      console.log(`   🌏 Timezone: ${timezoneBlocked ? '❌ BLOCKED' : '✅ OK'} (Tokyo ${tokyoHour}:00 JST, business: 9-17)`)
    } else {
      console.log(`   🌍 Timezone: ✅ OK (${contact.location}, non-Tokyo)`)
    }

    // Final decision
    const shouldSend = isDue && !timezoneBlocked
    console.log(`   🎯 PREDICTION: ${shouldSend ? '✅ WILL SEND' : '❌ WILL SKIP'}`)
    
    if (shouldSend) {
      categories.shouldSend.push({
        email: contact.email_address,
        name: `${contact.first_name} ${contact.last_name}`,
        step: currentStep + 1,
        reason: 'Due + timezone OK'
      })
    } else {
      const reason = !isDue ? 'Not due yet' : 'Timezone blocked'
      categories.shouldNotSend.push({
        email: contact.email_address,
        name: `${contact.first_name} ${contact.last_name}`,
        step: currentStep + 1,
        reason
      })
    }
    
    console.log('')
  }

  // Summary
  console.log('═'.repeat(80))
  console.log('📊 AUTOMATION PREDICTIONS')
  console.log('═'.repeat(80))
  
  console.log(`\n✅ WILL SEND (${categories.shouldSend.length} contacts):`)
  categories.shouldSend.forEach(c => {
    console.log(`   📧 ${c.email} - Step ${c.step}`)
    console.log(`      ${c.name} - ${c.reason}`)
  })

  console.log(`\n❌ WILL SKIP (${categories.shouldNotSend.length} contacts):`)
  categories.shouldNotSend.forEach(c => {
    console.log(`   📧 ${c.email} - Step ${c.step}`)
    console.log(`      ${c.name} - ${c.reason}`)
  })

  console.log('\n🎯 QUICK SUMMARY:')
  console.log(`   Expected to send: ${categories.shouldSend.length} emails`)
  console.log(`   Expected to skip: ${categories.shouldNotSend.length} emails`)
  console.log(`   Total contacts: ${contacts.length}`)

  console.log('\n🚀 READY TO TEST:')
  console.log('   Run GitHub Action → Email Automation Processor → Run workflow')
  console.log('   Compare actual results with these predictions!')

  return {
    total: contacts.length,
    willSend: categories.shouldSend.length,
    willSkip: categories.shouldNotSend.length
  }
}

// Run verification
verifyProductionContacts()
  .then((result) => {
    console.log(`\n✅ Verification complete: ${result.willSend} sends, ${result.willSkip} skips out of ${result.total} total`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error)
    process.exit(1)
  })