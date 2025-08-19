#!/usr/bin/env node

/**
 * Analyze Automation Logs and Processing Decisions
 * 
 * This script investigates why contacts were processed vs skipped
 * and compares actual behavior with our predictions
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CAMPAIGN_ID = '695fcc7f-7674-4d1f-adf2-ff910ffdb853'

async function analyzeAutomationLogs() {
  const now = new Date()
  
  console.log('🔍 ANALYZING AUTOMATION LOGS AND DECISIONS')
  console.log('═'.repeat(80))
  console.log(`⏰ Analysis Time: ${now.toISOString()}`)
  console.log(`🌍 Current UTC Hour: ${now.getUTCHours()}:00`)
  
  const tokyoHour = (now.getUTCHours() + 9) % 24
  console.log(`🗾 Tokyo Time: ${tokyoHour}:00 JST`)
  console.log('')

  // Get all test contacts that were likely processed
  const { data: allTestContacts } = await supabase
    .from('prospects')
    .select('*')
    .or('email_address.like.automation.test.%@example.com,email_address.like.precise.test.%@example.com,email_address.like.real.test.%@example.com')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('created_at')

  if (!allTestContacts || allTestContacts.length === 0) {
    console.log('❌ No test contacts found!')
    return
  }

  console.log(`📧 Found ${allTestContacts.length} test contacts to analyze`)
  console.log('')

  // Get campaign sequences
  const { data: sequences } = await supabase
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('step_number')

  if (!sequences) {
    console.log('❌ No sequences found!')
    return
  }

  // Get recent email tracking/progression records to see what was actually sent
  const { data: recentProgress } = await supabase
    .from('prospect_sequence_progress')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .gte('sent_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
    .order('sent_at', { ascending: false })

  const { data: recentTracking } = await supabase
    .from('email_tracking')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .gte('sent_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
    .order('sent_at', { ascending: false })

  console.log(`📊 Recent Activity (last 2 hours):`)
  console.log(`   📤 Progression records: ${recentProgress?.length || 0}`)
  console.log(`   📋 Tracking records: ${recentTracking?.length || 0}`)
  console.log('')

  // Analyze each contact's processing decision
  let analyzedContacts = []
  let tokyoContacts = []
  let shouldHaveBeenSkipped = []

  for (const contact of allTestContacts) {
    console.log(`📧 ANALYZING: ${contact.email_address}`)
    console.log(`   👤 ${contact.first_name} ${contact.last_name}`)
    console.log(`   📍 Location: "${contact.location}"`)
    console.log(`   🕐 Created: ${contact.created_at}`)

    // Check current progression
    const { data: allProgress } = await supabase
      .from('prospect_sequence_progress')
      .select('*')
      .eq('prospect_id', contact.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })

    const currentStep = allProgress?.length || 0
    const lastSentAt = allProgress?.[0]?.sent_at || null
    const wasRecentlySent = recentProgress?.some(p => p.prospect_id === contact.id)

    console.log(`   📊 Total emails sent: ${currentStep}`)
    console.log(`   📤 Last sent: ${lastSentAt || 'Never'}`)
    console.log(`   🚀 Recently processed: ${wasRecentlySent ? '✅ YES' : '❌ NO'}`)

    // Analyze why it was/wasn't processed
    if (currentStep >= sequences.length) {
      console.log(`   ✅ SEQUENCE COMPLETE (${currentStep}/${sequences.length})`)
      console.log('')
      continue
    }

    const nextSequence = sequences[currentStep]
    console.log(`   📝 Next sequence: Step ${currentStep + 1} - "${nextSequence.subject}" (${nextSequence.timing_days} days)`)

    // Calculate timing (simulate automation logic)
    let scheduledDate
    if (currentStep === 0) {
      scheduledDate = new Date(contact.created_at)
      scheduledDate.setDate(scheduledDate.getDate() + nextSequence.timing_days)
    } else if (lastSentAt) {
      scheduledDate = new Date(lastSentAt)
      scheduledDate.setDate(scheduledDate.getDate() + nextSequence.timing_days)
    } else {
      console.log(`   ❌ Cannot calculate timing - no reference date`)
      console.log('')
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
    
    console.log(`   ⏰ Calculated due time: ${scheduledDate.toISOString()}`)
    console.log(`   🎯 Is due: ${isDue ? '✅ YES' : '❌ NO'} (${timeDiff.toFixed(0)} minutes ${isDue ? 'overdue' : 'remaining'})`)

    // Check timezone logic
    let shouldBeTimezoneBlocked = false
    let timezoneReason = ''
    
    if (contact.location && contact.location.includes('Tokyo')) {
      shouldBeTimezoneBlocked = tokyoHour < 9 || tokyoHour >= 17
      timezoneReason = `Tokyo ${tokyoHour}:00 JST (business: 9-17)`
      tokyoContacts.push({
        email: contact.email_address,
        location: contact.location,
        shouldBeBlocked: shouldBeTimezoneBlocked,
        wasProcessed: wasRecentlySent,
        reason: timezoneReason
      })
      console.log(`   🌏 Tokyo timezone: ${shouldBeTimezoneBlocked ? '❌ SHOULD BE BLOCKED' : '✅ OK'} (${timezoneReason})`)
    } else {
      console.log(`   🌍 Non-Tokyo location: ✅ OK`)
    }

    // Determine what should have happened
    const shouldHaveBeenSent = isDue && !shouldBeTimezoneBlocked
    console.log(`   🎯 SHOULD HAVE: ${shouldHaveBeenSent ? '✅ SENT' : '❌ SKIPPED'}`)
    console.log(`   🚀 ACTUALLY: ${wasRecentlySent ? '✅ SENT' : '❌ NOT PROCESSED'}`)

    // Check for mismatches
    if (!shouldHaveBeenSent && wasRecentlySent) {
      shouldHaveBeenSkipped.push({
        email: contact.email_address,
        reason: !isDue ? 'Not due yet' : 'Timezone blocked',
        wasProcessed: true,
        location: contact.location,
        isDue,
        shouldBeTimezoneBlocked
      })
      console.log(`   🚨 UNEXPECTED: Was sent but should have been skipped!`)
    }

    analyzedContacts.push({
      email: contact.email_address,
      shouldHaveBeenSent,
      wasRecentlySent,
      reason: !isDue ? 'timing' : shouldBeTimezoneBlocked ? 'timezone' : 'ok'
    })

    console.log('')
  }

  // Summary analysis
  console.log('═'.repeat(80))
  console.log('📊 ANALYSIS SUMMARY')
  console.log('═'.repeat(80))

  console.log(`\n🗾 TOKYO TIMEZONE ANALYSIS (${tokyoContacts.length} contacts):`)
  if (tokyoContacts.length === 0) {
    console.log('   No Tokyo contacts found')
  } else {
    tokyoContacts.forEach(tc => {
      console.log(`   📧 ${tc.email}`)
      console.log(`      Location field: "${tc.location}"`)
      console.log(`      Should be blocked: ${tc.shouldBeBlocked ? '✅ YES' : '❌ NO'} (${tc.reason})`)
      console.log(`      Was processed: ${tc.wasProcessed ? '✅ YES' : '❌ NO'}`)
      if (tc.shouldBeBlocked && tc.wasProcessed) {
        console.log(`      🚨 TIMEZONE BLOCKING FAILED!`)
      }
    })
  }

  console.log(`\n🚨 SHOULD HAVE BEEN SKIPPED (${shouldHaveBeenSkipped.length} contacts):`)
  if (shouldHaveBeenSkipped.length === 0) {
    console.log('   All processing decisions were correct ✅')
  } else {
    shouldHaveBeenSkipped.forEach(contact => {
      console.log(`   📧 ${contact.email}`)
      console.log(`      Reason should skip: ${contact.reason}`)
      console.log(`      Location: ${contact.location}`)
      console.log(`      Is due: ${contact.isDue}`)
      console.log(`      Should be timezone blocked: ${contact.shouldBeTimezoneBlocked}`)
    })
  }

  console.log(`\n🔍 POSSIBLE CAUSES FOR UNEXPECTED BEHAVIOR:`)
  console.log('─'.repeat(80))
  
  if (tokyoContacts.some(tc => tc.shouldBeBlocked && tc.wasProcessed)) {
    console.log('🌏 TIMEZONE BLOCKING ISSUES:')
    console.log('   1. Location field might not contain "Tokyo" exactly')
    console.log('   2. Timezone calculation might be incorrect')
    console.log('   3. Business hours logic might have edge cases')
    console.log('   4. Timezone check might be bypassed in some conditions')
  }

  if (shouldHaveBeenSkipped.some(c => c.reason === 'Not due yet')) {
    console.log('⏰ TIMING LOGIC ISSUES:')
    console.log('   1. Our timing calculation might differ from automation logic')
    console.log('   2. Weekend/holiday adjustments might affect timing')
    console.log('   3. Hash-based business hour calculation might vary')
    console.log('   4. Sequence timing days might be applied differently')
  }

  console.log('\n💡 RECOMMENDATIONS:')
  console.log('─'.repeat(80))
  console.log('1. Check actual automation logs from GitHub Action for detailed decisions')
  console.log('2. Verify exact location field values in database')
  console.log('3. Test timezone blocking logic in different time periods')
  console.log('4. Compare our timing calculations with automation source code')
  console.log('5. Consider adding more detailed logging to automation processor')

  return {
    totalAnalyzed: analyzedContacts.length,
    tokyoContacts: tokyoContacts.length,
    unexpectedSends: shouldHaveBeenSkipped.length,
    timezoneIssues: tokyoContacts.filter(tc => tc.shouldBeBlocked && tc.wasProcessed).length
  }
}

// Run analysis
analyzeAutomationLogs()
  .then((result) => {
    console.log(`\n✅ Analysis complete: ${result.totalAnalyzed} contacts analyzed`)
    console.log(`🗾 Tokyo contacts: ${result.tokyoContacts}`)
    console.log(`🚨 Unexpected sends: ${result.unexpectedSends}`)
    console.log(`🌏 Timezone issues: ${result.timezoneIssues}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Analysis failed:', error)
    process.exit(1)
  })