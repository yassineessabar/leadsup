import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Copy the timezone function 
function deriveTimezoneFromLocation(location: string | null): string | null {
  if (!location) return null
  
  const locationLower = location.toLowerCase()
  
  // European cities and regions
  if (locationLower.includes('london') || locationLower.includes('edinburgh') || 
      locationLower.includes('manchester') || locationLower.includes('birmingham') ||
      locationLower.includes('bristol') || locationLower.includes('liverpool') ||
      locationLower.includes('leeds') || locationLower.includes('glasgow') ||
      locationLower.includes('cardiff') || locationLower.includes('belfast') ||
      locationLower.includes('uk') || locationLower.includes('united kingdom') ||
      locationLower.includes('england') || locationLower.includes('scotland') ||
      locationLower.includes('wales') || locationLower.includes('northern ireland')) {
    return 'Europe/London'
  }
  
  return 'UTC' // Default fallback
}

function getBusinessHoursStatus(timezone: string) {
  const now = new Date()
  
  // Get current time in the specified timezone
  const currentHour = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false
  }).format(now))
  
  const dayOfWeek = new Date(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)).getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  const currentDay = dayOfWeek === 0 ? 7 : dayOfWeek // Convert to 1=Monday, 7=Sunday
  
  // Business hours: 9 AM - 5 PM, Monday - Friday
  const isBusinessHours = currentHour >= 9 && currentHour < 17 && currentDay >= 1 && currentDay <= 5
  const isWeekend = currentDay === 6 || currentDay === 7 // Saturday or Sunday
  
  return {
    isBusinessHours,
    isWeekend,
    currentHour,
    currentDay
  }
}

// Copy the calculateNextEmailDate function
const calculateNextEmailDate = (contact: any, campaignSequences: any[]) => {
  const currentStep = contact.sequence_step || 0
  
  // Find the next sequence step
  const nextSequence = campaignSequences.find(seq => seq.step_number === currentStep + 1)
  
  if (!nextSequence) {
    return null // No next sequence
  }
  
  const timingDays = nextSequence.timing_days !== undefined ? nextSequence.timing_days : 0
  
  // If pending (step 0), calculate based on first sequence timing
  if (currentStep === 0) {
    const contactDate = contact.created_at ? new Date(contact.created_at) : new Date()
    let scheduledDate = new Date(contactDate)
    
    if (timingDays === 0) {
      // Immediate email - use business hours logic
      const now = new Date()
      const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
      
      // Generate consistent but varied hour/minute for each contact
      const contactIdString = String(contact.id || '')
      const contactHash = contactIdString.split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0)
      }, 0)
      const seedValue = (contactHash + 1) % 1000
      const intendedHour = 9 + (seedValue % 8) // 9 AM - 5 PM
      const intendedMinute = (seedValue * 7) % 60
      
      // Set to intended time today
      scheduledDate.setHours(intendedHour, intendedMinute, 0, 0)
      
      // Check if this time has already passed today in the contact's timezone
      const currentHourInContactTz = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
      }).format(now))
      const currentMinuteInContactTz = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        minute: 'numeric'
      }).format(now))
      
      const currentTimeInMinutes = currentHourInContactTz * 60 + currentMinuteInContactTz
      const intendedTimeInMinutes = intendedHour * 60 + intendedMinute
      
      // If the intended time has passed today OR we're outside business hours, schedule for next business day
      if (currentTimeInMinutes >= intendedTimeInMinutes || !getBusinessHoursStatus(timezone).isBusinessHours) {
        // Move to next business day
        scheduledDate.setDate(scheduledDate.getDate() + 1)
        
        // Skip weekends
        const dayOfWeek = scheduledDate.getDay()
        if (dayOfWeek === 0) scheduledDate.setDate(scheduledDate.getDate() + 1) // Skip Sunday
        if (dayOfWeek === 6) scheduledDate.setDate(scheduledDate.getDate() + 2) // Skip Saturday
      }
      
      // Final weekend check (in case the immediate schedule falls on weekend)
      const finalDayOfWeek = scheduledDate.getDay()
      if (finalDayOfWeek === 0) scheduledDate.setDate(scheduledDate.getDate() + 1) // Sunday -> Monday
      if (finalDayOfWeek === 6) scheduledDate.setDate(scheduledDate.getDate() + 2) // Saturday -> Monday
    } else {
      // For non-immediate emails, use the original logic
      scheduledDate.setDate(contactDate.getDate() + timingDays)
      
      // Add consistent business hours
      const contactIdString = String(contact.id || '')
      const contactHash = contactIdString.split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0)
      }, 0)
      const seedValue = (contactHash + 1) % 1000
      const intendedHour = 9 + (seedValue % 8) // 9 AM - 5 PM
      const intendedMinute = (seedValue * 7) % 60
      
      scheduledDate.setHours(intendedHour, intendedMinute, 0, 0)
    }
    
    return {
      date: scheduledDate,
      relative: timingDays === 0 ? 'Immediate' : `${timingDays} days`
    }
  }
  
  // For subsequent steps, calculate based on last contacted date
  const lastContactedDate = contact.last_contacted_at ? new Date(contact.last_contacted_at) : new Date(contact.created_at)
  const scheduledDate = new Date(lastContactedDate)
  scheduledDate.setDate(lastContactedDate.getDate() + timingDays)
  
  return {
    date: scheduledDate,
    relative: `${timingDays} days`
  }
}

export async function GET() {
  try {
    const campaignId = '9e91bc69-521a-4723-bc24-5c51676a93a5'
    
    console.log('🔍 Debugging date logic for automation issue...')
    console.log(`🕐 Current server time: ${new Date().toISOString()}`)
    console.log(`📅 Current server date: ${new Date().toDateString()}`)
    
    // Get contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .limit(1)
    
    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts found' })
    }
    
    // Get sequences
    const { data: campaignSequences } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true })
    
    const contact = contacts[0]
    const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
    
    // Test the date calculation logic
    const nextEmailData = calculateNextEmailDate(contact, campaignSequences || [])
    
    if (!nextEmailData) {
      return NextResponse.json({ error: 'No next email calculated' })
    }
    
    const now = new Date()
    const scheduledDate = nextEmailData.date
    
    // Show the problematic timezone conversion
    console.log('🔍 DEBUGGING TIMEZONE CONVERSION:')
    console.log(`   Original now: ${now.toISOString()}`)
    console.log(`   Original scheduled: ${scheduledDate.toISOString()}`)
    
    // Current (problematic) logic
    const nowInContactTzOLD = new Date(now.toLocaleString("en-US", {timeZone: timezone}))
    const scheduledInContactTzOLD = new Date(scheduledDate.toLocaleString("en-US", {timeZone: timezone}))
    
    console.log(`   NOW in contact TZ (OLD method): ${nowInContactTzOLD.toISOString()}`)
    console.log(`   SCHEDULED in contact TZ (OLD method): ${scheduledInContactTzOLD.toISOString()}`)
    console.log(`   OLD comparison result: ${nowInContactTzOLD >= scheduledInContactTzOLD}`)
    
    // Better timezone conversion logic
    const formatInTimezone = (date: Date, tz: string) => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date)
    }
    
    const nowInContactTzSTR = formatInTimezone(now, timezone)
    const scheduledInContactTzSTR = formatInTimezone(scheduledDate, timezone)
    
    console.log(`   NOW in contact TZ (BETTER method): ${nowInContactTzSTR}`)
    console.log(`   SCHEDULED in contact TZ (BETTER method): ${scheduledInContactTzSTR}`)
    
    // Direct comparison without timezone conversion issues
    const isTimeReached = now >= scheduledDate
    
    return NextResponse.json({
      success: true,
      debug: {
        contact: {
          id: contact.id,
          email: contact.email,
          location: contact.location,
          sequence_step: contact.sequence_step,
          created_at: contact.created_at
        },
        timezone: timezone,
        currentTime: {
          server: now.toISOString(),
          serverDateString: now.toDateString(),
          inContactTz: nowInContactTzSTR
        },
        scheduledTime: {
          calculated: scheduledDate.toISOString(),
          calculatedDateString: scheduledDate.toDateString(),
          inContactTz: scheduledInContactTzSTR,
          relative: nextEmailData.relative
        },
        comparison: {
          oldMethod: {
            nowConverted: nowInContactTzOLD.toISOString(),
            scheduledConverted: scheduledInContactTzOLD.toISOString(),
            result: nowInContactTzOLD >= scheduledInContactTzOLD
          },
          directMethod: {
            result: isTimeReached,
            description: "Direct UTC comparison without timezone conversion"
          }
        },
        businessHours: getBusinessHoursStatus(timezone),
        shouldSend: isTimeReached && getBusinessHoursStatus(timezone).isBusinessHours
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error debugging date logic:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}