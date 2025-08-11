#!/usr/bin/env node

/**
 * Test Inbox Insert Script
 * 
 * This script tests inserting a message into inbox_messages
 * to see what constraint or error is causing the issue.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testInboxInsert() {
  console.log('🧪 TESTING INBOX MESSAGE INSERT\n')

  try {
    // First get a real user_id from campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .limit(1)

    if (!campaigns || campaigns.length === 0) {
      console.error('❌ No campaigns found')
      return
    }

    const campaign = campaigns[0]
    console.log(`📋 Using campaign: ${campaign.id}, User: ${campaign.user_id}`)

    // Generate conversation ID like the code does
    const generateConversationId = (contactEmail, senderEmail, campaignId) => {
      const participants = [contactEmail, senderEmail].sort().join('|')
      const base = participants + `|${campaignId}`
      return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
    }

    const contactEmail = 'test@example.com'
    const senderEmail = 'sender@domain.com'
    const conversationId = generateConversationId(contactEmail, senderEmail, campaign.id)

    console.log(`🧵 Generated conversation ID: ${conversationId}`)

    // Try to insert a test message
    const testMessage = {
      user_id: campaign.user_id,
      message_id: `test-message-${Date.now()}`,
      thread_id: null,
      conversation_id: conversationId,
      campaign_id: campaign.id,
      contact_id: null,
      contact_email: contactEmail,
      contact_name: 'Test Contact',
      sender_email: senderEmail,
      subject: 'Test Email Subject',
      body_text: 'This is a test email body.',
      body_html: '<p>This is a <strong>test</strong> email body.</p>',
      direction: 'outbound',
      channel: 'email',
      message_type: 'email',
      status: 'sent',
      folder: 'sent',
      provider: 'smtp',
      provider_data: {},
      sent_at: new Date().toISOString()
    }

    console.log('📤 Attempting to insert test message...')
    console.log('📧 Message data:', JSON.stringify(testMessage, null, 2))

    const { data: insertedMessage, error: insertError } = await supabase
      .from('inbox_messages')
      .insert(testMessage)
      .select()
      .single()

    if (insertError) {
      console.error('❌ INBOX MESSAGE INSERT FAILED:')
      console.error('❌ Error:', JSON.stringify(insertError, null, 2))
    } else {
      console.log('✅ SUCCESS: Message inserted successfully!')
      console.log('✅ Inserted message ID:', insertedMessage.id)
    }

    // Also try to create/update the thread
    console.log('\n🧵 Attempting to upsert thread...')
    const { data: threadData, error: threadError } = await supabase
      .from('inbox_threads')
      .upsert({
        user_id: campaign.user_id,
        conversation_id: conversationId,
        thread_id: null,
        campaign_id: campaign.id,
        contact_id: null,
        contact_email: contactEmail,
        contact_name: 'Test Contact',
        subject: 'Test Email Subject',
        last_message_at: new Date().toISOString(),
        last_message_preview: 'This is a test email body.',
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })
      .select()

    if (threadError) {
      console.error('❌ THREAD UPSERT FAILED:')
      console.error('❌ Error:', JSON.stringify(threadError, null, 2))
    } else {
      console.log('✅ SUCCESS: Thread upserted successfully!')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testInboxInsert().then(() => {
  console.log('\n✅ Test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})