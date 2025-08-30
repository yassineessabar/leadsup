// Test the exact automation logic to see why it's not finding due contacts
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
  
  return 'Australia/Sydney' // Default
}

function getBusinessHoursStatusWithActiveDays(timezone, activeDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startHour = 9, endHour = 17) {
  try {
    const now = new Date()
    
    // Get current time in the contact's timezone
    const localTime = new Date(now.toLocaleString("en-US", {
      timeZone: timezone,
      hour12: false
    }))
    
    const currentHour = localTime.getHours()
    const currentDay = localTime.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Convert day number to string format
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const currentDayName = dayNames[currentDay]
    
    const isActiveDay = activeDays.includes(currentDayName)
    const isActiveHour = currentHour >= startHour && currentHour < endHour
    
    return {
      isBusinessHours: isActiveDay && isActiveHour,
      currentHour,
      currentDay: currentDayName,
      isActiveDay,
      isActiveHour,
      timezone,
      localTime: localTime.toLocaleString(),
      activeDays
    }
  } catch (error) {
    console.error('Error in business hours check:', error)
    return { isBusinessHours: true }
  }
}

async function testAutomationLogic() {
  console.log('🧪 Testing automation logic...')
  
  // Get the newest contact
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('id, email, next_email_due, sequence_step, location, campaign_id')
    .order('id', { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    console.log('❌ Error getting contact:', error.message)
    return
  }
  
  console.log('📧 Testing contact:', contact)
  
  // Check the exact logic from automation
  if (contact.next_email_due) {
    const scheduledDate = new Date(contact.next_email_due)
    const now = new Date()
    
    console.log(`⏰ Current time: ${now.toISOString()}`)
    console.log(`⏰ Scheduled time: ${scheduledDate.toISOString()}`)
    console.log(`⏰ Time reached: ${now >= scheduledDate}`)
    
    // Convert to Sydney time for display
    const nowSydney = now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
    const scheduledSydney = scheduledDate.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
    
    console.log(`🇦🇺 Current Sydney time: ${nowSydney}`)
    console.log(`🇦🇺 Scheduled Sydney time: ${scheduledSydney}`)
    
    // Get actual campaign settings
    const { data: campaignSettings } = await supabase
      .from('campaign_settings')
      .select('*')
      .eq('campaign_id', contact.campaign_id)
      .single()
    
    console.log('⚙️ Campaign settings:', campaignSettings)
    
    // Check business hours with actual campaign active days
    const timezone = deriveTimezoneFromLocation(contact.location) || 'Australia/Sydney'
    const activeDays = campaignSettings?.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    const businessStatus = getBusinessHoursStatusWithActiveDays(timezone, activeDays, 9, 17)
    
    console.log('🏢 Business hours status:', businessStatus)
    
    const isTimeReached = now >= scheduledDate
    const isDue = isTimeReached && businessStatus.isBusinessHours
    
    console.log(`✅ Final result - isDue: ${isDue}`)
    console.log(`   isTimeReached: ${isTimeReached}`)
    console.log(`   isBusinessHours: ${businessStatus.isBusinessHours}`)
    
  } else {
    console.log('❌ No next_email_due value found!')
  }
}

testAutomationLogic().catch(console.error)