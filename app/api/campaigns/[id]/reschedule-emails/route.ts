import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params
    const supabase = createClient()

    console.log(`🔄 Rescheduling emails for campaign: ${campaignId}`)

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
    }

    // Get all contacts for this campaign
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
      return NextResponse.json({ success: false, error: 'Failed to fetch contacts' }, { status: 500 })
    }

    // Cancel any existing scheduled emails
    const { error: cancelError } = await supabase
      .from('scheduled_emails')
      .update({ status: 'cancelled' })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')

    if (cancelError) {
      console.error('Error cancelling existing emails:', cancelError)
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ success: true, message: 'No contacts to reschedule' })
    }

    // Reschedule emails for each contact
    const rescheduledEmails = []
    const now = new Date()

    for (const contact of contacts) {
      const currentStep = contact.sequence_step || 0
      
      // Skip if contact has completed the sequence or unsubscribed
      if (contact.status === 'Completed' || contact.status === 'Replied' || 
          contact.status === 'Unsubscribed' || contact.status === 'Bounced') {
        continue
      }

      // Email sequence schedule (days from start)
      const emailSchedule = [
        { step: 1, days: 0, subject: "Initial Outreach" },
        { step: 2, days: 3, subject: "Follow-up #1" },
        { step: 3, days: 7, subject: "Follow-up #2" },
        { step: 4, days: 14, subject: "Value Proposition" },
        { step: 5, days: 21, subject: "Final Follow-up" },
        { step: 6, days: 28, subject: "Closing Sequence" }
      ]

      // Calculate new schedule based on current progress
      const contactStartDate = contact.created_at ? new Date(contact.created_at) : now
      
      for (const email of emailSchedule) {
        // Only schedule future emails (current step + 1 onwards)
        if (email.step <= currentStep) continue

        const scheduledDate = new Date(now)
        
        // If this is the next email, schedule it immediately or with minimal delay
        if (email.step === currentStep + 1) {
          // Schedule next email for immediate sending (or 5 minutes from now)
          scheduledDate.setMinutes(scheduledDate.getMinutes() + 5)
        } else {
          // For future emails, calculate based on original schedule but adjusted from resume time
          const originalDays = emailSchedule[email.step - 1].days
          const previousStepDays = email.step > 1 ? emailSchedule[email.step - 2].days : 0
          const daysBetweenSteps = originalDays - previousStepDays
          
          // Schedule future emails with proper intervals from the next email
          const nextEmailDate = new Date(now)
          nextEmailDate.setMinutes(nextEmailDate.getMinutes() + 5) // Base time for next email
          nextEmailDate.setDate(nextEmailDate.getDate() + (daysBetweenSteps * (email.step - currentStep - 1)))
          scheduledDate.setTime(nextEmailDate.getTime())
        }

        // Set to randomized business hours (9 AM - 5 PM) in contact's timezone
        scheduledDate = randomizeWithinBusinessHours(scheduledDate, contact.timezone || 'UTC', email.step)
        
        // Ensure email is not scheduled for weekend - move to next Monday if needed
        scheduledDate = avoidWeekends(scheduledDate, email.step)

        const scheduledEmail = {
          campaign_id: campaignId,
          contact_id: contact.id,
          step: email.step,
          subject: email.subject,
          scheduled_date: scheduledDate.toISOString(),
          status: 'pending',
          created_at: now.toISOString()
        }

        rescheduledEmails.push(scheduledEmail)
      }
    }

    // Insert new scheduled emails
    if (rescheduledEmails.length > 0) {
      const { error: insertError } = await supabase
        .from('scheduled_emails')
        .insert(rescheduledEmails)

      if (insertError) {
        console.error('Error inserting rescheduled emails:', insertError)
        return NextResponse.json({ success: false, error: 'Failed to reschedule emails' }, { status: 500 })
      }
    }

    console.log(`✅ Rescheduled ${rescheduledEmails.length} emails for campaign ${campaignId}`)

    return NextResponse.json({ 
      success: true, 
      message: `Rescheduled ${rescheduledEmails.length} emails`,
      rescheduled_count: rescheduledEmails.length
    })

  } catch (error) {
    console.error('❌ Error rescheduling emails:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to randomize email send time within business hours
function randomizeWithinBusinessHours(baseDate: Date, timezone: string, emailStep?: number): Date {
  const randomizedDate = new Date(baseDate)
  
  // Define preferred time ranges based on email type for more natural patterns
  let timeRanges = [
    { start: 9, end: 11, weight: 0.3 },   // Morning: 9-11 AM (30% chance)
    { start: 11, end: 13, weight: 0.2 },  // Late morning: 11 AM-1 PM (20% chance)
    { start: 13, end: 15, weight: 0.25 }, // Early afternoon: 1-3 PM (25% chance)
    { start: 15, end: 17, weight: 0.25 }  // Late afternoon: 3-5 PM (25% chance)
  ]
  
  // Adjust preferences based on email step
  if (emailStep === 1) {
    // Initial outreach: prefer morning hours
    timeRanges = [
      { start: 9, end: 11, weight: 0.5 },
      { start: 11, end: 13, weight: 0.3 },
      { start: 13, end: 15, weight: 0.15 },
      { start: 15, end: 17, weight: 0.05 }
    ]
  } else if (emailStep && emailStep >= 4) {
    // Follow-ups: prefer afternoon hours
    timeRanges = [
      { start: 9, end: 11, weight: 0.1 },
      { start: 11, end: 13, weight: 0.2 },
      { start: 13, end: 15, weight: 0.35 },
      { start: 15, end: 17, weight: 0.35 }
    ]
  }
  
  // Select time range based on weighted random selection
  const random = Math.random()
  let cumulativeWeight = 0
  let selectedRange = timeRanges[0]
  
  for (const range of timeRanges) {
    cumulativeWeight += range.weight
    if (random <= cumulativeWeight) {
      selectedRange = range
      break
    }
  }
  
  // Generate random time within selected range
  const hourRange = selectedRange.end - selectedRange.start
  const randomHourOffset = Math.random() * hourRange
  const randomHour = Math.floor(selectedRange.start + randomHourOffset)
  const randomMinutes = Math.floor(Math.random() * 60)
  const randomSeconds = Math.floor(Math.random() * 60)
  
  randomizedDate.setHours(randomHour, randomMinutes, randomSeconds, 0)
  
  // Add occasional variation to extended hours (10% chance)
  const extendedHours = Math.random() < 0.1
  
  if (extendedHours) {
    const variations = [
      { hour: 8, minute: 30 + Math.floor(Math.random() * 30) }, // 8:30-9:00 AM
      { hour: 17, minute: Math.floor(Math.random() * 30) },     // 5:00-5:30 PM
      { hour: 18, minute: Math.floor(Math.random() * 30) }      // 6:00-6:30 PM (rare)
    ]
    
    const variation = variations[Math.floor(Math.random() * variations.length)]
    randomizedDate.setHours(variation.hour, variation.minute, Math.floor(Math.random() * 60), 0)
  }
  
  console.log(`📅 Randomized send time (Step ${emailStep || 'N/A'}): ${randomizedDate.toLocaleString('en-US', { 
    timeZone: timezone,
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  })}`)
  
  return randomizedDate
}

// Helper function to avoid weekends and optionally optimize day of week
function avoidWeekends(date: Date, emailStep?: number): Date {
  const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
  
  if (dayOfWeek === 0) {
    // Sunday - move to Monday
    date.setDate(date.getDate() + 1)
  } else if (dayOfWeek === 6) {
    // Saturday - move to Monday
    date.setDate(date.getDate() + 2)
  }
  
  // Add small chance (15%) to shift to preferred days for better open rates
  const optimizeDay = Math.random() < 0.15
  
  if (optimizeDay && emailStep) {
    const currentDay = date.getDay()
    
    // Research suggests Tuesday-Thursday are best for open rates
    // But add some variation to avoid patterns
    const preferredDays = emailStep === 1 ? [2, 3] : [2, 3, 4] // Tue, Wed, (Thu for follow-ups)
    
    if (!preferredDays.includes(currentDay)) {
      // Randomly pick a preferred day
      const targetDay = preferredDays[Math.floor(Math.random() * preferredDays.length)]
      const daysToAdd = (targetDay - currentDay + 7) % 7
      
      // Only shift if it's within a reasonable range (0-3 days)
      if (daysToAdd <= 3) {
        date.setDate(date.getDate() + daysToAdd)
      }
    }
  }
  
  return date
}