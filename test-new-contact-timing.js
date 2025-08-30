// Test adding a new contact with automatic next_email_due calculation
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

function deriveTimezoneFromLocation(location) {
  if (!location) return 'Australia/Sydney'
  
  const locationLower = location.toLowerCase()
  
  if (locationLower.includes('sydney') || locationLower.includes('australia')) {
    return 'Australia/Sydney'
  }
  if (locationLower.includes('melbourne')) {
    return 'Australia/Melbourne'
  }
  
  return 'Australia/Sydney' // Default
}

// Same calculation function as added to upload route
function calculateContactNextEmailDue(contact, sequences, campaignSettings) {
  const currentStep = contact.sequence_step || 0
  
  // Find next sequence step (first email for new contacts)
  const nextStepIndex = currentStep === 0 ? 0 : currentStep
  const nextSequence = sequences[nextStepIndex]
  
  if (!nextSequence) {
    return null // No sequences defined
  }
  
  const timezone = deriveTimezoneFromLocation(contact.location) || 'Australia/Sydney'
  const contactIdString = contact.id?.toString() || '0'
  
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
    // First email for new contact
    if (timingDays === 0) {
      scheduledDate = new Date()
    } else {
      scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + timingDays)
    }
  } else {
    // This shouldn't happen for new contacts, but handle it
    scheduledDate = new Date()
    scheduledDate.setDate(scheduledDate.getDate() + timingDays)
  }
  
  // Set consistent time
  scheduledDate.setHours(consistentHour, consistentMinute, 0, 0)
  
  // Handle campaign active days
  const activeDays = campaignSettings?.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  
  function isActiveDayOfWeek(dayOfWeek) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayName = dayNames[dayOfWeek]
    return activeDays.includes(dayName)
  }
  
  // Skip inactive days
  let dayOfWeek = scheduledDate.getDay()
  while (!isActiveDayOfWeek(dayOfWeek)) {
    scheduledDate.setDate(scheduledDate.getDate() + 1)
    dayOfWeek = scheduledDate.getDay()
  }
  
  return scheduledDate
}

async function testNewContactTiming() {
  try {
    console.log('🧪 Testing new contact with automatic timing...')
    
    const campaignId = '2e2fbedd-6df7-4db5-928a-ab96e2e5658e' // Loopreview campaign
    
    // Get campaign data
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()
    
    const { data: sequences } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('step_number', { ascending: true })
    
    const { data: settings } = await supabase
      .from('campaign_settings')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()
    
    console.log(`📋 Campaign: ${campaign.name}`)
    console.log(`📋 Sequences: ${sequences.length}`)
    console.log(`📋 Active days: ${settings.active_days.join(', ')}`)
    
    // Create a test contact
    const testContact = {
      email: `test-${Date.now()}@example.com`,
      first_name: 'Test',
      last_name: 'Contact',
      company: 'Test Company',
      location: 'Sydney',
      campaign_id: campaignId,
      email_status: 'Valid',
      sequence_step: 0
    }
    
    console.log(`📧 Creating test contact: ${testContact.email}`)
    
    // Insert the contact
    const { data: insertedContact, error: insertError } = await supabase
      .from('contacts')
      .insert(testContact)
      .select('id, email, location')
      .single()
    
    if (insertError) {
      console.log('❌ Insert error:', insertError.message)
      return
    }
    
    console.log(`✅ Contact created with ID: ${insertedContact.id}`)
    
    // Calculate next_email_due
    const nextEmailDue = calculateContactNextEmailDue(insertedContact, sequences, settings)
    
    if (nextEmailDue) {
      console.log(`📅 Calculated next_email_due: ${nextEmailDue.toISOString()}`)
      console.log(`🇦🇺 Sydney time: ${nextEmailDue.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })}`)
      
      // Update the contact with next_email_due
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ next_email_due: nextEmailDue.toISOString() })
        .eq('id', insertedContact.id)
      
      if (updateError) {
        console.log('❌ Update error:', updateError.message)
      } else {
        console.log('✅ next_email_due saved successfully!')
        
        // Verify it was saved
        const { data: verifyContact } = await supabase
          .from('contacts')
          .select('id, email, next_email_due')
          .eq('id', insertedContact.id)
          .single()
        
        console.log('🔍 Verification:', verifyContact)
      }
    } else {
      console.log('❌ Could not calculate next_email_due')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testNewContactTiming()