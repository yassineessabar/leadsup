#!/usr/bin/env node

/**
 * Capture Real Gmail Reply
 * 
 * Since the webhook system isn't configured, this script allows you to manually
 * input the details of your real Gmail reply to add it to the thread.
 */

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function captureRealReply() {
  console.log('📧 MANUAL REAL GMAIL REPLY CAPTURE')
  console.log('=================================\n')

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
      rl.close()
      return
    }
    
    console.log('✅ Found original thread:')
    console.log(`   Subject: "${originalMessage.subject}"`)
    console.log(`   Conversation ID: ${originalMessage.conversation_id}`)
    console.log(`   Sent: ${new Date(originalMessage.sent_at).toLocaleString()}`)
    
    // Show current thread
    const { data: currentMessages } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', originalMessage.conversation_id)
      .order('sent_at', { ascending: true })
    
    console.log('\n🧵 Current thread messages:')
    currentMessages?.forEach((msg, i) => {
      const direction = msg.direction === 'outbound' ? '📤' : '📥'
      const status = msg.status.toUpperCase()
      const time = new Date(msg.sent_at || msg.created_at).toLocaleTimeString()
      console.log(`   ${i + 1}. ${direction} ${status} "${msg.subject}" (${time})`)
    })
    
    console.log('\n💡 Since you sent a real reply via Gmail but our webhooks')
    console.log('   aren\'t configured, let\'s manually add your reply to test')
    console.log('   the complete threading system.\n')
    
    // Get reply details
    console.log('📝 Please provide your Gmail reply details:\n')
    
    const replySubject = await askQuestion(`Reply subject (default: "Re: ${originalMessage.subject}"): `) || `Re: ${originalMessage.subject}`
    
    console.log('\nReply content (press Enter twice when done):')
    let replyContent = ''
    let emptyLines = 0
    
    while (emptyLines < 2) {
      const line = await askQuestion('')
      if (line === '') {
        emptyLines++
      } else {
        emptyLines = 0
        replyContent += line + '\n'
      }
    }
    
    if (!replyContent.trim()) {
      replyContent = `This is my real reply from Gmail!

I'm responding to the "${originalMessage.subject}" email to test the complete inbox threading functionality.

✅ This tests:
- Real campaign email delivery
- Manual reply capture (until webhooks are configured)  
- Thread continuation
- Badge updates
- Mark-as-read functionality

The threading system is working great!

Best regards,
Yassine

---
Real Gmail reply captured manually at ${new Date().toLocaleString()}`
    }
    
    const timeInput = await askQuestion('\\nReply time (press Enter for now, or format: YYYY-MM-DD HH:MM): ')
    const replyTime = timeInput ? new Date(timeInput) : new Date()
    
    // Validate the time
    if (isNaN(replyTime.getTime())) {
      console.log('❌ Invalid time format, using current time')
      replyTime = new Date()
    }
    
    // Create the real reply
    console.log('\\n🔄 Adding your real Gmail reply to the thread...')
    
    const timestamp = Date.now()
    const realReplyMessageId = `real-gmail-reply-${timestamp}@gmail.com`
    
    const realReply = {
      user_id: userId,
      message_id: realReplyMessageId,
      thread_id: originalMessage.conversation_id,
      conversation_id: originalMessage.conversation_id,
      contact_email: 'essabar.yassine@gmail.com',
      contact_name: 'Yassine Essabar',
      sender_email: 'essabar.yassine@gmail.com',
      subject: replySubject,
      body_text: replyContent.trim(),
      body_html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
        ${replyContent.trim().split('\\n').map(line => 
          line.trim() === '' ? '<br>' : `<p>${line.trim()}</p>`
        ).join('')}
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
      .insert(realReply)
      .select()
      .single()
    
    if (replyError) {
      console.error('❌ Error adding your real reply:', replyError)
      rl.close()
      return
    }
    
    console.log('✅ Your real Gmail reply added successfully!')
    console.log(`   Database ID: ${insertedReply.id}`)
    console.log(`   Subject: "${insertedReply.subject}"`)
    console.log(`   Time: ${new Date(insertedReply.sent_at).toLocaleString()}`)
    console.log(`   Status: ${insertedReply.status}`)
    
    // Update thread counts
    const { data: thread } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', originalMessage.conversation_id)
      .single()
    
    if (thread) {
      await supabase
        .from('inbox_threads')
        .update({
          message_count: (thread.message_count || 0) + 1,
          unread_count: (thread.unread_count || 0) + 1,
          last_message_at: replyTime.toISOString(),
          last_message_preview: replyContent.trim().substring(0, 100) + '...',
          updated_at: new Date().toISOString()
        })
        .eq('id', thread.id)
      
      console.log('✅ Thread updated with your real reply')
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
    
    if (Object.keys(badgeCounts).length > 0) {
      Object.entries(badgeCounts).forEach(([folder, count]) => {
        console.log(`   ${folder}: (${count})`)
      })
    } else {
      console.log('   No unread messages')
    }
    
    // Show complete updated thread
    console.log('\\n🧵 Complete updated thread:')
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
    
    console.log('\\n🎉 SUCCESS! Your real Gmail reply is now in the system!')
    console.log('\\n🎯 NOW TEST THE COMPLETE FLOW:')
    console.log('1. 🔄 Refresh your LeadsUp inbox')
    console.log('2. 📊 Check badge count (should be higher now)')
    console.log('3. 👀 Find the "magggegeeull" thread')
    console.log('4. 🧵 Click to expand - see the complete conversation')
    console.log('5. 📝 Verify chronological order of all messages')
    console.log('6. 🎯 Click to test mark-as-read')
    console.log('7. ✅ Watch badge count decrease')
    
    console.log('\\n📋 Thread Status:')
    console.log(`   📧 Total messages: ${allMessages?.length || 0}`)
    console.log(`   📥 Your replies: ${allMessages?.filter(m => m.direction === 'inbound').length || 0}`)
    console.log(`   📊 Unread count: ${badgeCounts.inbox || 0}`)
    console.log(`   🔗 Conversation ID: ${originalMessage.conversation_id}`)
    
    rl.close()
    
  } catch (error) {
    console.error('❌ Capture failed:', error)
    rl.close()
  }
}

// Run the capture
console.log('🔧 Real Gmail Reply Capture Tool')
console.log('===============================\\n')
console.log('This tool helps you manually add your real Gmail replies')
console.log('to the LeadsUp inbox system for testing purposes.\\n')

captureRealReply().then(() => {
  console.log('\\n✅ Real reply capture complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Capture failed:', error)
  process.exit(1)
});