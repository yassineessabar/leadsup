import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params
    const supabase = getSupabaseServerClient()

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

    // Cancel any existing scheduled emails (skip if table doesn't exist)
    try {
      const { error: cancelError } = await supabase
        .from('scheduled_emails')
        .update({ status: 'cancelled' })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')

      if (cancelError && cancelError.code !== 'PGRST205') {
        console.error('Error cancelling existing emails:', cancelError)
      }
    } catch (error) {
      console.log('ℹ️ Scheduled emails table not found - skipping cancel operation')
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ success: true, message: 'No contacts to reschedule' })
    }

    // Get actual campaign sequences from database (not hardcoded!)
    const { data: campaignSequences, error: sequencesError } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number')

    if (sequencesError || !campaignSequences || campaignSequences.length === 0) {
      console.warn('No campaign sequences found, using default schedule')
      return NextResponse.json({ 
        success: false, 
        error: 'No campaign sequences configured for this campaign',
        details: 'Please configure your email sequence in Campaign Management > Sequence tab'
      }, { status: 400 })
    }

    console.log(`📧 Using ${campaignSequences.length} actual campaign sequences (not hardcoded)`)

    // Reschedule emails for each contact using ACTUAL sequence configuration
    const rescheduledEmails = []
    const now = new Date()
    let totalRescheduled = 0
    let contactsProcessed = 0
    const dailyLimit = 35 // Default daily sending limit

    for (const contact of contacts) {
      try {
        contactsProcessed++
        
        // Skip if contact has completed the sequence or unsubscribed
        if (contact.email_status === 'Completed' || contact.email_status === 'Replied' || 
            contact.email_status === 'Unsubscribed' || contact.email_status === 'Bounced') {
          console.log(`⏭️ Skipping ${contact.email}: Status is ${contact.email_status}`)
          continue
        }

        // Get current progress for this contact (how many emails have been sent)
        const { data: sentEmails } = await supabase
          .from('automation_email_tracking')
          .select('sequence_step, sent_at')
          .eq('contact_id', contact.id.toString())
          .eq('campaign_id', campaignId)
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })

        const currentStep = sentEmails?.length || 0
        console.log(`👤 ${contact.email}: Currently at step ${currentStep}/${campaignSequences.length} (${sentEmails?.length || 0} emails sent)`)

        if (currentStep >= campaignSequences.length) {
          console.log(`✅ ${contact.email}: Sequence already complete`)
          continue
        }

        // **SMART TIMELINE REFRESH**: Calculate new schedule starting from NOW + proper delays
        let baseScheduleDate = new Date(now)
        
        // Move to next business day if we're on weekend
        const dayOfWeek = baseScheduleDate.getDay()
        if (dayOfWeek === 0) baseScheduleDate.setDate(baseScheduleDate.getDate() + 1) // Sunday -> Monday
        if (dayOfWeek === 6) baseScheduleDate.setDate(baseScheduleDate.getDate() + 2) // Saturday -> Monday
        
        // Schedule remaining emails in the sequence
        for (let i = currentStep; i < campaignSequences.length; i++) {
          const sequence = campaignSequences[i]
          const sequenceStep = i + 1
          let scheduledDate = new Date(baseScheduleDate)
          
          if (i === currentStep) {
            // Next immediate email
            if (sequence.timing_days === 0) {
              // Immediate send - schedule for next available slot (respecting business hours)
              const currentHour = now.getHours()
              if (currentHour >= 8 && currentHour < 18) {
                // During business hours - schedule for 1-2 hours from now
                scheduledDate.setHours(scheduledDate.getHours() + 1 + Math.floor(Math.random() * 2))
              } else {
                // Outside business hours - schedule for tomorrow 9-11 AM
                scheduledDate.setDate(scheduledDate.getDate() + 1)
                scheduledDate.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0)
              }
            } else {
              // Has delay - but since campaign was paused, recalculate from resume time
              scheduledDate.setDate(baseScheduleDate.getDate() + Math.max(sequence.timing_days, 1))
              scheduledDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0)
            }
          } else {
            // Subsequent emails - use ACTUAL sequence delays from database
            const prevSequence = campaignSequences[i - 1]
            const delayFromPrevious = sequence.timing_days - (prevSequence?.timing_days || 0)
            const actualDelay = Math.max(delayFromPrevious, 1) // Minimum 1 day between emails
            
            scheduledDate.setDate(baseScheduleDate.getDate() + sequence.timing_days)
            scheduledDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0)
          }

          // Skip weekends
          const emailDayOfWeek = scheduledDate.getDay()
          if (emailDayOfWeek === 0) scheduledDate.setDate(scheduledDate.getDate() + 1)
          if (emailDayOfWeek === 6) scheduledDate.setDate(scheduledDate.getDate() + 2)

          // Randomize within business hours for more natural sending
          scheduledDate = randomizeWithinBusinessHours(scheduledDate, contact.location || 'UTC', sequenceStep)

          const scheduledEmail = {
            campaign_id: campaignId,
            contact_id: contact.id,
            sender_account_id: 1, // Will be assigned properly by scheduler
            sequence_step: sequenceStep,
            email_subject: sequence.subject || `Email ${sequenceStep}`,
            email_content: sequence.content || '',
            scheduled_for: scheduledDate.toISOString(),
            status: 'pending',
            created_at: now.toISOString()
          }

          rescheduledEmails.push(scheduledEmail)
          totalRescheduled++
          
          console.log(`📅 ${contact.email}: Step ${sequenceStep} rescheduled for ${scheduledDate.toLocaleDateString()} ${scheduledDate.toLocaleTimeString()} (${sequence.timing_days} days from start)`)
        }
        
      } catch (contactError) {
        console.error(`❌ Error processing ${contact.email}:`, contactError)
        continue
      }
    }

    // Insert new scheduled emails (skip if table doesn't exist)
    if (rescheduledEmails.length > 0) {
      try {
        const { error: insertError } = await supabase
          .from('scheduled_emails')
          .insert(rescheduledEmails)

        if (insertError) {
          if (insertError.code === 'PGRST205') {
            console.log('ℹ️ Scheduled emails table does not exist - scheduling feature disabled')
            return NextResponse.json({ 
              success: true, 
              message: 'Sequence updated successfully (email scheduling feature not available)',
              rescheduled_count: 0
            })
          } else {
            console.error('Error inserting rescheduled emails:', insertError)
            return NextResponse.json({ success: false, error: 'Failed to reschedule emails' }, { status: 500 })
          }
        }
      } catch (error) {
        console.log('ℹ️ Scheduled emails table not found - scheduling feature disabled')
        return NextResponse.json({ 
          success: true, 
          message: 'Sequence updated successfully (email scheduling feature not available)',
          rescheduled_count: 0
        })
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