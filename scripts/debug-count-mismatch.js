#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function debugCountMismatch() {
  const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
  
  console.log('🔍 INVESTIGATING COUNT MISMATCH\n')
  
  // Check badge count (should be 2)
  const { data: unreadInInbox } = await supabase
    .from('inbox_messages')
    .select('*')
    .eq('user_id', userId)
    .eq('folder', 'inbox')
    .eq('status', 'unread')
  
  console.log('📊 Badge Count Calculation:')
  console.log(`Unread messages in inbox folder: ${unreadInInbox.length}`)
  unreadInInbox.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg.contact_email} - "${msg.subject}"`)
    console.log(`     Status: ${msg.status}, Folder: ${msg.folder}`)
    console.log(`     Conversation ID: ${msg.conversation_id}`)
  })
  
  // Check what threads would be displayed (this simulates the UI logic)
  const { data: inboxMessagesForThreads } = await supabase
    .from('inbox_messages')
    .select('conversation_id')
    .eq('user_id', userId)
    .eq('folder', 'inbox')
    .eq('channel', 'email')
  
  const threadIds = [...new Set(inboxMessagesForThreads.map(m => m.conversation_id))]
  
  console.log(`\n🧵 UI Thread Display Logic:`)
  console.log(`Messages in inbox folder (for thread filtering): ${inboxMessagesForThreads.length}`)
  console.log(`Unique conversation IDs: ${threadIds.length}`)
  threadIds.forEach((id, i) => {
    console.log(`  ${i + 1}. ${id}`)
  })
  
  if (threadIds.length === 0) {
    console.log('❌ NO THREAD IDS FOUND - This is why UI shows "No emails found"')
    return
  }
  
  const { data: displayedThreads } = await supabase
    .from('inbox_threads')
    .select('*')
    .eq('user_id', userId)
    .in('conversation_id', threadIds)
    .order('last_message_at', { ascending: false })
  
  console.log(`\nThreads that would be displayed: ${displayedThreads.length}`)
  displayedThreads.forEach((thread, i) => {
    console.log(`  ${i + 1}. ${thread.contact_email} - "${thread.subject}"`)
    console.log(`     Message count: ${thread.message_count}, Unread: ${thread.unread_count}`)
    console.log(`     Conversation ID: ${thread.conversation_id}`)
  })
  
  console.log(`\n🎯 DIAGNOSIS:`)
  console.log(`Badge shows: ${unreadInInbox.length} unread messages`)
  console.log(`UI displays: ${displayedThreads.length} threads`)
  
  if (unreadInInbox.length !== displayedThreads.length) {
    console.log(`❌ MISMATCH: Badge count (${unreadInInbox.length}) != Displayed threads (${displayedThreads.length})`)
    console.log('\n🔧 POSSIBLE CAUSES:')
    console.log('1. Multiple unread messages in same conversation')
    console.log('2. Unread messages not creating corresponding threads')
    console.log('3. Thread filtering logic excluding some conversations')
  } else {
    console.log(`✅ MATCH: Badge count matches displayed threads`)
  }
  
  // Check if multiple unread messages are in the same conversation
  const conversationGroups = {}
  unreadInInbox.forEach(msg => {
    if (!conversationGroups[msg.conversation_id]) {
      conversationGroups[msg.conversation_id] = []
    }
    conversationGroups[msg.conversation_id].push(msg)
  })
  
  console.log('\n📧 Unread messages by conversation:')
  Object.entries(conversationGroups).forEach(([convId, messages]) => {
    console.log(`  Conversation ${convId}: ${messages.length} unread messages`)
    messages.forEach(msg => {
      console.log(`    - ${msg.subject} (${msg.contact_email})`)
    })
  })
  
  if (Object.keys(conversationGroups).length < unreadInInbox.length) {
    console.log('\n💡 EXPLANATION: Multiple unread messages in same conversation!')
    console.log('   Badge counts all unread messages, but UI groups them into threads')
  }
}

debugCountMismatch()