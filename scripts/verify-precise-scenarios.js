#!/usr/bin/env node

/**
 * Verify Precise Test Scenarios
 * Shows exactly which contacts should/shouldn't receive emails and why
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CAMPAIGN_ID = '695fcc7f-7674-4d1f-adf2-ff910ffdb853'

async function verifyPreciseScenarios() {
  const now = new Date()
  
  console.log('🔍 VERIFYING PRECISE TEST SCENARIOS')
  console.log('═'.repeat(80))
  console.log(`⏰ Current Time: ${now.toISOString()}`)
  console.log(`🌍 Current UTC Hour: ${now.getUTCHours()}:00`)
  console.log('')

  // Get all precise test contacts
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .like('email_address', 'precise.test.%@example.com')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('email_address')

  if (error) {
    console.error('❌ Error fetching prospects:', error)
    return
  }

  if (!prospects || prospects.length === 0) {
    console.log('⚠️  No precise test contacts found. Run create-precise-test-scenarios.js first.')
    return
  }

  console.log(`📧 Found ${prospects.length} precise test contacts`)
  console.log('')

  // Check campaign status
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', CAMPAIGN_ID)
    .single()

  if (!campaign) {
    console.error('❌ Campaign not found!')
    return
  }

  console.log(`📋 Campaign: ${campaign.name} (Status: ${campaign.status})`)
  console.log('')

  // Get campaign sequences
  const { data: sequences } = await supabase
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('step_number')

  if (!sequences || sequences.length === 0) {
    console.error('❌ No campaign sequences found!')
    return
  }

  console.log(`📝 Campaign has ${sequences.length} sequences`)
  console.log('')

  // Analyze each contact
  const categories = {
    shouldSend: [],
    shouldNotSend: []
  }

  for (const prospect of prospects) {
    console.log(`📧 ${prospect.email_address}`)
    console.log(`   👤 ${prospect.first_name} ${prospect.last_name}`)
    console.log(`   📍 Location: ${prospect.location}`)
    console.log(`   📊 Status: ${prospect.status}`)
    console.log(`   🔢 Current Step: ${prospect.current_step || 0}`)
    console.log(`   🕐 Created: ${prospect.created_at}`)

    // Calculate sequence timing
    let actualSequenceTime = null
    let currentStep = prospect.current_step || 0

    if (currentStep === 0) {
      // First email: based on creation + first sequence timing
      const firstSequence = sequences[0]
      if (firstSequence) {
        actualSequenceTime = new Date(prospect.created_at)
        actualSequenceTime.setDate(actualSequenceTime.getDate() + (firstSequence.timing_days || 0))
      }
    } else {
      // Subsequent emails: based on last sent + next sequence timing
      const { data: lastProgress } = await supabase
        .from('prospect_sequence_progress')
        .select('*')
        .eq('prospect_id', prospect.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)

      if (lastProgress && lastProgress.length > 0) {
        const nextSequence = sequences[currentStep]
        if (nextSequence) {
          actualSequenceTime = new Date(lastProgress[0].sent_at)
          actualSequenceTime.setDate(actualSequenceTime.getDate() + (nextSequence.timing_days || 0))
        }
      }
    }

    if (actualSequenceTime) {
      console.log(`   ⏰ Calculated Sequence Time: ${actualSequenceTime.toISOString()}`)
      
      const isDue = actualSequenceTime <= now
      const timeDiff = Math.abs(now - actualSequenceTime) / (1000 * 60)
      
      console.log(`   🎯 Is Due: ${isDue ? '✅ YES' : '❌ NO'} (${timeDiff.toFixed(0)} minutes ${isDue ? 'overdue' : 'remaining'})`)
    } else {
      console.log(`   ❌ Could not calculate sequence time`)
    }

    // Check business hours for location
    let inBusinessHours = false
    let timezoneInfo = ''
    
    try {
      if (prospect.location === 'Tokyo') {
        const tokyoTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}))
        const tokyoHour = tokyoTime.getHours()
        inBusinessHours = tokyoHour >= 9 && tokyoHour < 17
        timezoneInfo = `Tokyo ${tokyoHour}:00 JST`
      } else {
        // Default to NY/US Eastern
        const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
        const nyHour = nyTime.getHours()
        inBusinessHours = nyHour >= 9 && nyHour < 17
        timezoneInfo = `US Eastern ${nyHour}:00 EST`
      }
    } catch (e) {
      console.log(`   ⚠️  Timezone calculation error: ${e.message}`)
    }

    console.log(`   🕘 Business Hours: ${inBusinessHours ? '✅ YES' : '❌ NO'} (${timezoneInfo})`)

    // Determine if should send
    let shouldSend = false
    let reason = ''

    if (['Completed', 'Replied', 'Unsubscribed', 'Bounced'].includes(prospect.status)) {
      reason = `Status is ${prospect.status} - BLOCKED`
    } else if (campaign.status !== 'Active') {
      reason = `Campaign is ${campaign.status} - BLOCKED`
    } else if (!actualSequenceTime) {
      reason = 'Cannot calculate sequence time - ERROR'
    } else if (actualSequenceTime > now) {
      reason = 'Not due yet - SKIP'
    } else if (!inBusinessHours) {
      reason = 'Outside business hours - SKIP'
    } else {
      reason = 'Due + Business hours - SEND'
      shouldSend = true
    }

    console.log(`   🎯 Decision: ${shouldSend ? '✅ SHOULD SEND' : '❌ SHOULD NOT SEND'}`)
    console.log(`   📝 Reason: ${reason}`)
    console.log('')

    if (shouldSend) {
      categories.shouldSend.push({
        email: prospect.email_address,
        name: `${prospect.first_name} ${prospect.last_name}`,
        reason
      })
    } else {
      categories.shouldNotSend.push({
        email: prospect.email_address,
        name: `${prospect.first_name} ${prospect.last_name}`,
        reason
      })
    }
  }

  // Summary
  console.log('═'.repeat(80))
  console.log('📊 AUTOMATION PREDICTION SUMMARY')
  console.log('═'.repeat(80))
  
  console.log(`\n✅ CONTACTS THAT SHOULD RECEIVE EMAILS (${categories.shouldSend.length}):`)
  if (categories.shouldSend.length === 0) {
    console.log('   None')
  } else {
    categories.shouldSend.forEach(c => {
      console.log(`   📧 ${c.email} - ${c.name}`)
      console.log(`      Reason: ${c.reason}`)
    })
  }

  console.log(`\n❌ CONTACTS THAT SHOULD NOT RECEIVE EMAILS (${categories.shouldNotSend.length}):`)
  if (categories.shouldNotSend.length === 0) {
    console.log('   None')
  } else {
    categories.shouldNotSend.forEach(c => {
      console.log(`   📧 ${c.email} - ${c.name}`)
      console.log(`      Reason: ${c.reason}`)
    })
  }

  console.log('\n🚀 TEST THE AUTOMATION:')
  console.log('─'.repeat(80))
  console.log('1. GitHub Actions → Email Automation Processor → Run workflow')
  console.log('2. Check logs to verify predictions match actual behavior')
  console.log('3. Look for detailed logging showing WHY each contact was processed/skipped')

  return {
    shouldSend: categories.shouldSend.length,
    shouldNotSend: categories.shouldNotSend.length,
    total: prospects.length
  }
}

// Run verification
verifyPreciseScenarios()
  .then((result) => {
    console.log(`\n✅ Verification complete: ${result.shouldSend} should send, ${result.shouldNotSend} should not send`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error)
    process.exit(1)
  })