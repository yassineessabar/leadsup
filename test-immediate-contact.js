// Test adding a new contact that should be due immediately
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createImmediateContact() {
  try {
    console.log('⚡ Creating contact that should be due immediately...')
    
    const campaignId = '2e2fbedd-6df7-4db5-928a-ab96e2e5658e' // Loopreview campaign
    
    // Create a test contact
    const testContact = {
      email: `immediate-${Date.now()}@example.com`,
      first_name: 'Immediate',
      last_name: 'Test',
      company: 'Immediate Company',
      location: 'Sydney',
      campaign_id: campaignId,
      email_status: 'Valid',
      sequence_step: 0
    }
    
    console.log(`📧 Creating contact: ${testContact.email}`)
    
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
    
    // Set next_email_due to 5 minutes ago (should be due now)
    const pastTime = new Date()
    pastTime.setMinutes(pastTime.getMinutes() - 5)
    
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ next_email_due: pastTime.toISOString() })
      .eq('id', insertedContact.id)
    
    if (updateError) {
      console.log('❌ Update error:', updateError.message)
    } else {
      console.log(`✅ Set next_email_due to: ${pastTime.toISOString()}`)
      console.log(`🇦🇺 Sydney time: ${pastTime.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })}`)
      console.log('⚡ This contact should be picked up by automation NOW!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createImmediateContact()