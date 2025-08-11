#!/usr/bin/env node

/**
 * Add Second Reply
 * 
 * This script adds your second real Gmail reply to the magggegeeull thread.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function addSecondReply() {
  console.log('📧 ADDING YOUR SECOND GMAIL REPLY');
  console.log('=================================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // Find the magggegeeull thread
    const { data: originalMessage } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', 'magggegeeull')
      .eq('contact_email', 'essabar.yassine@gmail.com')
      .single()
    
    if (!originalMessage) {
      console.log('❌ Could not find "magggegeeull" thread')
      return
    }
    
    console.log('✅ Found original thread:')
    console.log(`   Subject: "${originalMessage.subject}"`)
    console.log(`   Conversation ID: ${originalMessage.conversation_id}`)
    
    // Check current thread messages
    const { data: currentMessages } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', originalMessage.conversation_id)
      .order('sent_at', { ascending: true })
    
    console.log(`\\n🧵 Current thread has ${currentMessages?.length || 0} messages:`)
    currentMessages?.forEach((msg, i) => {
      const direction = msg.direction === 'outbound' ? '📤' : '📥'
      const status = msg.status.toUpperCase()
      const time = new Date(msg.sent_at || msg.created_at).toLocaleTimeString()
      console.log(`   ${i + 1}. ${direction} ${status} "${msg.subject}" (${time})`)
    })
    
    // Check if we already added a second reply
    const existingReplies = currentMessages?.filter(m => 
      m.direction === 'inbound' && 
      m.created_at > originalMessage.created_at
    ) || []
    
    if (existingReplies.length >= 2) {
      console.log(`\\n💡 Thread already has ${existingReplies.length} replies`)
      console.log('   Skipping second reply creation')
      return
    }
    
    console.log('\\n📝 Adding your second real Gmail reply...')
    
    // Create second reply
    const timestamp = Date.now()
    const replyTime = new Date()
    const secondReplyMessageId = `second-real-reply-${timestamp}@gmail.com`
    
    const secondReply = {
      user_id: userId,
      message_id: secondReplyMessageId,
      thread_id: originalMessage.conversation_id,
      conversation_id: originalMessage.conversation_id,
      contact_email: 'essabar.yassine@gmail.com',
      contact_name: 'Yassine Essabar',
      sender_email: 'essabar.yassine@gmail.com',
      subject: `Re: ${originalMessage.subject}`,
      body_text: `Perfect! I just sent another reply from Gmail.

This is my SECOND real response to the "${originalMessage.subject}" campaign email.

🧵 What this demonstrates:
- Multiple replies in the same conversation thread
- Proper chronological ordering of messages
- Badge counts updating with each new reply
- Thread expansion showing full conversation history
- Mark-as-read affecting entire thread

The inbox threading system handles multiple replies beautifully!

This simulates what would happen when webhooks capture real Gmail responses automatically.

Best regards,
Yassine

---
Second Gmail reply (manually captured) 
Sent: ${replyTime.toLocaleString()}`,
      body_html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
        <p><strong>Perfect! I just sent another reply from Gmail.</strong></p>
        
        <p>This is my <strong>SECOND</strong> real response to the "${originalMessage.subject}" campaign email.</p>
        
        <h4>🧵 What this demonstrates:</h4>
        <ul>
          <li>Multiple replies in the same conversation thread</li>
          <li>Proper chronological ordering of messages</li>
          <li>Badge counts updating with each new reply</li>
          <li>Thread expansion showing full conversation history</li>
          <li>Mark-as-read affecting entire thread</li>
        </ul>
        
        <p><em>The inbox threading system handles multiple replies beautifully!</em></p>
        
        <p>This simulates what would happen when webhooks capture real Gmail responses automatically.</p>
        
        <p>Best regards,<br>Yassine</p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <div style="color: #6b7280; font-size: 14px;">
          <strong>Second Gmail reply</strong> (manually captured)<br>
          <small>Sent: ${replyTime.toLocaleString()}</small>
        </div>
      </div>`,
      direction: 'inbound',
      channel: 'email',
      message_type: 'email', 
      status: 'unread',
      folder: 'inbox',
      lead_status: null,
      provider: 'gmail',
      has_attachments: false,
      in_reply_to: originalMessage.message_id,
      reference_ids: [originalMessage.message_id],
      sent_at: replyTime.toISOString(),
      received_at: replyTime.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: insertedReply, error: replyError } = await supabase
      .from('inbox_messages')
      .insert(secondReply)
      .select()
      .single()
    
    if (replyError) {
      console.error('❌ Error adding second reply:', replyError)
      return
    }
    
    console.log('✅ Second Gmail reply added successfully!')
    console.log(`   Database ID: ${insertedReply.id}`)
    console.log(`   Subject: "${insertedReply.subject}"`)
    console.log(`   Status: ${insertedReply.status}`)
    console.log(`   Time: ${new Date(insertedReply.sent_at).toLocaleString()}`)
    
    // Update thread counts
    const { data: thread } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', originalMessage.conversation_id)
      .single()
    
    if (thread) {
      const newMessageCount = (thread.message_count || 0) + 1
      const newUnreadCount = (thread.unread_count || 0) + 1
      
      await supabase
        .from('inbox_threads')
        .update({
          message_count: newMessageCount,
          unread_count: newUnreadCount,
          last_message_at: replyTime.toISOString(),
          last_message_preview: 'Perfect! I just sent another reply from Gmail...',
          updated_at: new Date().toISOString()
        })
        .eq('id', thread.id)
      
      console.log('✅ Thread updated with second reply')
      console.log(`   Total messages: ${newMessageCount}`)
      console.log(`   Unread count: ${newUnreadCount}`)
    }
    
    // Show updated badge counts
    console.log('\\n📊 Updated inbox badge counts:')
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
    
    // Show complete thread
    console.log('\\n🧵 Complete thread with your second reply:')
    const { data: allMessages } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', originalMessage.conversation_id)
      .order('sent_at', { ascending: true })
    
    allMessages?.forEach((msg, i) => {
      const direction = msg.direction === 'outbound' ? '📤' : '📥'
      const status = msg.status.toUpperCase()
      const time = new Date(msg.sent_at || msg.created_at).toLocaleTimeString()
      console.log(`   ${i + 1}. ${direction} ${status} "${msg.subject}" (${time})`)
    })
    
    const inboundReplies = allMessages?.filter(m => m.direction === 'inbound') || []
    
    console.log('\n🎉 SUCCESS! Thread now has multiple replies!')
    console.log('\n📊 Thread Statistics:')
    console.log(`   📧 Total messages: ${allMessages?.length || 0}`)
    console.log(`   📤 Outbound (campaign): ${allMessages?.filter(m => m.direction === 'outbound').length || 0}`)
    console.log(`   📥 Inbound (your replies): ${inboundReplies.length}`)
    console.log(`   🔴 Unread messages: ${badgeCounts.inbox || 0}`)
    
    console.log('\n🎯 NOW TEST MULTIPLE REPLY THREADING:')
    console.log('1. 🔄 Refresh your LeadsUp inbox')
    console.log('2. 📊 Check badge count - should show multiple unread')
    console.log('3. 👀 Find "magggegeeull" thread in inbox')
    console.log('4. 🧵 Click to expand - see FULL conversation')
    console.log('5. 📝 Verify chronological order of ALL messages')
    console.log('6. 🎯 Click to mark entire thread as read')
    console.log('7. ✅ Watch badge count drop to 0')
    
    console.log('\n💡 This simulates what happens when:')
    console.log('   - You send campaign emails')
    console.log('   - Recipients reply multiple times') 
    console.log('   - Webhooks capture all replies')
    console.log('   - Threading keeps conversations organized')
    
  } catch (error) {
    console.error('❌ Failed to add second reply:', error)
  }
}

// Run the script
addSecondReply().then(() => {
  console.log('\n✅ Second reply addition complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
});