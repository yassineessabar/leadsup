// Check current contact status
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkContactStatus() {
  try {
    console.log('🔍 Checking contact status...')
    
    const { data: contacts } = await supabase
      .from('contacts')
      .select('email, sequence_step, next_email_due, last_contacted_at, email_status')
      .eq('campaign_id', '2e2fbedd-6df7-4db5-928a-ab96e2e5658e')
      .order('email')
    
    const now = new Date()
    console.log(`⏰ Current time: ${now.toISOString()}`)
    console.log('\\n📊 Contact status:')
    
    contacts?.forEach(contact => {
      const nextDue = new Date(contact.next_email_due)
      const isDue = now >= nextDue
      const minutesUntilDue = Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60))
      
      console.log(`👤 ${contact.email}:`)
      console.log(`   Step: ${contact.sequence_step}`)
      console.log(`   Status: ${contact.email_status}`)
      console.log(`   Next due: ${contact.next_email_due}`)
      console.log(`   Is due: ${isDue ? '✅ YES' : '❌ NO'} (${minutesUntilDue} min)`)
      console.log(`   Last contacted: ${contact.last_contacted_at}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkContactStatus()