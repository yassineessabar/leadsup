// Temporarily set a contact to be due now for testing
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function triggerTestEmail() {
  try {
    console.log('🔧 Setting up test email trigger...')
    
    // Find a contact that's not completed
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, email, sequence_step, sequence_schedule')
      .eq('campaign_id', '2e2fbedd-6df7-4db5-928a-ab96e2e5658e')
      .neq('email_status', 'Completed')
      .limit(1)
      .single()
    
    if (!contact) {
      console.log('❌ No available contact for testing')
      return
    }
    
    console.log(`👤 Using contact: ${contact.email} (step ${contact.sequence_step})`)
    
    // Reset to step 0 and set next_email_due to now
    const now = new Date()
    const { error } = await supabase
      .from('contacts')
      .update({
        sequence_step: 0,
        last_contacted_at: null,
        next_email_due: now.toISOString(),
        email_status: 'Pending'
      })
      .eq('id', contact.id)
    
    if (error) {
      console.error('❌ Error updating contact:', error)
      return
    }
    
    console.log(`✅ Contact ${contact.email} set to be due now`)
    console.log(`🕐 Next email due: ${now.toISOString()}`)
    console.log('\\n🚀 Now run the automation to test email sending!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

triggerTestEmail()