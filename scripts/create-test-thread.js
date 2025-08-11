#!/usr/bin/env node

/**
 * Create Test Thread
 * 
 * This script creates additional messages in an existing thread
 * to test the thread expansion functionality.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestThread() {
  console.log('🧵 CREATING TEST THREAD WITH MULTIPLE MESSAGES\n')

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // Use the first conversation
    const conversationId = 'ZWNvbW0yNDA1QGdtYWlsLmNvbXxlY29t' // ecomm2405@gmail.com thread
    const campaignId = '648b0900-06b2-4d3f-80b8-1e8fad4ae4c6'

    console.log(`👤 User: ${userId}`)
    console.log(`🧵 Conversation: ${conversationId}`)

    // Create additional messages to simulate a conversation
    const testMessages = [
      {
        direction: 'inbound',
        sender_email: 'ecomm2405@gmail.com',
        contact_email: 'ecomm2405@gmail.com',
        contact_name: 'Lisa Brown',
        subject: 'Re: Welcome to Loop Review!',
        body_text: 'Hi there!\n\nThanks for reaching out. I\'m interested in learning more about your reputation management services.\n\nBest regards,\nLisa',
        body_html: 'Hi there!<br><br>Thanks for reaching out. I\'m interested in learning more about your reputation management services.<br><br>Best regards,<br>Lisa',
        status: 'unread',
        folder: 'inbox',
        sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      },
      {
        direction: 'outbound',
        sender_email: 'support@loopteam.com',
        contact_email: 'ecomm2405@gmail.com',
        contact_name: 'Lisa Brown',
        subject: 'Re: Welcome to Loop Review!',
        body_text: 'Hi Lisa,\n\nGreat to hear from you! I\'d be happy to schedule a call to discuss how we can help.\n\nWhen would be a good time for you?\n\nBest,\nThe Loop Team',
        body_html: 'Hi Lisa,<br><br>Great to hear from you! I\'d be happy to schedule a call to discuss how we can help.<br><br>When would be a good time for you?<br><br>Best,<br>The Loop Team',
        status: 'read',
        folder: 'sent',
        sent_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
      },
      {
        direction: 'inbound',
        sender_email: 'ecomm2405@gmail.com',
        contact_email: 'ecomm2405@gmail.com', 
        contact_name: 'Lisa Brown',
        subject: 'Re: Welcome to Loop Review!',
        body_text: 'Perfect!\n\nHow about tomorrow at 2 PM EST?\n\nI look forward to speaking with you.\n\nLisa',
        body_html: 'Perfect!<br><br>How about tomorrow at 2 PM EST?<br><br>I look forward to speaking with you.<br><br>Lisa',
        status: 'unread',
        folder: 'inbox',
        sent_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      }
    ]

    console.log(`📧 Creating ${testMessages.length} additional messages...`)

    for (let i = 0; i < testMessages.length; i++) {
      const msg = testMessages[i]
      
      const messageData = {
        user_id: userId,
        message_id: `test-${Date.now()}-${i}`,
        conversation_id: conversationId,
        campaign_id: campaignId,
        sender_email: msg.sender_email,
        contact_email: msg.contact_email,
        contact_name: msg.contact_name,
        subject: msg.subject,
        body_text: msg.body_text,
        body_html: msg.body_html,
        direction: msg.direction,
        channel: 'email',
        message_type: 'email',
        status: msg.status,
        folder: msg.folder,
        provider: 'gmail',
        sent_at: msg.sent_at
      }

      const { data, error } = await supabase
        .from('inbox_messages')
        .insert(messageData)
        .select()

      if (error) {
        console.error(`❌ Failed to create message ${i + 1}:`, error)
      } else {
        console.log(`✅ Created message ${i + 1}: ${msg.direction} - "${msg.subject}"`)
      }
    }

    // Update thread message count
    const { data: allMessages } = await supabase
      .from('inbox_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)

    const totalCount = allMessages.length
    
    const { error: updateError } = await supabase
      .from('inbox_threads')
      .update({
        message_count: totalCount,
        unread_count: testMessages.filter(m => m.status === 'unread').length,
        last_message_at: new Date().toISOString(),
        last_message_preview: testMessages[testMessages.length - 1].body_text.substring(0, 150)
      })
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)

    if (updateError) {
      console.error('❌ Failed to update thread:', updateError)
    } else {
      console.log(`✅ Updated thread: ${totalCount} total messages`)
    }

    console.log('\n🎯 TEST THREAD CREATED!')
    console.log(`📧 Conversation now has ${totalCount} messages`)
    console.log(`🔗 This will show "${totalCount - 1} more messages" in the UI`)
    console.log('💡 Now you can test the thread expansion functionality!')

  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

// Run the script
createTestThread().then(() => {
  console.log('\n✅ Test thread creation complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})