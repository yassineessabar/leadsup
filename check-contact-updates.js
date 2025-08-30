const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkContacts() {
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, email, sequence_step, next_email_due, last_contacted_at')
    .eq('campaign_id', '2e2fbedd-6df7-4db5-928a-ab96e2e5658e')
    .order('last_contacted_at', { ascending: false })
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('\n📊 Contact Status:')
  console.log('===============================================')
  
  for (const contact of contacts) {
    const nextDue = contact.next_email_due 
      ? new Date(contact.next_email_due).toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
      : 'Not set'
    
    const lastContacted = contact.last_contacted_at
      ? new Date(contact.last_contacted_at).toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
      : 'Never'
    
    console.log(`\n📧 ${contact.email}`)
    console.log(`   Step: ${contact.sequence_step || 0}`)
    console.log(`   Next Due: ${nextDue}`)
    console.log(`   Last Contacted: ${lastContacted}`)
  }
}

checkContacts()