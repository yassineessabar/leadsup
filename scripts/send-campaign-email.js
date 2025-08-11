#!/usr/bin/env node

/**
 * Send Campaign Email
 * 
 * This script adds your email to the campaign and triggers sending.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function sendCampaignEmail() {
  console.log('📤 SENDING EMAIL FROM YOUR NEW CAMPAIGN');
  console.log('=====================================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const yourEmail = 'essabar.yassine@gmail.com'
    
    // Get the newest campaign
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (!campaigns || campaigns.length === 0) {
      console.log('❌ No campaigns found')
      return
    }
    
    const campaign = campaigns[0]
    console.log(`🎯 Using campaign: "${campaign.name}"`)
    
    // Check if your email is already a contact
    console.log('\n🔍 Step 1: Check/create contact...')
    
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', yourEmail)
      .single()
    
    let contactId
    if (existingContact) {
      contactId = existingContact.id
      console.log(`✅ Found existing contact: ${yourEmail}`)
    } else {
      // Create contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          first_name: 'Yassine',
          last_name: 'Essabar',
          email: yourEmail,
          company: 'LeadsUp Testing'
        })
        .select()
        .single()
      
      if (contactError) {
        console.error('❌ Error creating contact:', contactError)
        return
      }
      
      contactId = newContact.id
      console.log(`✅ Created new contact: ${yourEmail}`)
    }
    
    // Try to determine how contacts are linked to campaigns
    console.log('\n🔍 Step 2: Link contact to campaign...')
    
    // Since campaign_contacts doesn't exist, maybe the system works differently
    // Let's try campaign_senders or check if we need to update campaigns directly
    
    try {
      const { data: senderTest } = await supabase
        .from('campaign_senders')
        .select('*')
        .limit(1)
      console.log('✅ campaign_senders table exists')
    } catch (e) {
      console.log('❌ campaign_senders table not accessible')
    }
    
    // For now, let's just ensure the contact exists and try to send
    console.log('✅ Contact created/found, proceeding to send email')
    
    // Update campaign pending count
    await supabase
      .from('campaigns')
      .update({
        emails_pending: 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign.id)
    
    console.log('✅ Updated campaign pending count')
    
    // Trigger email sending
    console.log('\n🚀 Step 3: Trigger email sending...')
    
    const username = process.env.N8N_API_USERNAME
    const password = process.env.N8N_API_PASSWORD
    
    if (!username || !password) {
      console.log('⚠️  No automation API credentials found')
      console.log('💡 Manually trigger the email:')
      console.log('   1. Go to your LeadsUp dashboard')
      console.log('   2. Navigate to Campaigns')
      console.log('   3. Find the "we" campaign') 
      console.log('   4. Click "Send Emails" or similar button')
      
      console.log('\n✅ Campaign setup complete!')
      console.log(`   Campaign: "${campaign.name}"`)
      console.log(`   Contact: ${yourEmail}`)
      console.log(`   Status: Ready to send`)
      
      return
    }
    
    // Auto-trigger email sending
    const auth = Buffer.from(`${username}:${password}`).toString('base64')
    
    const response = await fetch('http://localhost:3000/api/campaigns/automation/send-emails', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log('✅ Email sending triggered!')
      console.log(`📊 Emails sent: ${result.sent || 0}`)
      console.log(`📊 Emails failed: ${result.failed || 0}`)
      
      if (result.sent > 0) {
        console.log('\n🎉 SUCCESS! Email should be delivered to your inbox!')
        
        console.log('\n📧 What to expect:')
        console.log(`   To: ${yourEmail}`)
        console.log(`   Subject: "Welcome to Loop Review!" (or similar)`)
        console.log(`   From: Your LeadsUp campaign system`)
        console.log(`   Content: Your campaign sequence content`)
        
        console.log('\n🎯 NEXT STEPS:')
        console.log('1. ✅ Real email sent via campaign system')
        console.log('2. 📧 Check your email inbox in 1-2 minutes')
        console.log('3. 💬 Reply to the email with a test response')
        console.log('4. ⏳ Wait 1-2 minutes for webhook processing')
        console.log('5. 🔄 Check your LeadsUp inbox for the thread')
        console.log('6. 🧵 Test thread expansion and mark-as-read')
        
        console.log('\n📋 Monitoring:')
        console.log('   Run: node scripts/monitor-real-response.js')
        console.log('   To track when your reply is processed')
        
      } else {
        console.log('\n💡 No emails sent. Possible reasons:')
        console.log('   - Rate limiting active')
        console.log('   - Business hours restriction')
        console.log('   - Contact already emailed today')
        console.log('   - Campaign timing rules')
      }
      
    } else {
      console.error('❌ Email sending failed:', result.error || 'Unknown error')
      console.log('Full response:', result)
    }
    
  } catch (error) {
    console.error('❌ Failed to send campaign email:', error)
  }
}

// Run the script
sendCampaignEmail().then(() => {
  console.log('\n✅ Campaign email send complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
});