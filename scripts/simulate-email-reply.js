#!/usr/bin/env node

/**
 * Simulate Email Reply
 * 
 * This script simulates receiving a reply to our test email
 * so we can test the threading functionality without waiting for real emails.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function simulateEmailReply() {
  console.log('🎭 SIMULATING EMAIL REPLY FOR THREAD TESTING');
  console.log('==========================================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const testEmail = 'essabar.yassine@gmail.com'
    
    // Find our latest test message
    console.log('🔍 Finding latest test message...')
    
    const { data: testMessage } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .like('subject', '%🧪 Thread Test%')
      .eq('contact_email', testEmail)
      .eq('direction', 'outbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (!testMessage) {
      console.log('❌ No test message found. Please run create-outbound-test-email.js first.')
      return
    }
    
    console.log('✅ Found test message:')
    console.log(`   Subject: "${testMessage.subject}"`)
    console.log(`   Conversation ID: ${testMessage.conversation_id}`)
    console.log(`   Direction: ${testMessage.direction}`)
    
    // Check if reply already exists
    const { data: existingReply } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', testMessage.conversation_id)
      .eq('direction', 'inbound')
      .single()
    
    if (existingReply) {
      console.log('\n✅ Reply already exists in this thread:')
      console.log(`   Subject: "${existingReply.subject}"`)
      console.log(`   Status: ${existingReply.status}`)
      console.log(`   Created: ${new Date(existingReply.created_at).toLocaleString()}`)
      
      console.log('\n💡 Skipping reply creation. Run monitor script to see the thread.')
      return
    }
    
    // Create simulated reply
    console.log('\n🎭 Creating simulated reply...')
    
    const replySubject = testMessage.subject.startsWith('Re:') 
      ? testMessage.subject 
      : `Re: ${testMessage.subject}`
    
    const timestamp = Date.now()
    const replyMessageId = `reply-${timestamp}@gmail.com`
    
    const simulatedReply = {
      user_id: userId,
      message_id: replyMessageId,
      thread_id: testMessage.conversation_id,
      conversation_id: testMessage.conversation_id,
      contact_email: testEmail,
      contact_name: 'Test Recipient',
      sender_email: testEmail,
      subject: replySubject,
      body_text: `This is my test reply!

Thank you for the test email. I'm replying to help test the inbox threading functionality.

🧵 This reply should:
- Appear in the same thread as your original message
- Show up with an unread badge in the inbox
- Allow thread expansion to see both messages
- Mark the entire thread as read when clicked

Testing threading functionality works great!

Best regards,
Test User

---
Original message:
> ${testMessage.body_text?.substring(0, 200)}...

Reply generated at: ${new Date().toISOString()}`,
      body_html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
        <p><strong>This is my test reply!</strong></p>
        
        <p>Thank you for the test email. I'm replying to help test the inbox threading functionality.</p>
        
        <h4>🧵 This reply should:</h4>
        <ul>
          <li>Appear in the same thread as your original message</li>
          <li>Show up with an unread badge in the inbox</li>
          <li>Allow thread expansion to see both messages</li>
          <li>Mark the entire thread as read when clicked</li>
        </ul>
        
        <p><em>Testing threading functionality works great!</em></p>
        
        <p>Best regards,<br>Test User</p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <div style="color: #6b7280; font-size: 14px;">
          <strong>Original message:</strong><br>
          <blockquote style="margin: 10px 0; padding-left: 15px; border-left: 3px solid #e5e7eb;">
            ${testMessage.body_text?.substring(0, 200)}...
          </blockquote>
          <small>Reply generated at: ${new Date().toISOString()}</small>
        </div>
      </div>`,
      direction: 'inbound',
      channel: 'email',
      message_type: 'email',
      status: 'unread', // This is key - it should show as unread
      folder: 'inbox', // Inbound messages go to inbox
      lead_status: null,
      provider: 'gmail',
      has_attachments: false,
      in_reply_to: testMessage.message_id,
      reference_ids: [testMessage.message_id],
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: insertedReply, error: replyError } = await supabase
      .from('inbox_messages')
      .insert(simulatedReply)
      .select()
      .single()
    
    if (replyError) {
      console.error('❌ Error creating simulated reply:', replyError)
      return
    }
    
    console.log('✅ Simulated reply created successfully!')
    console.log(`   Database ID: ${insertedReply.id}`)
    console.log(`   Subject: "${insertedReply.subject}"`)
    console.log(`   Status: ${insertedReply.status}`)
    
    // Update thread with new message count and unread count
    console.log('\n🧵 Updating thread counts...')
    
    const { data: currentThread } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', testMessage.conversation_id)
      .single()
    
    if (currentThread) {
      await supabase
        .from('inbox_threads')
        .update({
          message_count: (currentThread.message_count || 0) + 1,
          unread_count: (currentThread.unread_count || 0) + 1,
          last_message_at: new Date().toISOString(),
          last_message_preview: 'This is my test reply! Thank you for the test email...',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentThread.id)
      
      console.log('✅ Thread updated with new message count')
    } else {
      console.log('⚠️  Thread not found in inbox_threads table')
    }
    
    // Check current badge counts
    console.log('\n📊 Current folder badge counts:')
    const { data: unreadMessages } = await supabase
      .from('inbox_messages')
      .select('folder')
      .eq('user_id', userId)
      .eq('status', 'unread')
      .neq('folder', 'trash')
    
    const badgeCounts = {}
    unreadMessages?.forEach(msg => {
      const folder = msg.folder || 'inbox'
      badgeCounts[folder] = (badgeCounts[folder] || 0) + 1
    })
    
    Object.entries(badgeCounts).forEach(([folder, count]) => {
      console.log(`   ${folder}: (${count})`)
    })
    
    if (Object.keys(badgeCounts).length === 0) {
      console.log('   No unread messages')
    }
    
    // Show thread summary
    console.log('\n🧵 Complete Thread Summary:')
    const { data: allThreadMessages } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', testMessage.conversation_id)
      .order('sent_at', { ascending: true })
    
    allThreadMessages?.forEach((msg, i) => {
      const direction = msg.direction === 'outbound' ? '📤' : '📥'
      const status = msg.status.toUpperCase()
      const time = new Date(msg.sent_at).toLocaleTimeString()
      console.log(`   ${i + 1}. ${direction} ${status} "${msg.subject}" (${time})`)
    })
    
    console.log('\n🎉 SIMULATED REPLY TESTING COMPLETE!')
    console.log('\n🎯 What to test in the UI:')
    console.log('1. 🔄 Refresh your LeadsUp inbox')
    console.log('2. 📊 Look for inbox badge showing (1) or more unread')
    console.log('3. 👀 Find the thread in your inbox folder')
    console.log('4. 🧵 Click to expand the thread')
    console.log('5. 📝 Verify you see both messages:')
    console.log('   - Original test message (outbound, read)')
    console.log('   - Simulated reply (inbound, unread)')
    console.log('6. 🎯 Click on the thread to test mark-as-read')
    console.log('7. ✅ Badge count should decrease')
    console.log('8. 💬 Thread should appear as read (not bold)')
    
    console.log('\n📋 Thread Details:')
    console.log(`   Conversation ID: ${testMessage.conversation_id}`)
    console.log(`   Total Messages: ${allThreadMessages?.length || 0}`)
    console.log(`   Unread Messages: ${allThreadMessages?.filter(m => m.status === 'unread').length || 0}`)
    console.log(`   Latest Reply: "${insertedReply.subject}"`)
    
  } catch (error) {
    console.error('❌ Simulation failed:', error)
  }
}

// Run the simulation
simulateEmailReply().then(() => {
  console.log('\n✅ Email reply simulation complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Simulation failed:', error)
  process.exit(1)
});