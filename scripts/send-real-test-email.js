#!/usr/bin/env node

/**
 * Send Real Test Email
 * 
 * This script sends a real email that can be replied to,
 * allowing us to test the complete thread functionality.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function sendRealTestEmail() {
  console.log('📤 SENDING REAL TEST EMAIL FOR REPLY TESTING');
  console.log('===========================================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // First, let's check what campaigns and contacts are available
    console.log('🔍 Checking available campaigns and contacts...')
    
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(5)
    
    console.log(`Found ${campaigns?.length || 0} active campaigns`)
    
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .limit(10)
    
    console.log(`Found ${contacts?.length || 0} contacts`)
    
    if (!campaigns?.length || !contacts?.length) {
      console.log('\n💡 No active campaigns or contacts found.')
      console.log('Let me create a test campaign and contact for email testing...')
      
      // Create a test contact
      const testContact = {
        user_id: userId,
        first_name: 'Test',
        last_name: 'Recipient', 
        email: 'yassine.essabar@gmail.com', // Replace with your email
        company: 'Test Company',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data: insertedContact, error: contactError } = await supabase
        .from('contacts')
        .insert(testContact)
        .select()
        .single()
      
      if (contactError) {
        console.error('❌ Error creating test contact:', contactError)
        return
      }
      
      console.log(`✅ Created test contact: ${insertedContact.email}`)
      
      // Create a test campaign
      const testCampaign = {
        user_id: userId,
        name: 'Test Email Thread Campaign',
        type: 'email',
        status: 'active',
        subject: 'Thread Test - Please Reply to This Email',
        settings: {
          daily_limit: 10,
          business_hours_only: true,
          timezone: 'America/New_York'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data: insertedCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert(testCampaign)
        .select()
        .single()
      
      if (campaignError) {
        console.error('❌ Error creating test campaign:', campaignError)
        return
      }
      
      console.log(`✅ Created test campaign: "${insertedCampaign.name}"`)
      
      // Create a test sequence step
      const testSequence = {
        user_id: userId,
        campaign_id: insertedCampaign.id,
        step_number: 1,
        type: 'email',
        subject: 'Thread Test - Please Reply to This Email 🧪',
        content: `Hi there!

This is a test email to verify our inbox threading functionality. 

🎯 What we're testing:
1. Email sending from the campaign system
2. Thread creation in the inbox
3. Reply handling and thread expansion
4. Badge count updates

Please reply to this email so we can test the complete thread functionality!

Best regards,
The LeadsUp Team

---
Test ID: ${Date.now()}
Campaign: Thread Testing`,
        delay_days: 0,
        delay_hours: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data: insertedSequence, error: sequenceError } = await supabase
        .from('campaign_sequences')
        .insert(testSequence)
        .select()
        .single()
      
      if (sequenceError) {
        console.error('❌ Error creating test sequence:', sequenceError)
        return
      }
      
      console.log(`✅ Created test sequence step: "${insertedSequence.subject}"`)
      
      // Create campaign contact relationship
      const campaignContact = {
        campaign_id: insertedCampaign.id,
        contact_id: insertedContact.id,
        user_id: userId,
        status: 'active',
        current_step: 0, // Will be sent step 1
        next_send_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { error: ccError } = await supabase
        .from('campaign_contacts')
        .insert(campaignContact)
      
      if (ccError) {
        console.error('❌ Error linking campaign and contact:', ccError)
        return
      }
      
      console.log('✅ Linked campaign and contact for sending')
    }
    
    // Now trigger the email sending
    console.log('\n🚀 Triggering email send automation...')
    
    // Check if we have API credentials
    const username = process.env.N8N_API_USERNAME
    const password = process.env.N8N_API_PASSWORD
    
    if (!username || !password) {
      console.log('❌ Missing API credentials for automated sending')
      console.log('💡 You can manually trigger email sending from the campaigns page')
      console.log('📧 Or set N8N_API_USERNAME and N8N_API_PASSWORD in your .env.local')
      return
    }
    
    const auth = Buffer.from(`${username}:${password}`).toString('base64')
    
    const response = await fetch('http://localhost:3000/api/campaigns/automation/send-emails', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    
    if (result.success && result.sent > 0) {
      console.log('✅ Email sent successfully!')
      console.log(`📊 Emails sent: ${result.sent}`)
      
      console.log('\n🎯 NEXT STEPS:')
      console.log('1. ✅ Test email sent to your inbox')
      console.log('2. 📧 Check your email and reply to the test message')
      console.log('3. 🔄 Wait 1-2 minutes for webhook processing')
      console.log('4. 📱 Refresh inbox UI to see the reply in the thread')
      console.log('5. 🧵 Click to expand the thread and see the conversation')
      console.log('6. 📊 Verify badge counts update correctly')
      
      // Check for the sent message in inbox
      console.log('\n🔍 Checking if sent email appears in inbox...')
      
      setTimeout(async () => {
        const { data: sentMessages } = await supabase
          .from('inbox_messages')
          .select('*')
          .eq('user_id', userId)
          .eq('direction', 'outbound')
          .order('created_at', { ascending: false })
          .limit(3)
        
        const testMessage = sentMessages?.find(msg => msg.subject?.includes('Thread Test'))
        
        if (testMessage) {
          console.log('✅ Sent email found in inbox:')
          console.log(`   Subject: "${testMessage.subject}"`)
          console.log(`   To: ${testMessage.contact_email}`)
          console.log(`   Conversation ID: ${testMessage.conversation_id}`)
          console.log(`   Status: ${testMessage.status}`)
        } else {
          console.log('⚠️  Sent email not yet visible in inbox (may take a moment)')
        }
      }, 2000)
      
    } else {
      console.log('ℹ️ Email send result:', result)
      if (result.sent === 0) {
        console.log('💡 No emails were sent - this could mean:')
        console.log('   - Rate limiting is active')
        console.log('   - Contact already received email today')
        console.log('   - Campaign timing restrictions')
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error)
  }
}

// Run the script
sendRealTestEmail().then(() => {
  console.log('\n✅ Real test email script complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
});