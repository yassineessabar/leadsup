import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { deriveTimezoneFromLocation, getBusinessHoursStatusWithActiveDays } from "@/lib/timezone-utils"

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting to populate next_email_due for all contacts...')
    
    // Get all contacts that need timing calculated
    const { data: contacts, error: contactsError } = await supabaseServer
      .from('contacts')
      .select(`
        id, email, first_name, last_name, company, location,
        sequence_step, last_contacted_at, email_status,
        campaign_id
      `)
      .not('email_status', 'in', '("Completed", "Replied", "Unsubscribed", "Bounced")')
    
    if (contactsError) {
      return NextResponse.json({ error: contactsError.message }, { status: 500 })
    }
    
    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ message: 'No contacts to update' })
    }
    
    console.log(`📊 Found ${contacts.length} contacts to update`)
    
    let updatedCount = 0
    let errorCount = 0
    
    // Process contacts in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize)
      
      for (const contact of batch) {
        try {
          console.log(`🔍 Processing contact ${contact.email} (ID: ${contact.id})`)
          console.log(`   email_status: ${contact.email_status}`)
          console.log(`   sequence_step: ${contact.sequence_step}`)
          
          // Skip if already completed
          if (contact.email_status === 'Completed') {
            console.log(`⏭️ Skipping ${contact.email} - already completed`)
            continue
          }
          
          // Get campaign and sequences for this contact
          const { data: campaign } = await supabaseServer
            .from('campaigns')
            .select('id, name, settings')
            .eq('id', contact.campaign_id)
            .single()
            
          if (!campaign) {
            console.log(`⚠️ No campaign found for contact ${contact.email}`)
            continue
          }
          
          const { data: sequences } = await supabaseServer
            .from('campaign_sequences')
            .select('*')
            .eq('campaign_id', contact.campaign_id)
            .order('step', { ascending: true })
          
          if (!sequences || sequences.length === 0) {
            console.log(`⚠️ No sequences found for campaign ${campaign.name}`)
            continue
          }
          
          // Calculate next email timing using same logic as UI
          const nextEmailData = calculateContactNextEmail(contact, campaign, sequences)
          console.log(`📅 Calculated timing for ${contact.email}:`, nextEmailData)
          
          if (nextEmailData && nextEmailData.date) {
            // Save the calculated next_email_due to database
            const { error: updateError } = await supabaseServer
              .from('contacts')
              .update({ next_email_due: nextEmailData.date.toISOString() })
              .eq('id', contact.id)
            
            if (updateError) {
              console.log(`❌ Error updating ${contact.email}:`, updateError.message)
              errorCount++
            } else {
              console.log(`✅ Updated ${contact.email} - next due: ${nextEmailData.date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })}`)
              updatedCount++
            }
          } else {
            console.log(`⚠️ No timing calculated for ${contact.email} - likely completed sequence`)
          }
          
        } catch (error: any) {
          console.log(`❌ Error processing ${contact.email}:`, error.message)
          errorCount++
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return NextResponse.json({ 
      message: `Populated next_email_due for contacts`,
      updatedCount,
      errorCount,
      totalProcessed: contacts.length
    })
    
  } catch (error: any) {
    console.error('❌ Error in populate timing:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Copy of the timing calculation logic from campaign-analytics.tsx
function calculateContactNextEmail(contact: any, campaign: any, sequences: any[]) {
  const currentStep = contact.sequence_step || 0
  
  // If sequence is complete, no next email
  if (contact.email_status === 'Completed' || contact.email_status === 'Replied' || 
      contact.email_status === 'Unsubscribed' || contact.email_status === 'Bounced') {
    return null
  }
  
  // If campaign is paused or contact is paused, no timing
  if (campaign.status === 'Paused' || contact.email_status === 'Paused') {
    return null
  }
  
  // Find next sequence step
  const nextStepIndex = currentStep === 0 ? 0 : currentStep
  const nextSequence = sequences[nextStepIndex]
  
  if (!nextSequence) {
    return null // No more steps in sequence
  }
  
  const timezone = deriveTimezoneFromLocation(contact.location) || 'Australia/Sydney'
  const contactIdString = contact.id.toString()
  
  // Use same hash-based timing logic as UI
  const contactHash = contactIdString.split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0)
  }, 0)
  
  const seedValue = (contactHash + 1) % 1000
  const consistentHour = 9 + (seedValue % 8) // 9 AM - 5 PM
  const consistentMinute = (seedValue * 7) % 60
  
  // Calculate scheduled date
  let scheduledDate: Date
  const timingDays = nextSequence.timing_days || 0
  
  if (currentStep === 0) {
    // First email - immediate or based on timing
    if (timingDays === 0) {
      scheduledDate = new Date()
    } else {
      scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + timingDays)
    }
  } else {
    // Follow-up emails - base on last_contacted_at
    if (contact.last_contacted_at) {
      scheduledDate = new Date(contact.last_contacted_at)
      scheduledDate.setDate(scheduledDate.getDate() + timingDays)
    } else {
      scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + timingDays)
    }
  }
  
  // Set consistent time
  scheduledDate.setHours(consistentHour, consistentMinute, 0, 0)
  
  // Handle campaign active days
  const activeDays = campaign.settings?.activeDays || [1, 2, 3, 4, 5] // Mon-Fri default
  
  function isActiveDayOfWeek(dayOfWeek: number) {
    return activeDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek) // Convert Sunday (0) to 7
  }
  
  // Skip inactive days
  let dayOfWeek = scheduledDate.getDay()
  while (!isActiveDayOfWeek(dayOfWeek)) {
    scheduledDate.setDate(scheduledDate.getDate() + 1)
    dayOfWeek = scheduledDate.getDay()
  }
  
  return {
    relative: timingDays === 0 ? 'Immediate' : `${timingDays} day${timingDays === 1 ? '' : 's'}`,
    date: scheduledDate
  }
}