// Simple script to populate next_email_due for all contacts using UI logic
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

function deriveTimezoneFromLocation(location) {
  if (!location) return 'Australia/Sydney'
  
  const locationLower = location.toLowerCase()
  
  if (locationLower.includes('sydney') || locationLower.includes('australia')) {
    return 'Australia/Sydney'
  }
  if (locationLower.includes('new york') || locationLower.includes('ny')) {
    return 'America/New_York'
  }
  if (locationLower.includes('los angeles') || locationLower.includes('la') || locationLower.includes('california')) {
    return 'America/Los_Angeles'
  }
  if (locationLower.includes('london') || locationLower.includes('uk') || locationLower.includes('united kingdom')) {
    return 'Europe/London'
  }
  if (locationLower.includes('berlin') || locationLower.includes('germany')) {
    return 'Europe/Berlin'
  }
  
  return 'Australia/Sydney' // Default
}

function calculateNextEmailDate(contact, sequences, campaignSettings) {
  const currentStep = contact.sequence_step || 0
  
  // If already completed, no next email
  if (contact.email_status === 'Completed' || contact.email_status === 'Replied' || 
      contact.email_status === 'Unsubscribed' || contact.email_status === 'Bounced') {
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
  let scheduledDate
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
  const activeDays = campaignSettings?.activeDays || [1, 2, 3, 4, 5] // Mon-Fri default
  
  function isActiveDayOfWeek(dayOfWeek) {
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

async function populateAllTimings() {
  try {
    console.log('🔄 Starting to populate next_email_due for all contacts...')
    
    // Get all contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, email, sequence_step, last_contacted_at, email_status, campaign_id, location')
    
    if (contactsError) {
      console.log('❌ Error fetching contacts:', contactsError.message)
      return
    }
    
    console.log(`📊 Found ${contacts.length} contacts`)
    
    let updatedCount = 0
    let skippedCount = 0
    
    // Get unique campaign IDs
    const campaignIds = [...new Set(contacts.map(c => c.campaign_id))]
    console.log(`📋 Found ${campaignIds.length} unique campaigns`)
    
    // Get all campaign data
    const campaignData = {}
    const sequenceData = {}
    const settingsData = {}
    
    for (const campaignId of campaignIds) {
      // Get campaign
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('id, name, status, settings')
        .eq('id', campaignId)
        .single()
      
      if (campaign) {
        campaignData[campaignId] = campaign
      }
      
      // Get sequences
      const { data: sequences } = await supabase
        .from('campaign_sequences')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('step_number', { ascending: true })
      
      if (sequences) {
        sequenceData[campaignId] = sequences
      }
      
      // Get settings
      const { data: settings } = await supabase
        .from('campaign_settings')
        .select('*')
        .eq('campaign_id', campaignId)
        .single()
      
      if (settings) {
        settingsData[campaignId] = settings
      }
    }
    
    console.log('📋 Loaded campaign data, processing contacts...')
    
    // Process each contact
    for (const contact of contacts) {
      const campaign = campaignData[contact.campaign_id]
      const sequences = sequenceData[contact.campaign_id]
      const settings = settingsData[contact.campaign_id]
      
      if (!campaign || !sequences || sequences.length === 0) {
        console.log(`⚠️ Missing data for ${contact.email} - campaign: ${!!campaign}, sequences: ${sequences?.length || 0}`)
        skippedCount++
        continue
      }
      
      // Calculate timing
      const nextEmailData = calculateNextEmailDate(contact, sequences, settings)
      
      if (nextEmailData && nextEmailData.date) {
        // Save to database
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ next_email_due: nextEmailData.date.toISOString() })
          .eq('id', contact.id)
        
        if (updateError) {
          console.log(`❌ Error updating ${contact.email}:`, updateError.message)
        } else {
          console.log(`✅ ${contact.email} - next due: ${nextEmailData.date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })}`)
          updatedCount++
        }
      } else {
        console.log(`⚠️ No timing for ${contact.email} - likely completed`)
        skippedCount++
      }
    }
    
    console.log(`\n🏁 Summary:`)
    console.log(`   Updated: ${updatedCount}`)
    console.log(`   Skipped: ${skippedCount}`)
    console.log(`   Total: ${contacts.length}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

populateAllTimings()