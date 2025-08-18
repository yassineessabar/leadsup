import { supabaseServer } from '@/lib/supabase'
import { deriveTimezoneFromLocation } from '@/lib/timezone-utils'

interface ScheduleContactEmailsParams {
  contactId: number
  campaignId: string
  contactTimezone?: string
  contactLocation?: string
  startDate?: Date
}

interface EmailSchedule {
  step: number
  daysFromStart: number
  subject: string
  templateKey: string
}

// Default email sequence schedule
const DEFAULT_EMAIL_SEQUENCE: EmailSchedule[] = [
  { step: 1, daysFromStart: 0, subject: 'Initial Outreach', templateKey: 'initial' },
  { step: 2, daysFromStart: 3, subject: 'Follow-up #1', templateKey: 'followup1' },
  { step: 3, daysFromStart: 7, subject: 'Follow-up #2', templateKey: 'followup2' },
  { step: 4, daysFromStart: 14, subject: 'Value Proposition', templateKey: 'value' },
  { step: 5, daysFromStart: 21, subject: 'Final Follow-up', templateKey: 'final' },
  { step: 6, daysFromStart: 28, subject: 'Closing Sequence', templateKey: 'closing' }
]

/**
 * Schedule all emails for a contact when they're added to a campaign
 * This pre-calculates all send times based on their timezone and assigns a healthy sender
 */
export async function scheduleContactEmails({
  contactId,
  campaignId,
  contactTimezone,
  contactLocation,
  startDate = new Date()
}: ScheduleContactEmailsParams) {
  try {
    // 1. Check if campaign is active
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('*, campaign_settings(*), campaign_sequences(*)')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found or inactive')
    }

    if (campaign.status !== 'Active') {
      console.log(`Campaign ${campaignId} is not active, skipping scheduling`)
      return { success: false, message: 'Campaign not active' }
    }

    // 2. Get daily limits from campaign settings
    const dailyLimit = campaign.campaign_settings?.daily_contacts_limit || 35
    const sendingStartTime = campaign.campaign_settings?.sending_start_time || '09:00'
    const sendingEndTime = campaign.campaign_settings?.sending_end_time || '17:00'

    // 3. Determine contact's timezone
    const timezone = contactTimezone || deriveTimezoneFromLocation(contactLocation) || 'America/New_York'

    // 4. Get healthy senders (health score > 90%)
    const { data: campaignSenders, error: sendersError } = await supabaseServer
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .eq('is_selected', true)

    if (sendersError || !campaignSenders || campaignSenders.length === 0) {
      throw new Error('No active senders available for campaign')
    }

    // Get sender health scores
    const senderEmails = campaignSenders.map(s => s.email)
    const { data: senderAccounts } = await supabaseServer
      .from('sender_accounts')
      .select('id, email')
      .in('email', senderEmails)

    if (!senderAccounts || senderAccounts.length === 0) {
      throw new Error('No sender accounts found')
    }

    // Fetch health scores and filter for healthy senders (>90%)
    let healthySenders: any[] = []
    try {
      const senderIds = senderAccounts.map(sa => sa.id)
      const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sender-accounts/health-score?senderIds=${senderIds.join(',')}`)
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        if (healthData.success && healthData.healthScores) {
          healthySenders = senderAccounts.filter(sa => {
            const healthScore = healthData.healthScores[sa.id]?.score || 0
            return healthScore > 90
          })
        }
      }
    } catch (error) {
      console.error('Error fetching health scores:', error)
      // Fall back to all senders if health check fails
      healthySenders = senderAccounts
    }

    if (healthySenders.length === 0) {
      throw new Error('No healthy senders available (health score > 90%)')
    }

    // 5. Select a sender using round-robin
    const { data: recentAssignments } = await supabaseServer
      .from('scheduled_emails')
      .select('sender_account_id, COUNT(*)')
      .eq('campaign_id', campaignId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .in('sender_account_id', healthySenders.map(s => s.id))

    // Count assignments per sender
    const assignmentCounts = new Map()
    healthySenders.forEach(sender => {
      assignmentCounts.set(sender.id, 0)
    })
    
    if (recentAssignments) {
      recentAssignments.forEach((assignment: any) => {
        assignmentCounts.set(assignment.sender_account_id, (assignmentCounts.get(assignment.sender_account_id) || 0) + 1)
      })
    }

    // Select sender with least assignments
    let selectedSender = healthySenders[0]
    let minAssignments = assignmentCounts.get(selectedSender.id)
    
    healthySenders.forEach(sender => {
      const count = assignmentCounts.get(sender.id)
      if (count < minAssignments) {
        selectedSender = sender
        minAssignments = count
      }
    })

    // 6. Check daily limit for selected sender
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: todayScheduled } = await supabaseServer
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('sender_account_id', selectedSender.id)
      .gte('scheduled_for', today.toISOString())
      .lt('scheduled_for', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())

    if ((todayScheduled || 0) >= dailyLimit) {
      // Try next day if today is full
      startDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    }

    // 7. Get email sequences from campaign or use defaults
    const emailSequences = campaign.campaign_sequences?.length > 0 
      ? campaign.campaign_sequences.map((seq: any) => ({
          step: seq.step_number,
          daysFromStart: seq.delay_days || DEFAULT_EMAIL_SEQUENCE[seq.step_number - 1]?.daysFromStart || 0,
          subject: seq.subject,
          templateKey: seq.template_type || `step${seq.step_number}`,
          content: seq.content
        }))
      : DEFAULT_EMAIL_SEQUENCE

    // 8. Schedule all emails in the sequence with randomization
    const scheduledEmails = []
    
    // Add some variance to the days offset to avoid patterns (-1 to +1 day variance)
    // But ensure minimum spacing between emails
    let lastScheduledDate: Date | null = null
    
    for (const sequence of emailSequences) {
      // Add random variance to days offset (except for first email which should be immediate)
      let adjustedDaysOffset = sequence.daysFromStart
      if (sequence.step > 1) {
        // Add random variance: -1 to +1 day
        const variance = Math.random() * 2 - 1 // -1 to +1
        adjustedDaysOffset = Math.max(1, sequence.daysFromStart + Math.round(variance))
        
        // Ensure minimum 2 days between emails
        if (lastScheduledDate) {
          const minDate = new Date(lastScheduledDate)
          minDate.setDate(minDate.getDate() + 2)
          const proposedDate = new Date(startDate)
          proposedDate.setDate(proposedDate.getDate() + adjustedDaysOffset)
          
          if (proposedDate < minDate) {
            adjustedDaysOffset = Math.ceil((minDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          }
        }
      }
      
      const scheduledDate = calculateOptimalSendTime({
        baseDate: startDate,
        daysOffset: adjustedDaysOffset,
        timezone,
        businessStartHour: parseInt(sendingStartTime.split(':')[0]),
        businessEndHour: parseInt(sendingEndTime.split(':')[0])
      })
      
      lastScheduledDate = scheduledDate

      const { data: scheduled, error: scheduleError } = await supabaseServer
        .from('scheduled_emails')
        .insert({
          contact_id: contactId,
          campaign_id: campaignId,
          sender_account_id: selectedSender.id,
          sequence_step: sequence.step,
          email_subject: sequence.subject,
          email_content: sequence.content || '',
          scheduled_for: scheduledDate.toISOString(),
          status: 'pending'
        })
        .select()
        .single()

      if (scheduleError) {
        console.error(`Error scheduling email step ${sequence.step}:`, scheduleError)
        continue
      }

      scheduledEmails.push(scheduled)
    }

    // 9. Update contact with assigned sender
    await supabaseServer
      .from('contacts')
      .update({
        scheduled_sender_id: selectedSender.id,
        scheduling_completed: true,
        scheduled_at: new Date().toISOString()
      })
      .eq('id', contactId)

    return {
      success: true,
      message: `Scheduled ${scheduledEmails.length} emails for contact`,
      scheduledEmails,
      assignedSender: selectedSender
    }

  } catch (error) {
    console.error('Error scheduling contact emails:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to schedule emails'
    }
  }
}

/**
 * Calculate random send time within business hours for a specific timezone
 * Ensures no pattern by randomizing both hour and minute within business hours
 */
function calculateOptimalSendTime({
  baseDate,
  daysOffset,
  timezone,
  businessStartHour = 9,
  businessEndHour = 17
}: {
  baseDate: Date
  daysOffset: number
  timezone: string
  businessStartHour?: number
  businessEndHour?: number
}): Date {
  // Start with the base date and add the offset
  const targetDate = new Date(baseDate)
  targetDate.setDate(targetDate.getDate() + daysOffset)

  // Skip weekends - move to next Monday
  let dayOfWeek = targetDate.getDay()
  while (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday = 0, Saturday = 6
    targetDate.setDate(targetDate.getDate() + 1)
    dayOfWeek = targetDate.getDay()
  }

  // Generate completely random time within business hours
  // Add some buffer to avoid exactly on the hour patterns
  const startMinutes = businessStartHour * 60 + 15 // Start 15 minutes after opening
  const endMinutes = businessEndHour * 60 - 15 // End 15 minutes before closing
  const rangeMinutes = endMinutes - startMinutes
  
  // Use weighted randomization to prefer certain times
  // Morning (9-11): 30% chance
  // Midday (11-14): 40% chance  
  // Afternoon (14-17): 30% chance
  const timeSlot = Math.random()
  let randomTotalMinutes: number
  
  if (timeSlot < 0.3) {
    // Morning slot
    const morningStart = Math.max(startMinutes, 9 * 60)
    const morningEnd = Math.min(11 * 60, endMinutes)
    randomTotalMinutes = morningStart + Math.floor(Math.random() * (morningEnd - morningStart))
  } else if (timeSlot < 0.7) {
    // Midday slot (best open rates)
    const middayStart = Math.max(startMinutes, 11 * 60)
    const middayEnd = Math.min(14 * 60, endMinutes)
    randomTotalMinutes = middayStart + Math.floor(Math.random() * (middayEnd - middayStart))
  } else {
    // Afternoon slot
    const afternoonStart = Math.max(startMinutes, 14 * 60)
    const afternoonEnd = endMinutes
    randomTotalMinutes = afternoonStart + Math.floor(Math.random() * (afternoonEnd - afternoonStart))
  }
  
  // Add small random offset to avoid round numbers
  randomTotalMinutes += Math.floor(Math.random() * 10) - 5
  randomTotalMinutes = Math.max(startMinutes, Math.min(endMinutes, randomTotalMinutes))
  
  const randomHour = Math.floor(randomTotalMinutes / 60)
  const randomMinute = randomTotalMinutes % 60
  
  // Add random seconds for even more variation (0-59)
  const randomSecond = Math.floor(Math.random() * 60)

  // Create the scheduled time in the target timezone
  // We need to be careful here to properly handle timezone conversion
  try {
    // Create a date string in the target timezone
    const dateInTimezone = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(targetDate)
    
    // Parse the date components
    const [month, day, year] = dateInTimezone.split('/').map(Number)
    
    // Create the final date with the random time
    // Note: This creates the date in the local timezone but with the target date's values
    const scheduledDate = new Date(
      year,
      month - 1, // JavaScript months are 0-indexed
      day,
      randomHour,
      randomMinute,
      randomSecond
    )
    
    // Convert to UTC by accounting for timezone offset
    const tzOffset = getTimezoneOffset(timezone, scheduledDate)
    scheduledDate.setMinutes(scheduledDate.getMinutes() - tzOffset)
    
    return scheduledDate
  } catch (error) {
    console.error('Error calculating send time:', error)
    // Fallback to simple calculation
    targetDate.setHours(randomHour, randomMinute, randomSecond, 0)
    return targetDate
  }
}

/**
 * Helper function to get timezone offset in minutes
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    // Format date in target timezone
    const tzDate = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
    
    // Format date in UTC
    const utcDate = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
    
    // Parse both dates and calculate difference
    const [tzMonth, tzDay, tzYear, tzTime] = tzDate.split(/[\/,\s]+/)
    const [tzHour, tzMinute] = tzTime.split(':').map(Number)
    
    const [utcMonth, utcDay, utcYear, utcTime] = utcDate.split(/[\/,\s]+/)
    const [utcHour, utcMinute] = utcTime.split(':').map(Number)
    
    // Calculate offset in minutes
    const tzMinutes = tzHour * 60 + tzMinute
    const utcMinutes = utcHour * 60 + utcMinute
    
    return tzMinutes - utcMinutes
  } catch (error) {
    console.error('Error calculating timezone offset:', error)
    return 0
  }
}

/**
 * Process scheduled emails that are due to be sent
 */
export async function processScheduledEmails() {
  try {
    // Get emails scheduled for the next hour
    const { data: dueEmails, error } = await supabaseServer
      .from('scheduled_emails')
      .select(`
        *,
        contact:contacts(*),
        sender:sender_accounts(*),
        campaign:campaigns(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date(Date.now() + 60 * 60 * 1000).toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50)

    if (error || !dueEmails) {
      console.error('Error fetching due emails:', error)
      return { success: false, error: error?.message }
    }

    const results = []
    
    for (const email of dueEmails) {
      // Check if campaign is still active
      if (email.campaign?.status !== 'Active') {
        await supabaseServer
          .from('scheduled_emails')
          .update({ 
            status: 'cancelled',
            error_message: 'Campaign no longer active'
          })
          .eq('id', email.id)
        
        continue
      }

      // Check sender health score
      const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sender-accounts/health-score?senderIds=${email.sender_account_id}`)
      let healthScore = 90 // Default if check fails
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        if (healthData.success && healthData.healthScores) {
          healthScore = healthData.healthScores[email.sender_account_id]?.score || 90
        }
      }

      if (healthScore < 90) {
        // Reschedule with a different healthy sender
        await rescheduleWithHealthySender(email)
        continue
      }

      // Send the email
      const sendResult = await sendScheduledEmail(email)
      results.push(sendResult)
    }

    return {
      success: true,
      processed: results.length,
      results
    }

  } catch (error) {
    console.error('Error processing scheduled emails:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    }
  }
}

/**
 * Send a scheduled email
 */
async function sendScheduledEmail(scheduledEmail: any) {
  // This would integrate with your existing email sending logic
  // For now, we'll just update the status
  
  try {
    // Call your existing email sending API
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: scheduledEmail.sender.email,
        to: scheduledEmail.contact.email,
        subject: scheduledEmail.email_subject,
        content: scheduledEmail.email_content,
        campaignId: scheduledEmail.campaign_id,
        contactId: scheduledEmail.contact_id,
        sequenceStep: scheduledEmail.sequence_step
      })
    })

    if (response.ok) {
      await supabaseServer
        .from('scheduled_emails')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', scheduledEmail.id)

      return { success: true, emailId: scheduledEmail.id }
    } else {
      const error = await response.text()
      await supabaseServer
        .from('scheduled_emails')
        .update({
          status: 'failed',
          error_message: error
        })
        .eq('id', scheduledEmail.id)

      return { success: false, emailId: scheduledEmail.id, error }
    }

  } catch (error) {
    await supabaseServer
      .from('scheduled_emails')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Send failed'
      })
      .eq('id', scheduledEmail.id)

    return { success: false, emailId: scheduledEmail.id, error }
  }
}

/**
 * Reschedule an email with a different healthy sender
 */
async function rescheduleWithHealthySender(email: any) {
  // Find another healthy sender and reschedule
  // Implementation would be similar to scheduleContactEmails
  
  await supabaseServer
    .from('scheduled_emails')
    .update({
      status: 'skipped',
      error_message: 'Sender health score below threshold, needs rescheduling'
    })
    .eq('id', email.id)
}