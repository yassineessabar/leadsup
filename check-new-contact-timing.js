const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkNewContactTiming() {
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('email', 'immediate-1756527952858@example.com')
    .single()
  
  if (!contact) {
    console.log('Contact not found')
    return
  }
  
  // Calculate what the timing should be
  const contactIdString = contact.id.toString()
  const contactHash = contactIdString.split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0)
  }, 0)
  
  const seedValue = (contactHash + 1) % 1000
  const consistentHour = 9 + (seedValue % 8)
  const consistentMinute = (seedValue * 7) % 60
  
  console.log('\n🔢 New Contact Timing Check:')
  console.log('===============================================')
  console.log(`Contact ID: ${contact.id}`)
  console.log(`Email: ${contact.email}`)
  console.log(`Sequence Step: ${contact.sequence_step}`)
  console.log(`Expected Hour: ${consistentHour}`)
  console.log(`Expected Minute: ${consistentMinute}`)
  console.log(`Expected Time: ${consistentHour}:${consistentMinute.toString().padStart(2, '0')}`)
  
  if (contact.next_email_due) {
    const nextDue = new Date(contact.next_email_due)
    console.log(`\n📅 Next Email Due:`)
    console.log(`UTC: ${contact.next_email_due}`)
    console.log(`London: ${nextDue.toLocaleString('en-US', { timeZone: 'Europe/London' })}`)
    console.log(`Sydney: ${nextDue.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })}`)
    console.log(`Hour (UTC): ${nextDue.getUTCHours()}`)
    console.log(`Minute (UTC): ${nextDue.getUTCMinutes()}`)
  }
  
  if (contact.last_contacted_at) {
    const lastContacted = new Date(contact.last_contacted_at)
    console.log(`\n📞 Last Contacted:`)
    console.log(`London: ${lastContacted.toLocaleString('en-US', { timeZone: 'Europe/London' })}`)
  }
}

checkNewContactTiming()