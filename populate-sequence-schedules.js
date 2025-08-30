const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

function deriveTimezoneFromLocation(location) {
  if (!location) return 'Australia/Sydney'
  const normalized = location.toLowerCase()
  if (normalized.includes('london') || normalized.includes('uk')) return 'Europe/London'
  if (normalized.includes('sydney') || normalized.includes('australia')) return 'Australia/Sydney'
  return 'Australia/Sydney'
}

// Generate complete sequence schedule for a contact
function generateContactSequenceSchedule(contact, sequences, campaignSettings) {
  if (!sequences || sequences.length === 0) {
    return null
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
  const dayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }
  
  function isActiveDayOfWeek(dayOfWeek) {
    return activeDays.includes(dayMap[dayOfWeek])
  }
  
  // Sort sequences by step_number
  const sortedSequences = sequences.sort((a, b) => (a.step_number || 1) - (b.step_number || 1))
  
  const steps = []
  let baseDate = contact.created_at ? new Date(contact.created_at) : new Date()
  
  for (const seq of sortedSequences) {
    const stepNumber = seq.step_number || 1
    const timingDays = seq.timing_days || 0
    
    // Calculate scheduled date for this step
    let scheduledDate = new Date(baseDate)
    scheduledDate.setDate(scheduledDate.getDate() + timingDays)
    scheduledDate.setHours(consistentHour, consistentMinute, 0, 0)
    
    // Skip inactive days
    let dayOfWeek = scheduledDate.getDay()
    while (!isActiveDayOfWeek(dayOfWeek)) {
      scheduledDate.setDate(scheduledDate.getDate() + 1)
      dayOfWeek = scheduledDate.getDay()
    }
    
    // Determine status based on current progress
    let status = 'pending'
    const currentStep = contact.sequence_step || 0
    
    if (stepNumber <= currentStep) {
      status = 'sent'
    } else if (stepNumber === currentStep + 1) {
      status = 'pending' // Next to be sent
    } else {
      status = 'upcoming'
    }
    
    steps.push({
      step: stepNumber,
      subject: seq.subject || `Email ${stepNumber}`,
      scheduled_date: scheduledDate.toISOString(),
      timezone: timezone,
      timing_days: timingDays,
      status: status
    })
  }
  
  return {
    steps,
    contact_hash: contactHash,
    consistent_hour: consistentHour,
    consistent_minute: consistentMinute,
    timezone,
    generated_at: new Date().toISOString()
  }
}

// Get next_email_due from sequence schedule based on current step
function getNextEmailDueFromSchedule(sequenceSchedule, currentStep) {
  if (!sequenceSchedule?.steps) return null
  
  // Find the next step to be sent
  const nextStep = sequenceSchedule.steps.find(step => step.step === currentStep + 1)
  return nextStep ? new Date(nextStep.scheduled_date) : null
}

async function populateSequenceSchedules() {
  try {
    console.log('🔄 Populating sequence schedules for all contacts...')
    
    const campaignId = '2e2fbedd-6df7-4db5-928a-ab96e2e5658e'
    
    // Get campaign sequences
    const { data: sequences } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number')
    
    // Get campaign settings
    const { data: settings } = await supabase
      .from('campaign_settings')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()
    
    // Get all contacts for this campaign
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email, location, sequence_step, created_at')
      .eq('campaign_id', campaignId)
    
    console.log(`📊 Found ${contacts.length} contacts to update`)
    
    let updatedCount = 0
    
    for (const contact of contacts) {
      // Generate sequence schedule
      const sequenceSchedule = generateContactSequenceSchedule(contact, sequences, settings)
      
      if (sequenceSchedule) {
        // Get next_email_due based on current sequence_step
        const currentStep = contact.sequence_step || 0
        const nextEmailDue = getNextEmailDueFromSchedule(sequenceSchedule, currentStep)
        
        const updateData = {
          sequence_schedule: sequenceSchedule
        }
        
        if (nextEmailDue) {
          updateData.next_email_due = nextEmailDue.toISOString()
        }
        
        const { error } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', contact.id)
        
        if (error) {
          console.error(`❌ Error updating ${contact.email}:`, error.message)
        } else {
          updatedCount++
          console.log(`✅ Updated ${contact.email} (step ${currentStep})`)
          if (nextEmailDue) {
            console.log(`   Next due: ${nextEmailDue.toLocaleString('en-US', { timeZone: sequenceSchedule.timezone })}`)
          }
        }
      }
    }
    
    console.log(`\n🏁 Updated ${updatedCount} contacts with sequence schedules`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

populateSequenceSchedules()