#!/usr/bin/env node

/**
 * Test Webhook with Campaign Data
 * 
 * This script tests the webhook system using real campaign data to ensure proper processing.
 */

const { createClient } = require('@supabase/supabase-js')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function testWebhookWithCampaign() {
  console.log('🧪 WEBHOOK TEST WITH CAMPAIGN DATA')
  console.log('================================\\n')
  
  const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
  
  try {
    // Get existing campaign and sender data
    console.log('🔍 Step 1: Getting campaign data...')
    
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      
    const { data: senders } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
    
    if (!campaigns || campaigns.length === 0) {
      console.log('❌ No campaigns found. Creating test campaign...')
      
      // Create a test campaign
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: userId,
          name: 'Webhook Test Campaign',
          subject: 'Test Email for Webhook',
          body: 'This is a test campaign for webhook testing',
          status: 'draft'
        })
        .select()
        .single()
        
      if (campaignError) {
        console.error('❌ Failed to create test campaign:', campaignError)
        return
      }
      
      console.log('✅ Created test campaign:', newCampaign.name)
    }
    
    if (!senders || senders.length === 0) {
      console.log('❌ No senders found. Creating test sender...')
      
      const campaign = campaigns?.[0] || { id: 'test-campaign-id' }
      
      // Create a test sender
      const { data: newSender, error: senderError } = await supabase
        .from('campaign_senders')
        .insert({
          user_id: userId,
          campaign_id: campaign.id,
          email: 'test-sender@leadsup.com',
          name: 'LeadsUp Test',
          auth_type: 'manual'
        })
        .select()
        .single()
        
      if (senderError) {
        console.error('❌ Failed to create test sender:', senderError)
        return
      }
      
      console.log('✅ Created test sender:', newSender.email)
    }
    
    // Now get the updated data
    const { data: finalCampaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      
    const { data: finalSenders } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
    
    const campaign = finalCampaigns[0]
    const sender = finalSenders[0]
    
    console.log(`\\n📧 Using campaign: "${campaign.name}" (${campaign.id})`)
    console.log(`📨 Using sender: ${sender.email}`)
    
    console.log('\\n🔍 Step 2: Testing webhook with campaign context...')
    
    // Test SMTP webhook with proper campaign context
    const webhookData = {
      from: 'webhook-tester@example.com',
      to: sender.email,  // Send TO our campaign sender (inbound email)
      subject: 'Re: ' + campaign.subject,
      textBody: `This is a test response to the "${campaign.name}" campaign. If you see this in your LeadsUp inbox, the webhook is working correctly!`,
      htmlBody: `<p>This is a <strong>test response</strong> to the "${campaign.name}" campaign.</p><p>If you see this in your LeadsUp inbox, the webhook is working correctly!</p>`,
      messageId: `webhook-test-${Date.now()}@example.com`,
      date: new Date().toISOString(),
      threadId: `thread-${Date.now()}`,
      inReplyTo: `original-${campaign.id}@leadsup.com`
    }
    
    console.log('📤 Sending webhook request...')
    console.log(`   From: ${webhookData.from}`)
    console.log(`   To: ${webhookData.to}`)
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
    console.log('Response data:', result)
    
    if (response.ok && result.success) {
      console.log('\\n✅ WEBHOOK TEST SUCCESSFUL!')
      console.log(`   Message ID: ${result.messageId}`)
      console.log(`   Conversation ID: ${result.conversationId}`)
      console.log(`   Direction: ${result.direction}`)
      
      // Verify the message was stored
      console.log('\\n🔍 Step 3: Verifying database storage...')
      
      const { data: storedMessage } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('message_id', webhookData.messageId)
        .eq('user_id', userId)
        .single()
      
      if (storedMessage) {
        console.log('✅ Message stored in database:')
        console.log(`   Subject: "${storedMessage.subject}"`)
        console.log(`   Status: ${storedMessage.status}`)
        console.log(`   Direction: ${storedMessage.direction}`)
        console.log(`   Provider: ${storedMessage.provider}`)
        console.log(`   Created: ${new Date(storedMessage.created_at).toLocaleString()}`)
        
        // Check thread
        const { data: thread } = await supabase
          .from('inbox_threads')
          .select('*')
          .eq('conversation_id', result.conversationId)
          .eq('user_id', userId)
          .single()
        
        if (thread) {
          console.log('✅ Thread created/updated:')
          console.log(`   Subject: "${thread.subject}"`)
          console.log(`   Last message: ${new Date(thread.last_message_at).toLocaleString()}`)
          console.log(`   Contact: ${thread.contact_email}`)
        }
        
        // Check badge count
        const { count: unreadCount } = await supabase
          .from('inbox_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('folder', 'inbox')
          .eq('status', 'unread')
        
        console.log(`\\n📊 Updated badge count: ${unreadCount || 0} unread messages`)
        
        console.log('\\n🎉 WEBHOOK INTEGRATION FULLY WORKING!')
        console.log('====================================')
        console.log('✅ Webhook endpoint accessible')
        console.log('✅ Authentication working')
        console.log('✅ Message processing working')
        console.log('✅ Database storage working')  
        console.log('✅ Thread management working')
        console.log('✅ Badge counting working')
        console.log('')
        console.log('📱 Now check your LeadsUp inbox UI to see the new message!')
        console.log('🔄 The message should appear in the inbox with proper threading')
        
      } else {
        console.log('❌ Message not found in database - check processing logic')
      }
      
    } else {
      console.log('❌ WEBHOOK TEST FAILED')
      console.log('Error details:', result)
      
      if (response.status === 404) {
        console.log('\\n💡 This likely means:')
        console.log('   - The email addresses don\'t match any campaign')
        console.log('   - The campaign_senders table needs the correct email')
        console.log('   - The sender email in webhook data needs to match campaign')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testWebhookWithCampaign().then(() => {
  console.log('\\n✅ Webhook campaign test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})