const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchedules() {
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, email, sequence_step, next_email_due, sequence_schedule')
    .eq('campaign_id', '2e2fbedd-6df7-4db5-928a-ab96e2e5658e')
    .order('sequence_step', { ascending: false })
  
  console.log('📊 Contact Sequence Schedules:')
  console.log('===============================================')
  
  for (const contact of contacts) {
    console.log(`\n📧 ${contact.email}`)
    console.log(`   Database sequence_step: ${contact.sequence_step}`)
    
    if (contact.sequence_schedule) {
      const schedule = contact.sequence_schedule
      console.log(`   Consistent time: ${schedule.consistent_hour}:${schedule.consistent_minute.toString().padStart(2, '0')}`)
      console.log(`   Timezone: ${schedule.timezone}`)
      
      console.log(`   Schedule steps:`)
      schedule.steps.forEach(step => {
        const date = new Date(step.scheduled_date)
        console.log(`     Step ${step.step}: ${step.status} - ${date.toLocaleString('en-US', { timeZone: schedule.timezone })}`)
      })
      
      if (contact.next_email_due) {
        const nextDue = new Date(contact.next_email_due)
        console.log(`   Next email due: ${nextDue.toLocaleString('en-US', { timeZone: schedule.timezone })}`)
      }
    } else {
      console.log('   ❌ No sequence_schedule')
    }
  }
}

checkSchedules()