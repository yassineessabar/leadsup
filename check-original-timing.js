const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOriginalTiming() {
  const contactId = 1561 // ya.essabarry@gmail.com
  
  // Calculate what the consistent minute should be
  const contactIdString = contactId.toString()
  const contactHash = contactIdString.split('').reduce((hash, char) => {
    return ((hash << 5) - hash) + char.charCodeAt(0)
  }, 0)
  
  const seedValue = (contactHash + 1) % 1000
  const consistentHour = 9 + (seedValue % 8) // 9 AM - 5 PM
  const consistentMinute = (seedValue * 7) % 60
  
  console.log('\n🔢 Contact Hash Calculation:')
  console.log('===============================================')
  console.log(`Contact ID: ${contactId}`)
  console.log(`Contact Hash: ${contactHash}`)
  console.log(`Seed Value: ${seedValue}`)
  console.log(`Consistent Hour: ${consistentHour}`)
  console.log(`Consistent Minute: ${consistentMinute}`)
  console.log(`Expected Time: ${consistentHour}:${consistentMinute.toString().padStart(2, '0')}`)
  
  // Check actual database value
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, email, next_email_due')
    .eq('id', contactId)
    .single()
  
  if (contact && contact.next_email_due) {
    const actualDate = new Date(contact.next_email_due)
    console.log(`\n📅 Database Value:`)
    console.log(`Next Due: ${contact.next_email_due}`)
    console.log(`Sydney Time: ${actualDate.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })}`)
    console.log(`Hour: ${actualDate.getUTCHours()}`)
    console.log(`Minute: ${actualDate.getUTCMinutes()}`)
  }
}

checkOriginalTiming()