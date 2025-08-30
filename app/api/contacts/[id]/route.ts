import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()
    
    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    return null
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const contactId = params.id

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (error) {
      console.error('Error fetching contact:', error)
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error in contact GET by id:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const contactId = params.id
    const body = await request.json()

    // Update contact fields
    const updateData: any = {}
    
    if (body.first_name !== undefined) updateData.first_name = body.first_name
    if (body.last_name !== undefined) updateData.last_name = body.last_name
    if (body.email !== undefined) updateData.email = body.email
    if (body.title !== undefined) updateData.title = body.title
    if (body.location !== undefined) updateData.location = body.location
    if (body.company !== undefined) updateData.company = body.company
    if (body.industry !== undefined) updateData.industry = body.industry
    if (body.linkedin !== undefined) updateData.linkedin = body.linkedin
    if (body.image_url !== undefined) updateData.image_url = body.image_url
    if (body.campaign_id !== undefined) updateData.campaign_id = body.campaign_id

    updateData.updated_at = new Date().toISOString()

    const { data: contact, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId)
      .eq('user_id', userId) // Ensure user can only update their own contacts
      .select()
      .single()

    if (error) {
      console.error('Error updating contact:', error)
      // If table doesn't exist, return success anyway for demo
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ 
          contact: { id: contactId, ...updateData },
          message: 'Contact updated (demo mode)' 
        })
      }
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
    }

    // ✅ If campaign_id was updated, generate sequence_schedule (same logic as contacts upload)
    if (body.campaign_id !== undefined && contact.campaign_id) {
      try {
        // Get campaign sequences and settings
        const { data: sequences } = await supabase
          .from('campaign_sequences')
          .select('*')
          .eq('campaign_id', contact.campaign_id)
          .order('step_number')
        
        const { data: campaignSettings } = await supabase
          .from('campaign_settings')
          .select('*')
          .eq('campaign_id', contact.campaign_id)
          .single()
        
        if (sequences && sequences.length > 0) {
          console.log(`🎯 Generating sequence schedule for ${contact.email} after campaign assignment`)
          
          // Derive timezone from location
          const deriveTimezoneFromLocation = (location: string | null) => {
            if (!location) return 'Australia/Sydney'
            const normalized = location.toLowerCase()
            if (normalized.includes('london') || normalized.includes('uk')) return 'Europe/London'
            if (normalized.includes('sydney') || normalized.includes('australia')) return 'Australia/Sydney'
            return 'Australia/Sydney'
          }
          
          const timezone = deriveTimezoneFromLocation(contact.location) || 'Australia/Sydney'
          const contactIdString = contact.id?.toString() || '0'
          
          // Calculate consistent timing for this contact
          const contactHash = contactIdString.split('').reduce((hash, char) => {
            return ((hash << 5) - hash) + char.charCodeAt(0)
          }, 0)
          
          const seedValue = (contactHash + 1) % 1000
          const consistentHour = 9 + (seedValue % 8) // 9 AM - 5 PM
          const consistentMinute = (seedValue * 7) % 60
          
          // Get active days for scheduling
          const activeDays = campaignSettings?.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          const dayMap: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }
          
          // Generate schedule for all sequences
          const steps = []
          let baseDate = new Date()
          
          for (const seq of sequences) {
            const stepNumber = seq.step_number || 1
            const timingDays = seq.timing_days || 0
            
            // Calculate scheduled date for this step
            let scheduledDate = new Date(baseDate)
            scheduledDate.setDate(scheduledDate.getDate() + timingDays)
            
            // Set to contact's timezone time
            const year = scheduledDate.getFullYear()
            const month = scheduledDate.getMonth() + 1
            const day = scheduledDate.getDate()
            
            // Calculate timezone offset
            let offsetHours = 0
            if (timezone === 'Europe/London') {
              const tempDate = new Date(year, month - 1, day)
              const timezoneName = new Intl.DateTimeFormat('en', {
                timeZone: timezone,
                timeZoneName: 'short'
              }).formatToParts(tempDate).find(p => p.type === 'timeZoneName')?.value
              offsetHours = (timezoneName === 'BST' || timezoneName === 'GMT+1') ? 1 : 0
            } else if (timezone === 'Australia/Sydney') {
              offsetHours = 10 // Approximate
            }
            
            // Create UTC time
            scheduledDate = new Date(Date.UTC(year, month - 1, day, consistentHour - offsetHours, consistentMinute, 0, 0))
            
            // Skip inactive days
            let dayOfWeek = scheduledDate.getDay()
            while (!activeDays.includes(dayMap[dayOfWeek])) {
              scheduledDate.setDate(scheduledDate.getDate() + 1)
              dayOfWeek = scheduledDate.getDay()
            }
            
            steps.push({
              step: stepNumber,
              subject: seq.subject || `Email ${stepNumber}`,
              scheduled_date: scheduledDate.toISOString(),
              timezone: timezone,
              timing_days: timingDays,
              status: stepNumber === 1 ? 'pending' : 'upcoming'
            })
          }
          
          const sequenceSchedule = {
            steps,
            contact_hash: contactHash,
            consistent_hour: consistentHour,
            consistent_minute: consistentMinute,
            timezone,
            generated_at: new Date().toISOString()
          }
          
          // Update contact with sequence_schedule and next_email_due
          const nextEmailDue = steps[0]?.scheduled_date || null
          
          const { data: updatedContact } = await supabase
            .from('contacts')
            .update({ 
              sequence_schedule: sequenceSchedule,
              next_email_due: nextEmailDue,
              email_status: 'Pending',
              sequence_step: 0, // Reset sequence step when assigning to new campaign
              updated_at: new Date().toISOString()
            })
            .eq('id', contactId)
            .select()
            .single()
          
          console.log(`✅ Generated sequence schedule for ${contact.email} with ${steps.length} steps`)
          
          // Return the updated contact with sequence_schedule
          return NextResponse.json({ contact: updatedContact || contact })
        }
      } catch (error) {
        console.error('❌ Error generating sequence schedule:', error)
        // Don't fail the update if scheduling fails
      }
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error in contact PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const contactId = params.id

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId) // Ensure user can only delete their own contacts

    if (error) {
      console.error('Error deleting contact:', error)
      // If table doesn't exist, return success anyway for demo
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ message: 'Contact deleted (demo mode)' })
      }
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Contact deleted successfully' })
  } catch (error) {
    console.error('Error in contact DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}