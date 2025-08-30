const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugTimingMismatch() {
  // Get the contact with the schedule you showed
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('campaign_id', '2e2fbedd-6df7-4db5-928a-ab96e2e5658e')
    .not('sequence_schedule', 'is', null)
  
  console.log('🔍 Debugging timing for all contacts:')
  console.log('===========================================')
  
  for (const contact of contacts) {
    const schedule = contact.sequence_schedule
    
    if (schedule) {
      console.log(`\n📧 ${contact.email} (ID: ${contact.id})`)
      console.log(`   Contact Hash: ${schedule.contact_hash}`)
      console.log(`   Consistent Time: ${schedule.consistent_hour}:${schedule.consistent_minute.toString().padStart(2, '0')}`)
      console.log(`   Timezone: ${schedule.timezone}`)
      
      // Show each step timing
      schedule.steps.forEach(step => {
        const date = new Date(step.scheduled_date)
        console.log(`   Step ${step.step}: ${date.toISOString()} = ${date.toLocaleString('en-US', { timeZone: schedule.timezone })}`)
      })
      
      // Calculate what the hash SHOULD be for this contact ID
      const contactIdString = contact.id.toString()
      const correctHash = contactIdString.split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0)
      }, 0)
      
      const correctSeed = (correctHash + 1) % 1000
      const correctHour = 9 + (correctSeed % 8)
      const correctMinute = (correctSeed * 7) % 60
      
      console.log(`   Expected Hash: ${correctHash} (stored: ${schedule.contact_hash})`)
      console.log(`   Expected Time: ${correctHour}:${correctMinute.toString().padStart(2, '0')} (stored: ${schedule.consistent_hour}:${schedule.consistent_minute.toString().padStart(2, '0')})`)
      
      if (correctHash !== schedule.contact_hash || correctHour !== schedule.consistent_hour || correctMinute !== schedule.consistent_minute) {
        console.log(`   ⚠️ MISMATCH! Schedule has wrong timing`)
      } else {
        console.log(`   ✅ Schedule timing is correct`)
      }
    }
  }
}

debugTimingMismatch()