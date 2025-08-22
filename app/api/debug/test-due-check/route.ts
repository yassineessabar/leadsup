import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deriveTimezoneFromLocation, getBusinessHoursStatus } from '@/lib/timezone-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Copy the isContactDue function for testing
async function isContactDue(contact: any, campaignSequences: any[]) {
  try {
    // Get count of emails actually sent to this contact
    const { data: emailsSent, count, error: trackingError } = await supabase
      .from('email_tracking')
      .select('id', { count: 'exact' })
      .eq('contact_id', contact.id)
      .eq('campaign_id', contact.campaign_id)
      .eq('status', 'sent')
    
    if (trackingError) {
      console.log(`      ❌ Error querying email_tracking:`, trackingError)
    }
    
    // Determine actual sequence step based on sent emails
    let actualSequenceStep = contact.sequence_step || 0
    
    // If emails have been sent, use that count as the actual step
    if (count && count > 0) {
      actualSequenceStep = count
    } else {
      // No emails sent yet - use the database step (should be 0)
      actualSequenceStep = contact.sequence_step || 0
    }
    
    // Find the next sequence step
    const nextSequence = campaignSequences.find(seq => seq.step_number === actualSequenceStep + 1)
    
    if (!nextSequence) {
      return { due: false, reason: 'No next sequence found', debug: { actualSequenceStep, looking_for_step: actualSequenceStep + 1 } }
    }
    
    const timingDays = nextSequence.timing_days !== undefined ? nextSequence.timing_days : 0
    const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
    const businessHoursStatus = getBusinessHoursStatus(timezone)
    
    // For immediate emails (timing_days = 0)
    if (timingDays === 0) {
      const contactIdString = String(contact.id || '')
      const contactHash = contactIdString.split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0)
      }, 0)
      const seedValue = (contactHash + 1) % 1000
      const intendedHour = 9 + (seedValue % 8) // 9 AM - 5 PM
      const intendedMinute = (seedValue * 7) % 60
      
      // Get current time in contact's timezone
      const now = new Date()
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
      
      const isTimeReached = currentTimeInMinutes >= intendedTimeInMinutes
      const isDue = isTimeReached && businessHoursStatus.isBusinessHours
      
      return {
        due: isDue,
        debug: {
          actualSequenceStep,
          looking_for_step: actualSequenceStep + 1,
          nextSequence: { 
            step_number: nextSequence.step_number, 
            timing_days: nextSequence.timing_days,
            subject: nextSequence.subject
          },
          timezone,
          businessHours: businessHoursStatus,
          currentTime: `${currentHourInContactTz}:${currentMinuteInContactTz.toString().padStart(2, '0')}`,
          intendedTime: `${intendedHour}:${intendedMinute.toString().padStart(2, '0')}`,
          currentTimeInMinutes,
          intendedTimeInMinutes,
          isTimeReached,
          emailsSentCount: count || 0
        }
      }
    }
    
    // For non-immediate emails, just return that it's not immediate for now
    return { 
      due: false, 
      reason: `Non-immediate email: timing_days=${timingDays}`,
      debug: {
        actualSequenceStep,
        looking_for_step: actualSequenceStep + 1,
        nextSequence: { 
          step_number: nextSequence.step_number, 
          timing_days: nextSequence.timing_days,
          subject: nextSequence.subject
        },
        emailsSentCount: count || 0
      }
    }
    
  } catch (error) {
    return { due: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function GET() {
  try {
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    
    // Get all contacts for testing
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .neq('email_status', 'Completed')
    
    if (contactsError || !contacts || contacts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No contacts found',
        details: contactsError
      }, { status: 500 })
    }
    
    // Get campaign sequences
    const { data: sequences, error: sequencesError } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true })
    
    if (sequencesError || !sequences) {
      return NextResponse.json({
        success: false,
        error: 'No sequences found',
        details: sequencesError
      }, { status: 500 })
    }
    
    // Test all contacts
    const results = []
    for (const contact of contacts) {
      const dueResult = await isContactDue(contact, sequences)
      results.push({
        contact: {
          id: contact.id,
          email: contact.email,
          location: contact.location,
          sequence_step: contact.sequence_step,
          email_status: contact.email_status
        },
        due_result: dueResult
      })
    }
    
    return NextResponse.json({
      success: true,
      total_contacts: contacts.length,
      sequences_count: sequences.length,
      first_sequence: {
        step_number: sequences[0]?.step_number,
        timing_days: sequences[0]?.timing_days
      },
      all_sequences: sequences.map(s => ({ step_number: s.step_number, timing_days: s.timing_days })),
      contact_results: results
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}