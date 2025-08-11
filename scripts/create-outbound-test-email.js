#!/usr/bin/env node

/**
 * Create Outbound Test Email
 * 
 * This script creates a test outbound email in the database
 * that you can reply to, simulating the complete email flow.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function createOutboundTestEmail() {
  console.log('📤 CREATING OUTBOUND TEST EMAIL FOR THREAD TESTING');
  console.log('================================================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // Your email address - replace with your actual email
    const recipientEmail = 'essabar.yassine@gmail.com'
    const senderEmail = 'noreply@leadsup.com' // Your sending domain
    
    // Generate unique identifiers
    const timestamp = Date.now()
    const messageId = `outbound-test-${timestamp}@leadsup.com`
    const conversationId = Buffer.from(`${recipientEmail}|${senderEmail}|test-${timestamp}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
    
    console.log('📧 Creating outbound test email:')
    console.log(`   From: ${senderEmail}`)
    console.log(`   To: ${recipientEmail}`)
    console.log(`   Message ID: ${messageId}`)
    console.log(`   Conversation ID: ${conversationId}`)
    
    // Create thread first or use existing
    console.log('\n🧵 Creating/finding thread entry...')
    
    // Check if thread already exists
    const { data: existingThread } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .single()
    
    let thread = existingThread
    
    if (!existingThread) {
      // Create new thread
      const { data: insertedThread, error: threadError } = await supabase
        .from('inbox_threads')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          subject: `🧪 Thread Test - Please Reply [${new Date().toLocaleTimeString()}]`,
          contact_email: recipientEmail,
          contact_name: 'Test Recipient',
          message_count: 0,
          unread_count: 0,
          status: 'active',
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (threadError) {
        console.error('❌ Error creating thread:', threadError)
        return
      }
      
      thread = insertedThread
      console.log('✅ New thread created successfully!')
    } else {
      console.log('✅ Using existing thread')
    }
    
    // Create the outbound message
    console.log('\n📤 Creating outbound message...')
    
    const outboundMessage = {
      user_id: userId,
      message_id: messageId,
      thread_id: conversationId,
      conversation_id: conversationId,
      contact_email: recipientEmail,
      contact_name: 'Test Recipient',
      sender_email: senderEmail,
      subject: `🧪 Thread Test - Please Reply [${new Date().toLocaleTimeString()}]`,
      body_text: `Hi there!

This is a test email to verify our complete inbox threading system.

🎯 What we're testing:
1. ✅ Outbound email appears in inbox as "sent"
2. 📧 You can reply to this email
3. 🧵 Reply appears in the same thread/conversation
4. 📱 Thread expands to show the full conversation
5. 📊 Badge counts update correctly
6. 🔄 Thread sorting works properly

Please reply to this email with something like "This is my test reply!" so we can verify the threading functionality works end-to-end.

Thanks for testing!

---
Test ID: ${timestamp}
Conversation: ${conversationId}
System: LeadsUp Inbox Threading Test`,
      body_html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
        <h3 style="color: #2563eb;">🧪 Thread Test - Please Reply</h3>
        
        <p>Hi there!</p>
        
        <p>This is a test email to verify our complete inbox threading system.</p>
        
        <h4>🎯 What we're testing:</h4>
        <ol>
          <li>✅ Outbound email appears in inbox as "sent"</li>
          <li>📧 You can reply to this email</li>
          <li>🧵 Reply appears in the same thread/conversation</li>
          <li>📱 Thread expands to show the full conversation</li>
          <li>📊 Badge counts update correctly</li>
          <li>🔄 Thread sorting works properly</li>
        </ol>
        
        <p><strong>Please reply to this email with something like "This is my test reply!" so we can verify the threading functionality works end-to-end.</strong></p>
        
        <p>Thanks for testing!</p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <small style="color: #6b7280;">
          Test ID: ${timestamp}<br>
          Conversation: ${conversationId}<br>
          System: LeadsUp Inbox Threading Test
        </small>
      </div>`,
      direction: 'outbound',
      channel: 'email',
      message_type: 'email',
      status: 'read', // Outbound messages use 'read' status
      folder: 'sent', // Outbound messages go to sent folder
      lead_status: null,
      provider: 'gmail',
      has_attachments: false,
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: insertedMessage, error: insertError } = await supabase
      .from('inbox_messages')
      .insert(outboundMessage)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Error creating outbound message:', insertError)
      return
    }
    
    console.log('✅ Outbound message created successfully!')
    console.log(`   Database ID: ${insertedMessage.id}`)
    
    // Update thread with message count
    console.log('\n🧵 Updating thread counts...')
    
    const currentMessageCount = thread.message_count || 0
    await supabase
      .from('inbox_threads')
      .update({
        message_count: currentMessageCount + 1,
        last_message_at: new Date().toISOString(),
        last_message_preview: 'This is a test email to verify our complete inbox threading system...',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
    
    console.log('✅ Thread updated with message count')
    
    // Check current folder distributions
    console.log('\n📊 Current inbox folder distribution:')
    
    const { data: folderStats } = await supabase
      .from('inbox_messages')
      .select('folder, status')
      .eq('user_id', userId)
      .neq('folder', 'trash')
    
    const folderCounts = {}
    folderStats?.forEach(msg => {
      const folder = msg.folder || 'inbox'
      const status = msg.status === 'unread' ? 'unread' : 'read/sent'
      const key = `${folder}_${status}`
      folderCounts[key] = (folderCounts[key] || 0) + 1
    })
    
    // Group by folder
    const folders = {}
    Object.entries(folderCounts).forEach(([key, count]) => {
      const [folder, status] = key.split('_')
      if (!folders[folder]) folders[folder] = { read: 0, unread: 0 }
      if (status === 'unread') folders[folder].unread = count
      else folders[folder].read = count
    })
    
    Object.entries(folders).forEach(([folder, counts]) => {
      const badge = counts.unread > 0 ? `(${counts.unread})` : ''
      console.log(`   ${folder}: ${counts.read + counts.unread} total ${badge}`)
    })
    
    console.log('\n🎯 WHAT TO DO NEXT:')
    console.log('1. ✅ Test outbound email created in inbox')
    console.log(`2. 📧 Find email in your sent folder: "${outboundMessage.subject}"`)
    console.log('3. 💬 Reply to that email with "This is my test reply!"')
    console.log('4. ⏳ Wait 1-2 minutes for webhook to process your reply')
    console.log('5. 🔄 Refresh your LeadsUp inbox UI')
    console.log('6. 👁️ Look for the thread in your inbox folder')
    console.log('7. 🧵 Click to expand and see both messages in the thread')
    console.log('8. 📊 Verify badge counts show unread reply')
    
    console.log('\n📧 Email Details:')
    console.log(`   Subject: "${outboundMessage.subject}"`)
    console.log(`   To: ${recipientEmail}`)
    console.log(`   Folder: ${outboundMessage.folder}`)
    console.log(`   Status: ${outboundMessage.status}`)
    console.log(`   Direction: ${outboundMessage.direction}`)
    
    console.log('\n💡 Expected Thread Behavior:')
    console.log('   • Outbound message shows in sent folder')
    console.log('   • Reply will appear in inbox folder with unread badge')
    console.log('   • Both messages share the same conversation_id')
    console.log('   • Thread expands to show chronological conversation')
    console.log('   • Clicking reply marks entire thread as read')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the script
createOutboundTestEmail().then(() => {
  console.log('\n✅ Outbound test email creation complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
});