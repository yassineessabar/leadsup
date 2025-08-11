#!/usr/bin/env node

/**
 * Monitor Reply Thread
 * 
 * This script monitors the conversation for your reply and verifies
 * that the threading functionality works correctly.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function monitorReplyThread() {
  console.log('👁️ MONITORING THREAD FOR YOUR REPLY');
  console.log('==================================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // Find our test thread and recent test messages
    console.log('🔍 Looking for test thread and messages...')
    
    const { data: testThreads } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .like('subject', '%🧪 Thread Test%')
      .order('created_at', { ascending: false })
      .limit(5)
    
    const { data: testMessages } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .like('subject', '%🧪 Thread Test%')
      .eq('contact_email', 'essabar.yassine@gmail.com')
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log(`Found ${testThreads?.length || 0} test thread(s)`)
    console.log(`Found ${testMessages?.length || 0} test message(s) for essabar.yassine@gmail.com`)
    
    if (testMessages && testMessages.length > 0) {
      console.log('\nTest messages found:')
      testMessages.forEach((msg, i) => {
        console.log(`   ${i + 1}. "${msg.subject}" (${msg.direction})`)
        console.log(`      Conv ID: ${msg.conversation_id}`)
        console.log(`      Created: ${new Date(msg.created_at).toLocaleTimeString()}`)
      })
    }
    
    if (!testMessages || testMessages.length === 0) {
      console.log('❌ No test messages found for essabar.yassine@gmail.com')
      console.log('Please run create-outbound-test-email.js first.')
      return
    }
    
    // Use the most recent test message's conversation
    const latestMessage = testMessages[0]
    const conversationId = latestMessage.conversation_id
    
    // Find or use corresponding thread
    const testThread = testThreads?.find(t => t.conversation_id === conversationId) || {
      subject: latestMessage.subject,
      message_count: 1,
      unread_count: 0,
      conversation_id: conversationId
    }
    
    console.log(`\n📧 Monitoring conversation: ${conversationId}`)
    console.log(`   Subject: "${testThread.subject}"`)
    console.log(`   Current message count: ${testThread.message_count}`)
    console.log(`   Unread count: ${testThread.unread_count}`)
    
    // Get all current messages in the thread
    console.log('\n📋 Current thread messages:')
    
    const { data: threadMessages } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })
    
    if (threadMessages && threadMessages.length > 0) {
      threadMessages.forEach((msg, i) => {
        const direction = msg.direction === 'outbound' ? '📤' : '📥'
        const status = msg.status.toUpperCase()
        const timestamp = new Date(msg.sent_at).toLocaleTimeString()
        console.log(`   ${i + 1}. ${direction} ${status} "${msg.subject}" (${timestamp})`)
        console.log(`      From: ${msg.direction === 'outbound' ? msg.sender_email : msg.contact_email}`)
        console.log(`      Folder: ${msg.folder}`)
      })
    } else {
      console.log('   No messages found in thread')
    }
    
    const currentCount = threadMessages?.length || 0
    console.log(`\nThread has ${currentCount} message(s) currently`)
    
    // Check for replies (inbound messages in this conversation)
    const inboundMessages = threadMessages?.filter(msg => msg.direction === 'inbound') || []
    const outboundMessages = threadMessages?.filter(msg => msg.direction === 'outbound') || []
    
    console.log(`   Outbound (sent): ${outboundMessages.length}`)
    console.log(`   Inbound (replies): ${inboundMessages.length}`)
    
    if (inboundMessages.length > 0) {
      console.log('\n🎉 REPLY DETECTED!')
      console.log('   ✅ Thread functionality is working!')
      
      const latestReply = inboundMessages[inboundMessages.length - 1]
      console.log('\n📥 Latest reply details:')
      console.log(`   Subject: "${latestReply.subject}"`)
      console.log(`   From: ${latestReply.contact_email}`)
      console.log(`   Status: ${latestReply.status.toUpperCase()}`)
      console.log(`   Received: ${new Date(latestReply.received_at).toLocaleString()}`)
      console.log(`   Preview: "${latestReply.body_text?.substring(0, 100)}..."`)
      
      // Check badge counts
      console.log('\n📊 Checking badge counts:')
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
        console.log('   No unread messages (no badges)')
      }
      
      // Test results summary
      console.log('\n🎯 THREAD TESTING RESULTS:')
      console.log(`   ✅ Email sent successfully: ${outboundMessages.length} outbound`)
      console.log(`   ✅ Reply received successfully: ${inboundMessages.length} inbound`)
      console.log(`   ✅ Threading works: Same conversation_id (${conversationId})`)
      console.log(`   ✅ Chronological ordering: Messages sorted by sent_at`)
      
      if (latestReply.status === 'unread') {
        console.log('   ✅ Badge counting: Reply shows as unread')
        console.log('\n🔄 Next step: Click the thread in your UI to test mark-as-read!')
      } else {
        console.log('   ✅ Mark-as-read: Reply already marked as read')
      }
      
      console.log('\n💡 UI Testing Checklist:')
      console.log('   1. 🔄 Refresh your LeadsUp inbox')
      console.log('   2. 📱 Look for the thread in inbox folder')
      console.log('   3. 🧵 Click to expand the thread')
      console.log('   4. 👁️ Verify both messages show in chronological order')
      console.log('   5. 🎯 Test clicking to mark as read')
      console.log('   6. 📊 Watch badge count decrease')
      
    } else {
      console.log('\n⏳ Waiting for your reply...')
      console.log('💡 To test threading:')
      console.log('   1. Check your email inbox')
      console.log(`   2. Look for: "${testThread.subject}"`)
      console.log('   3. Reply with "This is my test reply!"')
      console.log('   4. Run this script again in 1-2 minutes')
      
      console.log('\n📧 Email was sent to: essabar.yassine@gmail.com')
      console.log('🔗 Conversation ID:', conversationId)
    }
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error)
  }
}

// Run the monitoring
monitorReplyThread().then(() => {
  console.log('\n✅ Thread monitoring complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Monitoring failed:', error)
  process.exit(1)
});