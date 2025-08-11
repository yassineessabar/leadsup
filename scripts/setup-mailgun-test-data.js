#!/usr/bin/env node

/**
 * Setup Mailgun Test Data
 * 
 * Creates test campaign sender for Mailgun sandbox domain
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function setupMailgunTestData() {
  console.log('🔧 SETUP MAILGUN TEST DATA')
  console.log('==========================\n')
  
  const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
  const campaignId = '648b0900-06b2-4d3f-80b8-1e8fad4ae4c6'
  const testSenderEmail = 'campaign@sandbox09593b053aaa4a158cfdada61cbbdb0d.mailgun.org'
  
  try {
    console.log('📧 Adding campaign sender for Mailgun domain...')
    console.log(`   Email: ${testSenderEmail}`)
    console.log(`   Campaign: ${campaignId}`)
    
    // Add campaign sender for sandbox domain
    const { data: sender, error: senderError } = await supabase
      .from('campaign_senders')
      .upsert({
        user_id: userId,
        campaign_id: campaignId,
        email: testSenderEmail,
        name: 'LeadsUp Mailgun Test',
        auth_type: 'mailgun'
      }, {
        onConflict: 'email'
      })
      .select()
      .single()
    
    if (senderError) {
      console.log('⚠️  Sender upsert result:', senderError.message)
    } else {
      console.log('✅ Campaign sender configured')
      console.log(`   ID: ${sender.id}`)
      console.log(`   Name: ${sender.name}`)
    }
    
    console.log('')
    console.log('👤 Adding test contact...')
    
    // Add test contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert({
        email: 'prospect@example.com',
        first_name: 'Test',
        last_name: 'Prospect',
        company: 'Mailgun Test Company',
        email_status: 'Valid'
      }, {
        onConflict: 'email'
      })
      .select()
      .single()
    
    if (contactError) {
      console.log('⚠️  Contact upsert result:', contactError.message)
    } else {
      console.log('✅ Test contact configured')
      console.log(`   Email: ${contact.email}`)
      console.log(`   Name: ${contact.first_name} ${contact.last_name}`)
    }
    
    console.log('')
    console.log('🎯 TEST CONFIGURATION READY!')
    console.log('============================')
    console.log('Now you can test with:')
    console.log('')
    console.log(`📤 From: prospect@example.com (test contact)`)
    console.log(`📧 To: ${testSenderEmail} (campaign sender)`)
    console.log('')
    console.log('This simulates a prospect replying to your campaign email.')
    console.log('')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Run setup
setupMailgunTestData().then(() => {
  console.log('✅ Mailgun test data setup complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})