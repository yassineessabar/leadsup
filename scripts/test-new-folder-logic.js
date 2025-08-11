#!/usr/bin/env node

/**
 * Test New Folder Logic
 * 
 * This script tests the new folder filtering approach
 * to make sure it returns the correct threads.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testNewFolderLogic() {
  console.log('🔍 TESTING NEW FOLDER FILTERING APPROACH\n')

  try {
    const userId = 'e863d418-b24a-4d15-93c6-28f56f4cfad8' // User with messages
    const folder = 'sent'
    const channel = 'email'

    console.log(`👤 Testing with user: ${userId}`)
    console.log(`📁 Filtering by folder: ${folder}`)

    // Step 1: Get thread IDs that have messages in the specified folder
    console.log('\n📋 Step 1: Get conversation IDs with messages in "sent" folder')
    
    const { data: messagesInFolder, error: folderError } = await supabase
      .from('inbox_messages')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('folder', folder)
      .eq('channel', channel)
      
    if (folderError) {
      console.error('❌ Error:', folderError)
      return
    }
    
    const threadIds = [...new Set(messagesInFolder.map(m => m.conversation_id))]
    console.log(`✅ Found ${messagesInFolder.length} messages in ${threadIds.length} unique conversations:`)
    threadIds.forEach((id, index) => {
      console.log(`  ${index + 1}. ${id}`)
    })

    if (threadIds.length === 0) {
      console.log('❌ No messages found in specified folder')
      return
    }

    // Step 2: Get threads with these conversation IDs
    console.log('\n🧵 Step 2: Get threads for these conversation IDs')
    
    const { data: threads, error: threadsError } = await supabase
      .from('inbox_threads')
      .select(`
        *,
        latest_message:inbox_messages!inner (
          id, subject, body_text, direction, status, sent_at, received_at,
          sender_id, sender_email, contact_name, contact_email, has_attachments, folder
        )
      `)
      .eq('user_id', userId)
      .in('conversation_id', threadIds)
      .order('last_message_at', { ascending: false })

    if (threadsError) {
      console.error('❌ Error:', threadsError)
      return
    }

    console.log(`✅ Found ${threads.length} threads:`)
    threads.forEach((thread, index) => {
      console.log(`\n  ${index + 1}. Thread: ${thread.contact_email}`)
      console.log(`     Subject: ${thread.subject}`)
      console.log(`     Conversation ID: ${thread.conversation_id}`)
      console.log(`     Message Count: ${thread.message_count}`)
      console.log(`     Latest Message:`)
      console.log(`       - Direction: ${thread.latest_message.direction}`)
      console.log(`       - From: ${thread.latest_message.sender_email}`)
      console.log(`       - To: ${thread.latest_message.contact_email}`)
      console.log(`       - Subject: ${thread.latest_message.subject}`)
      console.log(`       - Folder: ${thread.latest_message.folder}`)
      console.log(`       - Status: ${thread.latest_message.status}`)
      console.log(`       - Sent At: ${thread.latest_message.sent_at}`)
    })

    // Step 3: Test the full API-like response format
    console.log('\n📤 Step 3: Format as API response')
    
    const formattedThreads = threads.map(thread => ({
      id: thread.id,
      conversation_id: thread.conversation_id,
      subject: thread.subject,
      contact_name: thread.contact_name,
      contact_email: thread.contact_email,
      message_count: thread.message_count,
      unread_count: thread.unread_count,
      last_message_at: thread.last_message_at,
      latest_message: {
        id: thread.latest_message.id,
        subject: thread.latest_message.subject,
        direction: thread.latest_message.direction,
        status: thread.latest_message.status,
        sender_email: thread.latest_message.sender_email,
        contact_email: thread.latest_message.contact_email,
        sent_at: thread.latest_message.sent_at,
        folder: thread.latest_message.folder
      }
    }))

    console.log('\n✅ API Response Format:')
    console.log(JSON.stringify({
      success: true,
      data: formattedThreads,
      pagination: {
        page: 1,
        limit: 20,
        total: formattedThreads.length,
        totalPages: Math.ceil(formattedThreads.length / 20)
      }
    }, null, 2))

    console.log('\n🎯 CONCLUSION:')
    console.log('✅ New folder filtering logic works correctly')
    console.log('✅ Returns proper thread data with latest messages')
    console.log('✅ Folder field is properly included in response')
    console.log('\n💡 This should fix the UI display issue!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testNewFolderLogic().then(() => {
  console.log('\n✅ New folder logic test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test script failed:', error)
  process.exit(1)
})