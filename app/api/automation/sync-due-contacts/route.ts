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

// Calculate if contact's next email is due (same logic as analytics)
function isContactDue(contact: any, campaignSequences: any[]) {
  try {
    // Get the contact's timezone
    const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
    const businessHoursStatus = getBusinessHoursStatus(timezone)
    
    // If not in business hours, not due
    if (!businessHoursStatus.isBusinessHours) {
      return false
    }
    
    // Calculate the intended scheduled time (same logic as analytics)
    const contactIdString = String(contact.id || '')
    const contactHash = contactIdString.split('').reduce((hash: number, char: string) => {
      return ((hash << 5) - hash) + char.charCodeAt(0)
    }, 0)
    
    // Get the next sequence for this contact
    const currentStep = contact.sequence_step || 0
    const nextSequence = campaignSequences.find(seq => seq.step_number === currentStep + 1)
    
    if (!nextSequence) {
      return false // No next sequence
    }
    
    // For immediate emails (timing: 0), use the timezone-aware logic
    if (nextSequence.timing_days === 0) {
      const seedValue = (contactHash + 1) % 1000
      const intendedHour = 9 + (seedValue % 8) // 9 AM - 5 PM in contact's timezone
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
      
      // Compare intended time with current time
      const currentTimeInMinutes = currentHourInContactTz * 60 + currentMinuteInContactTz
      const intendedTimeInMinutes = intendedHour * 60 + intendedMinute
      
      return currentTimeInMinutes >= intendedTimeInMinutes
    } else {
      // For non-immediate emails, check if timing has passed
      // Use updated_at for follow-up emails (same logic as analytics)
      let baseDate
      if (currentStep === 0) {
        baseDate = new Date(contact.created_at)
      } else {
        baseDate = contact.updated_at ? new Date(contact.updated_at) : new Date(contact.created_at || new Date())
      }
      
      const scheduledDate = new Date(baseDate)
      scheduledDate.setDate(baseDate.getDate() + nextSequence.timing_days)
      
      return new Date() >= scheduledDate
    }
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
    console.log('─'.repeat(50))
    
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
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
      
      if (isContactDue(contact, campaignSequences || [])) {
        console.log(`✅ Contact ${contact.id} is due for next email`)
        const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
        const currentStep = contact.sequence_step || 0
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
        console.log(`❌ Contact ${contact.id} is NOT due for next email`)
      }
    }
    
    console.log(`✅ Found ${dueContacts.length} contacts due for email sending`)
    
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