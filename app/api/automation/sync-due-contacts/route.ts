import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deriveTimezoneFromLocation, getBusinessHoursStatus } from '@/lib/timezone-utils'

// Use service role key for automation processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ContactWithSequence {
  id: string
  email: string
  first_name: string
  last_name: string
  location: string
  campaign_id: string
  created_at: string
  email_status: string
  sequence_step: number
  next_sequence_subject: string
  scheduled_time: string
  timezone: string
  is_due: boolean
}

// Helper function to calculate next email date consistently (same as analytics)
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
      
      // Avoid weekends
      const dayOfWeek = scheduledDate.getDay()
      if (dayOfWeek === 0) scheduledDate.setDate(scheduledDate.getDate() + 1) // Sunday -> Monday
      if (dayOfWeek === 6) scheduledDate.setDate(scheduledDate.getDate() + 2) // Saturday -> Monday
    }
    
    return {
      date: scheduledDate,
      relative: timingDays === 0 ? 'Immediate' : `Day ${timingDays + 1}`
    }
  } else {
    // For follow-up emails, base on when contact was last updated (email sent)
    const baseDate = contact.updated_at ? new Date(contact.updated_at) : new Date(contact.created_at || new Date())
    let scheduledDate = new Date(baseDate)
    scheduledDate.setDate(baseDate.getDate() + timingDays)
    
    // Add consistent business hours
    const contactIdString = String(contact.id || '')
    const contactHash = contactIdString.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0)
    }, 0)
    const seedValue = (contactHash + currentStep + 1) % 1000
    const intendedHour = 9 + (seedValue % 8) // 9 AM - 5 PM
    const intendedMinute = (seedValue * 7) % 60
    
    scheduledDate.setHours(intendedHour, intendedMinute, 0, 0)
    
    // Avoid weekends
    const dayOfWeek = scheduledDate.getDay()
    if (dayOfWeek === 0) scheduledDate.setDate(scheduledDate.getDate() + 1) // Sunday -> Monday
    if (dayOfWeek === 6) scheduledDate.setDate(scheduledDate.getDate() + 2) // Saturday -> Monday
    
    return {
      date: scheduledDate,
      relative: `Day ${timingDays + 1} follow-up`
    }
  }
}

// Calculate if contact's next email is due (matching analytics logic)
async function isContactDue(contact: any, campaignSequences: any[]) {
  try {
    // Get count of emails actually sent to this contact
    const { data: emailsSent, count } = await supabase
      .from('email_tracking')
      .select('id', { count: 'exact' })
      .eq('contact_id', contact.id)
      .eq('campaign_id', contact.campaign_id)
      .eq('status', 'sent')
    
    // Determine actual sequence step based on sent emails
    let actualSequenceStep = contact.sequence_step || 0
    
    // If emails have been sent, use that count as the actual step
    if (count && count > 0) {
      actualSequenceStep = count
    } else {
      // No emails sent yet - use the database step (should be 0)
      actualSequenceStep = contact.sequence_step || 0
    }
    
    // Create contact with corrected sequence step
    const contactForCalculation = { ...contact, sequence_step: actualSequenceStep }
    
    // Calculate next email date using same logic as analytics
    const nextEmailData = calculateNextEmailDate(contactForCalculation, campaignSequences)
    
    if (!nextEmailData || !nextEmailData.date) {
      return false // No next email scheduled
    }
    
    const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
    const businessHoursStatus = getBusinessHoursStatus(timezone)
    
    const now = new Date()
    const scheduledDate = nextEmailData.date
    let isTimeReached = false
    
    // For immediate emails, use timezone-aware logic (same as analytics)
    if (nextEmailData.relative === 'Immediate') {
      const contactIdString = String(contact.id || '')
      const contactHash = contactIdString.split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0)
      }, 0)
      const seedValue = (contactHash + 1) % 1000
      const intendedHour = 9 + (seedValue % 8) // 9 AM - 5 PM
      const intendedMinute = (seedValue * 7) % 60
      
      // Get current time in contact's timezone
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
      
      isTimeReached = currentTimeInMinutes >= intendedTimeInMinutes
      const isDue = isTimeReached && businessHoursStatus.isBusinessHours
      
      console.log(`🔍 IMMEDIATE EMAIL DUE CHECK for ${contact.id}:`)
      console.log(`   Current time: ${currentHourInContactTz}:${currentMinuteInContactTz.toString().padStart(2, '0')} (${currentTimeInMinutes} min)`)
      console.log(`   Intended time: ${intendedHour}:${intendedMinute.toString().padStart(2, '0')} (${intendedTimeInMinutes} min)`)
      console.log(`   Time reached: ${isTimeReached}`)
      console.log(`   Business hours: ${businessHoursStatus.isBusinessHours}`)
      console.log(`   FINAL RESULT: ${isDue} (${isDue ? 'DUE NEXT' : 'PENDING START'})`)
      
      return isDue
    } else {
      // For non-immediate emails, compare full datetime in contact's timezone
      if (scheduledDate) {
        // Convert both current time and scheduled time to contact's timezone for comparison
        const nowInContactTz = new Date(now.toLocaleString("en-US", {timeZone: timezone}))
        const scheduledInContactTz = new Date(scheduledDate.toLocaleString("en-US", {timeZone: timezone}))
        
        isTimeReached = nowInContactTz >= scheduledInContactTz
        const isDue = isTimeReached && businessHoursStatus.isBusinessHours
        
        console.log(`🔍 NON-IMMEDIATE EMAIL DUE CHECK for ${contact.id}:`)
        console.log(`   Now in contact TZ: ${nowInContactTz.toISOString()}`)
        console.log(`   Scheduled in contact TZ: ${scheduledInContactTz.toISOString()}`)
        console.log(`   Time reached: ${isTimeReached}`)
        console.log(`   Business hours: ${businessHoursStatus.isBusinessHours}`)
        console.log(`   FINAL RESULT: ${isDue} (${isDue ? 'DUE NEXT' : 'PENDING START'})`)
        
        return isDue
      }
    }
    
    return false
    
  } catch (error) {
    console.error('Error checking if contact is due:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    
    console.log('🔄 SYNCING DUE CONTACTS FOR AUTOMATION')
    console.log(`📋 Campaign ID: ${campaignId}`)
    console.log('─'.repeat(50))
    
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }
    
    
    // Get campaign details
    const { data: campaignDetails } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('id', campaignId)
      .single()
    
    if (campaignDetails) {
      console.log(`📌 Campaign Name: ${campaignDetails.name}`)
      console.log(`📊 Campaign Status: ${campaignDetails.status}`)
    }
    
    // Get campaign sequences
    const { data: campaignSequences, error: sequencesError } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true })
    
    if (sequencesError) {
      console.error('Error fetching campaign sequences:', sequencesError)
      return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 })
    }
    
    // Get all contacts for this campaign (exclude completed statuses)
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .neq('email_status', 'Completed')
      .neq('email_status', 'Replied') 
      .neq('email_status', 'Unsubscribed')
      .neq('email_status', 'Bounced')
    
    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
      console.error('Campaign ID:', campaignId)
      return NextResponse.json({ 
        error: 'Failed to fetch contacts',
        details: contactsError.message,
        campaignId 
      }, { status: 500 })
    }
    
    console.log(`📋 Found ${contacts?.length || 0} active contacts`)
    
    // Log first few contacts for debugging
    if (contacts && contacts.length > 0) {
      console.log(`📝 Sample contacts (first 5):`)
      contacts.slice(0, 5).forEach(c => {
        console.log(`   - ${c.email} (${c.first_name} ${c.last_name}) - Step: ${c.sequence_step || 0}, Status: ${c.email_status || 'Pending'}`)
      })
    }
    
    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        dueContacts: [], 
        message: 'No active contacts found' 
      })
    }
    
    // Filter contacts that are due for their next email
    const dueContacts: ContactWithSequence[] = []
    
    for (const contact of contacts) {
      console.log(`🔍 Checking contact ${contact.id}: ${contact.email} (step: ${contact.sequence_step || 0})`)
      
      
      if (await isContactDue(contact, campaignSequences || [])) {
        const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
        const businessHours = getBusinessHoursStatus(timezone)
        
        console.log(`✅ Contact ${contact.id} STATUS: DUE NEXT (will be processed)`)
        console.log(`   📍 Location: ${contact.location}`)
        console.log(`   🕐 Timezone: ${timezone}`)
        console.log(`   🏢 Business Hours: ${businessHours.isBusinessHours ? '✅ YES' : '❌ NO'} (${businessHours.currentTime})`)
        console.log(`   📅 Created: ${contact.created_at}`)
        console.log(`   📧 Current Step: ${contact.sequence_step || 0}`)
        
        // Get sequence status to determine actual progress (same logic as in isContactDue)
        const { data: sequenceStatus } = await supabase
          .from('email_tracking')
          .select('*')
          .eq('contact_id', contact.id)
          .eq('campaign_id', contact.campaign_id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        // Determine actual sequence step based on sent emails (same logic as analytics)
        let actualSequenceStep = contact.sequence_step || 0
        
        if (sequenceStatus && sequenceStatus.sequences_sent > 0) {
          actualSequenceStep = sequenceStatus.sequences_sent
        } else if (!sequenceStatus || sequenceStatus.sequences_sent === 0) {
          if (contact.sequence_step === 0 || !contact.sequence_step) {
            actualSequenceStep = 0
          }
        }
        
        const currentStep = actualSequenceStep
        const nextSequence = campaignSequences?.find(seq => seq.step_number === currentStep + 1)
        
        if (nextSequence) {
          // Calculate scheduled time for this contact
          const contactIdString = String(contact.id || '')
          const contactHash = contactIdString.split('').reduce((hash: number, char: string) => {
            return ((hash << 5) - hash) + char.charCodeAt(0)
          }, 0)
          const seedValue = (contactHash + 1) % 1000
          const intendedHour = 9 + (seedValue % 8)
          const intendedMinute = (seedValue * 7) % 60
          
          const scheduledTime = `${intendedHour.toString().padStart(2, '0')}:${intendedMinute.toString().padStart(2, '0')}`
          
          dueContacts.push({
            id: contact.id,
            email: contact.email,
            first_name: contact.first_name,
            last_name: contact.last_name,
            location: contact.location,
            campaign_id: contact.campaign_id,
            created_at: contact.created_at,
            email_status: contact.email_status,
            sequence_step: currentStep,
            next_sequence_subject: nextSequence.subject || `Email ${nextSequence.step_number}`,
            scheduled_time: scheduledTime,
            timezone: timezone,
            is_due: true
          })
        }
      } else {
        const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
        const businessHours = getBusinessHoursStatus(timezone)
        
        console.log(`❌ Contact ${contact.id} STATUS: PENDING START (will be skipped)`)
        console.log(`   📍 Location: ${contact.location}`)
        console.log(`   🕐 Timezone: ${timezone}`)
        console.log(`   🏢 Business Hours: ${businessHours.isBusinessHours ? '✅ YES' : '❌ NO'} (${businessHours.currentTime})`)
        console.log(`   📧 Current Step: ${contact.sequence_step || 0}`)
      }
    }
    
    console.log(`✅ Found ${dueContacts.length} contacts due for email sending`)
    
    // Log summary of what emails were checked
    console.log(`📊 Summary:`)
    console.log(`   Total contacts checked: ${contacts.length}`)
    console.log(`   Contacts due (Due next): ${dueContacts.length}`)
    console.log(`   Contacts not due (Pending Start): ${contacts.length - dueContacts.length}`)
    
    // List all contacts that were NOT due (for debugging)
    if (contacts.length - dueContacts.length > 0) {
      console.log(`📝 Contacts NOT due (showing first 10):`)
      const notDueContacts = contacts.filter(c => !dueContacts.find(dc => dc.id === c.id))
      notDueContacts.slice(0, 10).forEach(c => {
        console.log(`   - ${c.email} (${c.first_name} ${c.last_name}) - Location: ${c.location}`)
      })
    }
    
    return NextResponse.json({
      success: true,
      dueContacts,
      totalContacts: contacts.length,
      dueCount: dueContacts.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error syncing due contacts:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST endpoint to update contact status after successful email sending
export async function POST(request: NextRequest) {
  try {
    const { contactId, campaignId, sequenceStep, success, errorMessage } = await request.json()
    
    console.log(`📧 Updating contact ${contactId} after email attempt`)
    
    if (!contactId || !campaignId) {
      return NextResponse.json({ error: 'Contact ID and Campaign ID required' }, { status: 400 })
    }
    
    if (success) {
      // Email was sent successfully - move to next sequence step
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ 
          sequence_step: (sequenceStep || 0) + 1,
          email_status: 'In Progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
        .eq('campaign_id', campaignId)
      
      if (updateError) {
        console.error('Error updating contact after successful send:', updateError)
        return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
      }
      
      console.log(`✅ Updated contact ${contactId} to step ${(sequenceStep || 0) + 1}`)
      
    } else {
      // Email failed to send - log the error but don't advance sequence
      console.log(`❌ Email failed for contact ${contactId}: ${errorMessage}`)
      
      // Optionally update contact with error status
      await supabase
        .from('contacts')
        .update({ 
          email_status: 'Error',
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
        .eq('campaign_id', campaignId)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Contact ${contactId} updated successfully` 
    })
    
  } catch (error) {
    console.error('Error updating contact status:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}