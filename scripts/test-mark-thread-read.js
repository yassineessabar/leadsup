#!/usr/bin/env node

/**
 * Test Mark Thread as Read
 * 
 * This script tests the new thread mark-as-read functionality
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function testMarkThreadRead() {
  console.log('🧵 TESTING MARK THREAD AS READ\n')

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const testConversationId = 'ZWNvbW0yNDA1QGdtYWlsLmNvbXxlY29t' // The thread with multiple messages

    console.log(`👤 User: ${userId}`)
    console.log(`🧵 Test Conversation: ${testConversationId}`)

    // Check current state
    console.log('\n📊 Step 1: Check current thread state')
    
    const { data: currentMessages } = await supabase
      .from('inbox_messages')
      .select('id, subject, status, folder')
      .eq('user_id', userId)
      .eq('conversation_id', testConversationId)
      .order('sent_at', { ascending: true })

    console.log(`Messages in thread: ${currentMessages.length}`)
    currentMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg.status.toUpperCase()} - "${msg.subject}" (${msg.folder})`)
    })

    const unreadCount = currentMessages.filter(m => m.status === 'unread').length
    console.log(`\nUnread messages: ${unreadCount}`)

    if (unreadCount === 0) {
      console.log('💡 No unread messages to test with in this thread')
      return
    }

    // Check folder counts before
    const getFolderCounts = async () => {
      const { data: folderMessages } = await supabase
        .from('inbox_messages')
        .select('folder')
        .eq('user_id', userId)
        .eq('status', 'unread')
        .neq('folder', 'trash')

      const counts = {}
      folderMessages.forEach(message => {
        const folder = message.folder || 'inbox'
        counts[folder] = (counts[folder] || 0) + 1
      })
      return counts
    }

    console.log('\n📊 Step 2: Check folder counts before')
    const beforeCounts = await getFolderCounts()
    Object.entries(beforeCounts).forEach(([folder, count]) => {
      console.log(`  ${folder}: (${count})`)
    })

    // Test the mark-as-read functionality
    console.log('\n🔄 Step 3: Testing mark thread as read')
    
    const { data: updatedMessages, error } = await supabase
      .from('inbox_messages')
      .update({
        status: 'read',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('conversation_id', testConversationId)
      .eq('status', 'unread')
      .select('id, subject, folder')

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    const markedCount = updatedMessages?.length || 0
    console.log(`✅ Marked ${markedCount} messages as read`)

    // Update thread unread count
    await supabase
      .from('inbox_threads')
      .update({ unread_count: 0 })
      .eq('user_id', userId)
      .eq('conversation_id', testConversationId)

    console.log('\n📊 Step 4: Check folder counts after')
    const afterCounts = await getFolderCounts()
    Object.entries(afterCounts).forEach(([folder, count]) => {
      console.log(`  ${folder}: (${count > 0 ? count : 'no badge'})`)
    })

    // Show the impact
    console.log('\n🎯 Expected UI Behavior:')
    console.log(`1. User clicks on thread with ${unreadCount} unread messages`)
    console.log(`2. All ${unreadCount} unread messages in thread become read`)
    console.log(`3. Thread appears as read (no bold text)`)
    console.log(`4. Badge count decreases by ${unreadCount}`)

    // Verify final state
    console.log('\n✅ Step 5: Verify final thread state')
    const { data: finalMessages } = await supabase
      .from('inbox_messages')
      .select('id, status')
      .eq('user_id', userId)
      .eq('conversation_id', testConversationId)

    const finalUnreadCount = finalMessages.filter(m => m.status === 'unread').length
    console.log(`Unread messages after: ${finalUnreadCount}`)
    
    if (finalUnreadCount === 0) {
      console.log('🎉 SUCCESS: All messages in thread are now read!')
    } else {
      console.log(`❌ ISSUE: Still have ${finalUnreadCount} unread messages`)
    }

    // Revert changes for next test
    console.log('\n🔄 Reverting changes for next test...')
    await supabase
      .from('inbox_messages')
      .update({ status: 'unread' })
      .in('id', updatedMessages.map(m => m.id))

    await supabase
      .from('inbox_threads')
      .update({ unread_count: unreadCount })
      .eq('user_id', userId)
      .eq('conversation_id', testConversationId)

    console.log('✅ Test data restored')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testMarkThreadRead().then(() => {
  console.log('\n✅ Mark thread as read test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})