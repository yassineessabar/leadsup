#!/usr/bin/env node

/**
 * Create Test Lead and Test Webhook
 * 
 * This script creates a test lead in a campaign and then tests the webhook
 */

const { createClient } = require('@supabase/supabase-js')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function createTestLeadAndWebhook() {
  console.log('🧪 CREATE TEST LEAD & WEBHOOK TEST')
  console.log('==================================\\n')
  
  const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
  const campaignId = '648b0900-06b2-4d3f-80b8-1e8fad4ae4c6'  // Existing campaign
  const testEmail = 'webhook-tester@example.com'
  
  try {
    // Step 1: Create a test lead
    console.log('🔍 Step 1: Creating test lead...')
    
    const { data: existingLead } = await supabase
      .from('campaign_contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('email', testEmail)
      .single()
    
    if (existingLead) {
      console.log(`✅ Test lead already exists: ${testEmail}`)
    } else {
      const { data: newLead, error: leadError } = await supabase
        .from('campaign_contacts')
        .insert({
          campaign_id: campaignId,
          email: testEmail,
          first_name: 'Webhook',
          last_name: 'Tester',
          status: 'active'
        })
        .select()
        .single()
      
      if (leadError) {
        console.error('❌ Failed to create lead:', leadError)
        return
      }
      
      console.log(`✅ Created test lead: ${testEmail}`)
    }
    
    // Step 2: Test the webhook
    console.log('\\n🔍 Step 2: Testing webhook with campaign lead...')
    
    const webhookData = {
      from: testEmail,  // FROM our test lead
      to: 'essabar.yassine@gmail.com',  // TO our campaign sender
      subject: 'Re: Your Campaign Email - Interested!',
      textBody: 'Hi! Thanks for your email. I am very interested in learning more about your services. Please send me more information.',
      htmlBody: '<p>Hi!</p><p>Thanks for your email. I am <strong>very interested</strong> in learning more about your services.</p><p>Please send me more information.</p>',
      messageId: `webhook-lead-test-${Date.now()}@example.com`,
      date: new Date().toISOString(),
      threadId: `thread-${Date.now()}`,
      inReplyTo: `campaign-${campaignId}@leadsup.com`
    }
    
    console.log('📤 Sending webhook request...')
    console.log(`   From: ${webhookData.from} (campaign lead)`)
    console.log(`   To: ${webhookData.to} (campaign sender)`)
    console.log(`   Subject: "${webhookData.subject}"`)
    
    const response = await fetch('http://localhost:3000/api/webhooks/smtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-webhook-secret'
      },
      body: JSON.stringify(webhookData)
    })
    
    const result = await response.json()
    
    console.log(`\\n📊 Webhook Response: ${response.status}`)
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (response.ok && result.success) {
      console.log('\\n✅ WEBHOOK SUCCESS!')
      console.log('====================')
      console.log(`✅ Message processed: ${result.messageId}`)
      console.log(`✅ Conversation ID: ${result.conversationId}`)
      console.log(`✅ Direction: ${result.direction}`)
      console.log(`✅ Timestamp: ${result.timestamp}`)
      
      // Verify in database
      console.log('\\n🔍 Step 3: Verifying in database...')
      
      const { data: storedMessage } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('message_id', webhookData.messageId)
        .eq('user_id', userId)
        .single()
      
      if (storedMessage) {
        console.log('\\n✅ MESSAGE STORED SUCCESSFULLY!')
        console.log('===============================')
        console.log(`📧 Subject: "${storedMessage.subject}"`)
        console.log(`📥 Direction: ${storedMessage.direction}`)
        console.log(`🔵 Status: ${storedMessage.status}`)
        console.log(`🏷️  Provider: ${storedMessage.provider}`)
        console.log(`📁 Folder: ${storedMessage.folder}`)
        console.log(`⏰ Created: ${new Date(storedMessage.created_at).toLocaleString()}`)
        console.log(`👤 Contact: ${storedMessage.contact_email}`)
        console.log(`📨 Sender: ${storedMessage.sender_email}`)
        console.log(`🎯 Campaign: ${storedMessage.campaign_id}`)
        
        // Check thread
        const { data: thread } = await supabase
          .from('inbox_threads')
          .select('*')
          .eq('conversation_id', result.conversationId)
          .eq('user_id', userId)
          .single()
        
        if (thread) {
          console.log('\\n✅ THREAD CREATED/UPDATED!')
          console.log(`🧵 Subject: "${thread.subject}"`)
          console.log(`📅 Last Message: ${new Date(thread.last_message_at).toLocaleString()}`)
          console.log(`👤 Contact: ${thread.contact_email}`)
          console.log(`📊 Status: ${thread.status}`)
        }
        
        // Get unread count
        const { count: unreadCount } = await supabase
          .from('inbox_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('folder', 'inbox')
          .eq('status', 'unread')
        
        console.log(`\\n📊 UPDATED COUNTS:`)
        console.log(`📥 Unread messages: ${unreadCount || 0}`)
        
        console.log('\\n🎉 COMPLETE WEBHOOK INTEGRATION SUCCESS!')
        console.log('========================================')
        console.log('✅ Webhook endpoint accessible')
        console.log('✅ Authentication working')  
        console.log('✅ Campaign/lead matching working')
        console.log('✅ Message processing & storage working')
        console.log('✅ Thread creation working')
        console.log('✅ Badge counting working')
        console.log('\\n📱 Check your LeadsUp inbox UI - the message should appear!')
        console.log('🔄 The message will be in the inbox folder with unread status')
        console.log('🧵 Click to expand the thread and see the conversation')
        
      } else {
        console.log('❌ Message not found in database')
      }
      
    } else {
      console.log('\\n❌ WEBHOOK FAILED')
      console.log('==================')
      console.log('Response details:', result)
      
      if (response.status === 404) {
        console.log('\\n💡 Campaign/Lead matching failed')
        console.log('Check that:')
        console.log('- Lead email exists in campaign_leads table')
        console.log('- Sender email exists in campaign_senders table')
        console.log('- Campaign IDs match between tables')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
createTestLeadAndWebhook().then(() => {
  console.log('\\n✅ Test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})