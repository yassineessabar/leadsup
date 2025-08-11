#!/usr/bin/env node

/**
 * Test Content Field
 * 
 * Quick test to verify the content field is included in API response
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testContentField() {
  console.log('🔍 TESTING CONTENT FIELD IN API RESPONSE\n')

  try {
    // Get one thread with its latest message
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    const { data: thread } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single()
    
    const { data: latestMessage } = await supabase
      .from('inbox_messages')
      .select('id, subject, body_text, body_html, direction, status, sent_at, received_at, sender_id, sender_email, contact_name, contact_email, has_attachments, folder')
      .eq('user_id', userId)
      .eq('conversation_id', thread.conversation_id)
      .order('sent_at', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Format exactly like our API does
    const formattedEmail = {
      id: thread.id,
      sender: thread.contact_email?.trim() || 'Unknown',
      subject: thread.subject || 'No subject',
      content: latestMessage?.body_html || latestMessage?.body_text || thread.last_message_preview || 'No content available',
      date: new Date(latestMessage.sent_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      isRead: thread.unread_count === 0,
      hasAttachment: latestMessage?.has_attachments || false
    }

    console.log('✅ Formatted email with content field:')
    console.log(`📧 Sender: ${formattedEmail.sender}`)
    console.log(`📋 Subject: ${formattedEmail.subject}`)
    console.log(`📅 Date: ${formattedEmail.date}`)
    console.log(`📖 Content: "${formattedEmail.content}"`)
    console.log(`👁️ Is Read: ${formattedEmail.isRead}`)
    console.log(`📎 Has Attachment: ${formattedEmail.hasAttachment}`)

    if (formattedEmail.content && formattedEmail.content !== 'No content available') {
      console.log('\n🎉 SUCCESS! Content field is populated!')
      console.log('💡 This should now show real email content instead of hardcoded Liquorland text!')
    } else {
      console.log('\n❌ ISSUE: Content field is empty or fallback')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testContentField().then(() => {
  console.log('\n✅ Content field test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test script failed:', error)
  process.exit(1)
})