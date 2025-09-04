import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { deriveTimezoneFromLocation } from '@/lib/timezone-utils'

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Calculate next email date using the same logic as UI but consistently
const calculateNextEmailDate = (contact: any, campaignSequences: any[], campaignSettings: any) => {
  const currentStep = contact.sequence_step || 0
  
  // If sequence is complete, no next email
  if (contact.email_status === 'Completed' || contact.email_status === 'Replied' || 
      contact.email_status === 'Unsubscribed' || contact.email_status === 'Bounced') {
    return null
  }
  
  // If contact has progressed beyond available sequences, they've completed
  if (campaignSequences.length > 0 && currentStep >= campaignSequences.length) {
    return null
  }
  
  // If no sequences exist but contact has progression, assume completed
  if (campaignSequences.length === 0 && currentStep > 0) {
    return null
  }
  
  // If pending (step 0), calculate based on first sequence timing
  if (currentStep === 0) {
    if (campaignSequences.length > 0) {
      const firstSequence = campaignSequences[0]
      const timingDays = firstSequence?.timing_days !== undefined ? firstSequence.timing_days : (firstSequence?.timing !== undefined ? firstSequence.timing : 0)
      
      // Calculate actual scheduled date using consistent logic
      const contactDate = contact.created_at ? new Date(contact.created_at) : new Date()
      let scheduledDate = new Date(contactDate)
      
      // If timing is 0 (immediate), calculate proper future scheduled time
      if (timingDays === 0) {
        // Use contact ID for consistent hash-based timing
        const contactIdString = String(contact.id || '')
        const contactHash = contactIdString.split('').reduce((hash, char) => {
          return ((hash << 5) - hash) + char.charCodeAt(0)
        }, 0)
        
        const now = new Date()
        
        // Calculate consistent time for this contact
        const seedValue = (contactHash + 1) % 1000
        const consistentHour = 9 + (seedValue % 8) // 9 AM - 5 PM
        const consistentMinute = (seedValue * 7) % 60
        
        // Get contact's timezone and set scheduled time in their local timezone
        const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
        
        // Start with today's date in contact's timezone
        const todayInContactTz = new Date(now.toLocaleString("en-US", {timeZone: timezone}))
        todayInContactTz.setHours(consistentHour, consistentMinute, 0, 0)
        scheduledDate = todayInContactTz
        
        // Compare times properly in the same timezone context
        const nowInContactTz = new Date(now.toLocaleString("en-US", {timeZone: timezone}))
        
        // If the intended time has passed today, schedule for next business day
        if (nowInContactTz >= scheduledDate) {
          scheduledDate.setDate(scheduledDate.getDate() + 1)
          
          // Skip inactive days based on campaign settings
          const activeDays = campaignSettings?.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          
          let dayOfWeek = scheduledDate.getDay()
          while (!activeDays.includes(dayNames[dayOfWeek])) {
            scheduledDate.setDate(scheduledDate.getDate() + 1)
            dayOfWeek = scheduledDate.getDay()
          }
        }
      } else {
        // Add timing days to creation date
        scheduledDate.setDate(scheduledDate.getDate() + timingDays)
      }
      
      return {
        date: scheduledDate,
        relative: 'Scheduled'
      }
    }
  }
  
  // For subsequent steps, calculate based on last contact + next sequence timing
  if (currentStep > 0 && campaignSequences.length > currentStep) {
    const nextSequence = campaignSequences[currentStep]
    const timingDays = nextSequence?.timing_days !== undefined ? nextSequence.timing_days : (nextSequence?.timing !== undefined ? nextSequence.timing : 1)
    
    if (contact.last_contacted_at) {
      const lastContactDate = new Date(contact.last_contacted_at)
      const scheduledDate = new Date(lastContactDate)
      scheduledDate.setDate(scheduledDate.getDate() + timingDays)
      
      return {
        date: scheduledDate,
        relative: 'Scheduled'
      }
    }
  }
  
  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseServer
    const campaignId = params.id

    console.log(`🔄 Syncing contact timings for campaign ${campaignId}`)

    // Get campaign sequences
    const { data: campaignSequences, error: sequencesError } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step')

    if (sequencesError) {
      console.error('Error fetching sequences:', sequencesError)
      return NextResponse.json({ success: false, error: 'Failed to fetch sequences' })
    }

    // Get campaign settings
    const { data: campaignSettings, error: settingsError } = await supabase
      .from('campaign_settings')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return NextResponse.json({ success: false, error: 'Failed to fetch settings' })
    }

    // Get all contacts for this campaign
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
      return NextResponse.json({ success: false, error: 'Failed to fetch contacts' })
    }

    console.log(`📊 Found ${contacts?.length || 0} contacts to sync`)

    let updated = 0
    let errors = 0

    // Process each contact
    for (const contact of contacts || []) {
      try {
        const nextEmailData = calculateNextEmailDate(contact, campaignSequences || [], campaignSettings)
        const nextEmailDue = nextEmailData?.date ? nextEmailData.date.toISOString() : null

        // Update the contact with consistent timing
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ 
            next_email_due: nextEmailDue 
          })
          .eq('id', contact.id)

        if (updateError) {
          console.error(`❌ Failed to update contact ${contact.id}:`, updateError)
          errors++
        } else {
          console.log(`✅ Updated contact ${contact.email}: next_email_due = ${nextEmailDue}`)
          updated++
        }
      } catch (error) {
        console.error(`❌ Error processing contact ${contact.id}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: contacts?.length || 0,
        updated,
        errors
      }
    })

  } catch (error) {
    console.error('❌ Error syncing contact timings:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to sync contact timings' 
    }, { status: 500 })
  }
}