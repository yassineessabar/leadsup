#!/usr/bin/env node

/**
 * Test Scenario Verification Script
 * 
 * Verifies test contacts and their automation readiness
 * Shows current state and expected behavior
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Check if current time is within business hours for a timezone
 */
function isBusinessHours(timezone) {
  const now = new Date()
  const options = { timeZone: timezone, hour12: false }
  const localTime = now.toLocaleString('en-US', options)
  const hour = parseInt(localTime.split(',')[1].trim().split(':')[0])
  const dayOfWeek = new Date().toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short' })
  
  // Business hours: Monday-Friday, 9 AM - 5 PM
  const isWeekday = !['Sat', 'Sun'].includes(dayOfWeek)
  const isBusinessHour = hour >= 9 && hour < 17
  
  return {
    inBusinessHours: isWeekday && isBusinessHour,
    localTime: localTime,
    hour: hour,
    dayOfWeek: dayOfWeek,
    isWeekday: isWeekday,
    isBusinessHour: isBusinessHour
  }
}

/**
 * Format time difference in human-readable format
 */
function formatTimeDiff(date1, date2) {
  const diff = Math.abs(date1 - date2)
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
}

/**
 * Main verification function
 */
async function verifyTestScenarios() {
  console.log('🔍 Verifying Test Scenarios for Sequence Automation')
  console.log('=' .repeat(70))
  console.log(`⏰ Current UTC Time: ${new Date().toISOString()}`)
  console.log('')
  
  try {
    // Fetch all test contacts
    const { data: prospects, error } = await supabase
      .from('prospects')
      .select(`
        *,
        prospect_progression (
          sequence_time,
          current_sequence_step,
          status
        )
      `)
      .like('email_address', 'test.%.@example.com')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching prospects:', error)
      return
    }
    
    if (!prospects || prospects.length === 0) {
      console.log('⚠️  No test contacts found. Run create-test-scenarios.js first.')
      return
    }
    
    console.log(`📊 Found ${prospects.length} test contacts\n`)
    
    // Categorize contacts
    const categories = {
      shouldSend: [],
      notDue: [],
      outsideHours: [],
      weekend: [],
      errors: []
    }
    
    // Analyze each contact
    for (const prospect of prospects) {
      const progression = prospect.prospect_progression?.[0]
      
      if (!progression) {
        categories.errors.push({
          ...prospect,
          reason: 'No progression data'
        })
        continue
      }
      
      const sequenceTime = new Date(progression.sequence_time)
      const now = new Date()
      const isDue = sequenceTime <= now
      
      // Check business hours
      let businessHoursCheck = { inBusinessHours: false }
      try {
        businessHoursCheck = isBusinessHours(prospect.timezone || 'UTC')
      } catch (e) {
        businessHoursCheck = { 
          inBusinessHours: false, 
          error: 'Invalid timezone',
          localTime: 'Unknown'
        }
      }
      
      // Categorize based on conditions
      const contactInfo = {
        email: prospect.email_address,
        name: `${prospect.first_name} ${prospect.last_name}`,
        timezone: prospect.timezone,
        sequenceTime: sequenceTime,
        isDue: isDue,
        timeDiff: isDue ? 
          `${formatTimeDiff(now, sequenceTime)} overdue` : 
          `Due in ${formatTimeDiff(sequenceTime, now)}`,
        businessHours: businessHoursCheck,
        step: progression.current_sequence_step,
        status: progression.status
      }
      
      if (isDue && businessHoursCheck.inBusinessHours) {
        categories.shouldSend.push(contactInfo)
      } else if (!isDue) {
        categories.notDue.push(contactInfo)
      } else if (isDue && !businessHoursCheck.isWeekday) {
        categories.weekend.push(contactInfo)
      } else if (isDue && !businessHoursCheck.inBusinessHours) {
        categories.outsideHours.push(contactInfo)
      }
    }
    
    // Display results
    console.log('✅ SHOULD SEND NOW (Due + In Business Hours)')
    console.log('-' .repeat(70))
    if (categories.shouldSend.length === 0) {
      console.log('  None')
    } else {
      categories.shouldSend.forEach(c => {
        console.log(`  📧 ${c.email}`)
        console.log(`     Name: ${c.name}`)
        console.log(`     Timezone: ${c.timezone} (${c.businessHours.localTime})`)
        console.log(`     Status: ${c.timeDiff} | Step ${c.step}`)
        console.log('')
      })
    }
    
    console.log('\n⏰ NOT DUE YET (Future sequence_time)')
    console.log('-' .repeat(70))
    if (categories.notDue.length === 0) {
      console.log('  None')
    } else {
      categories.notDue.forEach(c => {
        console.log(`  ⏳ ${c.email}`)
        console.log(`     Name: ${c.name}`)
        console.log(`     Timezone: ${c.timezone}`)
        console.log(`     Status: ${c.timeDiff} | Step ${c.step}`)
        console.log('')
      })
    }
    
    console.log('\n🌙 OUTSIDE BUSINESS HOURS (Due but wrong time)')
    console.log('-' .repeat(70))
    if (categories.outsideHours.length === 0) {
      console.log('  None')
    } else {
      categories.outsideHours.forEach(c => {
        console.log(`  🕐 ${c.email}`)
        console.log(`     Name: ${c.name}`)
        console.log(`     Timezone: ${c.timezone} (${c.businessHours.localTime})`)
        console.log(`     Local Hour: ${c.businessHours.hour}:00 (Business: 9-17)`)
        console.log(`     Status: ${c.timeDiff} | Step ${c.step}`)
        console.log('')
      })
    }
    
    console.log('\n📅 WEEKEND (Due but not weekday)')
    console.log('-' .repeat(70))
    if (categories.weekend.length === 0) {
      console.log('  None')
    } else {
      categories.weekend.forEach(c => {
        console.log(`  📆 ${c.email}`)
        console.log(`     Name: ${c.name}`)
        console.log(`     Timezone: ${c.timezone} (${c.businessHours.dayOfWeek})`)
        console.log(`     Status: ${c.timeDiff} | Step ${c.step}`)
        console.log('')
      })
    }
    
    if (categories.errors.length > 0) {
      console.log('\n❌ ERRORS')
      console.log('-' .repeat(70))
      categories.errors.forEach(c => {
        console.log(`  ⚠️  ${c.email_address}: ${c.reason}`)
      })
    }
    
    // Summary
    console.log('\n' + '=' .repeat(70))
    console.log('📊 SUMMARY')
    console.log('=' .repeat(70))
    console.log(`✅ Ready to send: ${categories.shouldSend.length}`)
    console.log(`⏳ Not due yet: ${categories.notDue.length}`)
    console.log(`🌙 Outside hours: ${categories.outsideHours.length}`)
    console.log(`📅 Weekend: ${categories.weekend.length}`)
    console.log(`❌ Errors: ${categories.errors.length}`)
    console.log(`📧 Total: ${prospects.length}`)
    
    // Automation test commands
    console.log('\n' + '=' .repeat(70))
    console.log('🧪 TEST COMMANDS')
    console.log('=' .repeat(70))
    console.log('\n1. Run automation now:')
    console.log('   curl -u "admin:password" -X POST http://localhost:3000/api/campaigns/automation/send-emails')
    console.log('\n2. Force business hours (for testing):')
    console.log('   curl -u "admin:password" -X POST http://localhost:3000/api/debug/simulate-business-hours')
    console.log('\n3. Check automation logs:')
    console.log('   curl -u "admin:password" http://localhost:3000/api/automation/logs | jq')
    console.log('\n4. Update specific contact timing:')
    console.log('   curl -u "admin:password" -X POST http://localhost:3000/api/debug/update-timestamp')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run verification
verifyTestScenarios()