// Check if email tracking records were created recently
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEmailTracking() {
  try {
    console.log('🔍 Checking recent email tracking records...')
    
    // Check last 30 minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    const { data: emails, error } = await supabase
      .from('email_tracking')
      .select('id, email, subject, status, sent_at, sg_message_id, category')
      .gte('sent_at', thirtyMinsAgo)
      .order('sent_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching emails:', error)
      return
    }
    
    console.log(`📊 Found ${emails.length} emails sent in last 30 minutes:`)
    emails.forEach(email => {
      console.log(`  📧 ${email.email} - ${email.subject} - ${email.status} - ${email.sent_at}`)
    })
    
    // Also check contact updates
    const { data: contacts } = await supabase
      .from('contacts')
      .select('email, sequence_step, last_contacted_at, next_email_due')
      .gte('last_contacted_at', thirtyMinsAgo)
      .order('last_contacted_at', { ascending: false })
    
    console.log(`\\n📊 Contacts updated in last 30 minutes:`)
    contacts?.forEach(contact => {
      console.log(`  👤 ${contact.email} - Step ${contact.sequence_step} - Last: ${contact.last_contacted_at}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkEmailTracking()