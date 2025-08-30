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
  
  console.log(`🔢 Contact ${contact.email} (ID: ${contact.id}):`)
  console.log(`   Hash: ${contactHash}, Seed: ${seedValue}`)
  console.log(`   Consistent time: ${consistentHour}:${consistentMinute.toString().padStart(2, '0')}`)
  
  // Get active days for scheduling
  const activeDays = campaignSettings?.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const dayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }
  
  function isActiveDayOfWeek(dayOfWeek) {
    return activeDays.includes(dayMap[dayOfWeek])
  }
  
  // Sort sequences by step_number
  const sortedSequences = sequences.sort((a, b) => (a.step_number || 1) - (b.step_number || 1))
  
  const steps = []
  let baseDate = new Date() // Start from contact creation
  
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
    
    steps.push({
      step: stepNumber,
      subject: seq.subject || `Email ${stepNumber}`,
      scheduled_date: scheduledDate.toISOString(),
      timezone: timezone,
      timing_days: timingDays,
      status: 'pending' // Will be updated as emails are sent
    })
    
    console.log(`📅 Step ${stepNumber}: ${seq.subject} - ${scheduledDate.toLocaleString('en-US', { timeZone: timezone })} (${timingDays} days)`)
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

async function testScheduleGeneration() {
  try {
    console.log('🧪 Testing sequence schedule generation...')
    
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
    
    console.log('\n📋 Campaign Sequences:')
    sequences.forEach(seq => {
      console.log(`   Step ${seq.step_number}: ${seq.subject} (${seq.timing_days} days)`)
    })
    
    console.log('\n⚙️ Campaign Settings:', settings?.active_days)
    
    // Test with a sample contact
    const testContact = {
      id: 9999,
      email: 'test@example.com',
      location: 'London',
      sequence_step: 0
    }
    
    console.log('\n🧪 Generating schedule for test contact...')
    const schedule = generateContactSequenceSchedule(testContact, sequences, settings)
    
    console.log('\n📊 Generated Schedule:')
    console.log(JSON.stringify(schedule, null, 2))
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testScheduleGeneration()