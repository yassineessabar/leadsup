#!/usr/bin/env node

/**
 * Send Actual Email via Campaign System
 * 
 * This script creates a proper campaign and contact to send a real email
 * that will be delivered to your actual email inbox.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function sendActualEmail() {
  console.log('📤 SENDING ACTUAL EMAIL VIA CAMPAIGN SYSTEM');
  console.log('==========================================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const testEmail = 'essabar.yassine@gmail.com'
    
    console.log('🔍 Step 1: Check existing campaigns...')
    
    // Check for existing active campaigns
    const { data: existingCampaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'Active')
    
    console.log(`Found ${existingCampaigns?.length || 0} active campaigns`)
    
    let campaignId
    if (existingCampaigns && existingCampaigns.length > 0) {
      campaignId = existingCampaigns[0].id
      console.log(`✅ Using existing campaign: "${existingCampaigns[0].name}"`)
    } else {
      console.log('💡 Creating new test campaign...')
      
      // Create a test campaign
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: userId,
          name: '🧪 Thread Test Campaign',
          type: 'outreach',
          status: 'Active',
          description: 'Test campaign for inbox threading functionality',
          target_audience: 'Test recipients',
          settings: {
            daily_limit: 10,
            business_hours_only: false,
            timezone: 'America/New_York'
          },
          emails_pending: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (campaignError) {
        console.error('❌ Error creating campaign:', campaignError)
        return
      }
      
      campaignId = newCampaign.id
      console.log(`✅ Created new campaign: "${newCampaign.name}"`)
    }
    
    console.log('\n🔍 Step 2: Check/create contact...')
    
    // Check for existing contact
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('email', testEmail)
      .single()
    
    let contactId
    if (existingContact) {
      contactId = existingContact.id
      console.log(`✅ Using existing contact: ${testEmail}`)
    } else {
      console.log('💡 Creating new test contact...')
      
      // Create test contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          first_name: 'Test',
          last_name: 'Recipient',
          email: testEmail,
          company: 'Thread Testing Co',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (contactError) {
        console.error('❌ Error creating contact:', contactError)
        return
      }
      
      contactId = newContact.id
      console.log(`✅ Created new contact: ${testEmail}`)
    }
    
    console.log('\n🔍 Step 3: Check campaign sequences...')
    
    // Check for existing sequences in the campaign
    const { data: existingSequences } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
    
    let sequenceId
    if (existingSequences && existingSequences.length > 0) {
      sequenceId = existingSequences[0].id
      console.log(`✅ Using existing sequence: "${existingSequences[0].title || existingSequences[0].subject}"`)
    } else {
      console.log('💡 Creating new test sequence...')
      
      // Create test sequence
      const { data: newSequence, error: sequenceError } = await supabase
        .from('campaign_sequences')
        .insert({
          campaign_id: campaignId,
          step_number: 1,
          sequence_number: 1,
          sequence_step: 1,
          title: 'Thread Test Email',
          subject: '🧪 Thread Test - Please Reply to Test Threading!',
          content: `Hi there!

This is a REAL test email sent from the LeadsUp campaign system to test our inbox threading functionality.

🎯 What we're testing:
1. ✅ Real email delivery to your inbox
2. 📧 You can reply to this email  
3. 🧵 Reply appears in the same thread/conversation
4. 📱 Thread expands to show the full conversation
5. 📊 Badge counts update correctly
6. 🔄 Thread sorting works properly

Please reply to this email with "This is my test reply!" so we can verify the threading functionality works end-to-end.

Thanks for testing!

Best regards,
The LeadsUp Team

---
Test ID: ${Date.now()}
Campaign: Thread Testing
System: Real Email via Campaign API`,
          outreach_method: 'email',
          timing_days: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (sequenceError) {
        console.error('❌ Error creating sequence:', sequenceError)
        return
      }
      
      sequenceId = newSequence.id
      console.log(`✅ Created new sequence: "${newSequence.title}"`)
    }
    
    console.log('\n🔍 Step 4: Set up campaign contact relationship...')
    
    // Check if contact is already in campaign
    const { data: existingCampaignContact } = await supabase
      .from('campaign_contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('contact_id', contactId)
      .single()
    
    if (existingCampaignContact) {
      console.log('✅ Contact already in campaign')
      
      // Reset to send the first email again
      await supabase
        .from('campaign_contacts')
        .update({
          current_step: 0,
          last_contacted: null,
          next_contact_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCampaignContact.id)
      
      console.log('✅ Reset campaign contact to send email')
    } else {
      console.log('💡 Adding contact to campaign...')
      
      const { error: ccError } = await supabase
        .from('campaign_contacts')
        .insert({
          campaign_id: campaignId,
          contact_id: contactId,
          user_id: userId,
          current_step: 0,
          next_contact_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (ccError) {
        console.error('❌ Error linking campaign and contact:', ccError)
        return
      }
      
      console.log('✅ Added contact to campaign')
    }
    
    console.log('\n🚀 Step 5: Trigger email sending...')
    
    // Check if we have API credentials for automation
    const username = process.env.N8N_API_USERNAME
    const password = process.env.N8N_API_PASSWORD
    
    if (!username || !password) {
      console.log('⚠️  No automation API credentials found')
      console.log('💡 You can manually trigger the email from the campaigns page')
      console.log('📱 Go to your LeadsUp dashboard → Campaigns → Send emails')
      
      console.log('\n✅ Campaign setup complete!')
      console.log(`   Campaign ID: ${campaignId}`)
      console.log(`   Contact: ${testEmail}`)
      console.log(`   Subject: "🧪 Thread Test - Please Reply to Test Threading!"`)
      
      return
    }
    
    // Trigger automated email sending
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
      console.log('✅ Email sending triggered successfully!')
      console.log(`📊 Emails sent: ${result.sent || 0}`)
      console.log(`📊 Emails failed: ${result.failed || 0}`)
      
      if (result.sent > 0) {
        console.log('\n🎉 SUCCESS! Real email should be delivered shortly!')
        console.log('\n🎯 NEXT STEPS:')
        console.log('1. ✅ Real email sent via campaign system')
        console.log('2. 📧 Check your email inbox (essabar.yassine@gmail.com)')
        console.log('3. 🔍 Look for: "🧪 Thread Test - Please Reply to Test Threading!"')
        console.log('4. 💬 Reply with "This is my test reply!"')
        console.log('5. ⏳ Wait 1-2 minutes for webhook processing')
        console.log('6. 🔄 Run monitor script to check threading')
        console.log('7. 📱 Refresh LeadsUp inbox to see the thread')
        
        console.log('\n📧 Email Details:')
        console.log(`   To: ${testEmail}`)
        console.log(`   Subject: "🧪 Thread Test - Please Reply to Test Threading!"`)
        console.log(`   Campaign: Thread Test Campaign`)
        console.log(`   Delivery: Real email via Gmail API`)
        
      } else {
        console.log('\n💡 No emails were sent - this could mean:')
        console.log('   - Rate limiting is active')
        console.log('   - Contact already received email today')
        console.log('   - Campaign timing restrictions')
        console.log('   - Business hours only setting')
      }
      
    } else {
      console.error('❌ Email sending failed:', result.error || 'Unknown error')
      console.log('ℹ️ Full result:', result)
    }
    
  } catch (error) {
    console.error('❌ Failed to send actual email:', error)
  }
}

// Run the script
sendActualEmail().then(() => {
  console.log('\n✅ Actual email send script complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
});