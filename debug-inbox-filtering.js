#!/usr/bin/env node

/**
 * Debug why campaign reply thread isn't showing in inbox despite being in database
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugInboxFiltering() {
  try {
    console.log('🔍 Debugging inbox filtering issue\n')
    
    // 1. Check the specific thread and its messages
    console.log('1. Campaign reply thread details:')
    console.log('=' .repeat(50))
    const conversationId = 'YW50aG95MjMyN0BnbWFpbC5jb218dGVz'
    const userId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    
    // Get the thread
    const { data: thread, error: threadError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single()
    
    if (threadError) {
      console.error('❌ Thread error:', threadError)
      return
    }
    
    console.log(`📧 Thread: ${thread.contact_email} - "${thread.subject}"`)
    console.log(`   Status: ${thread.status}`)
    console.log(`   Message Count: ${thread.message_count}`)
    console.log(`   Unread Count: ${thread.unread_count}`)
    console.log(`   Last Message: ${new Date(thread.last_message_at).toLocaleString()}`)
    
    // 2. Check ALL messages in this thread
    console.log('\n2. All messages in this thread:')
    console.log('=' .repeat(50))
    const { data: messages, error: msgError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    
    if (msgError) {
      console.error('❌ Messages error:', msgError)
      return
    }
    
    messages.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.direction} - ${msg.folder}`)
      console.log(`   From: ${msg.contact_email || msg.sender_email}`)
      console.log(`   To: ${msg.sender_email || msg.contact_email}`)
      console.log(`   Subject: ${msg.subject}`)
      console.log(`   Status: ${msg.status}`)
      console.log(`   Created: ${new Date(msg.created_at).toLocaleString()}`)
      console.log('')
    })
    
    // 3. Simulate inbox API folder filtering
    console.log('3. Testing folder filtering (inbox folder):')
    console.log('=' .repeat(50))
    
    // Test what messages are in "inbox" folder
    const { data: inboxMessages, error: inboxError } = await supabase
      .from('inbox_messages')
      .select('conversation_id, direction, folder, status')
      .eq('user_id', userId)
      .eq('folder', 'inbox')
      .eq('conversation_id', conversationId)
    
    if (inboxError) {
      console.error('❌ Inbox messages error:', inboxError)
    } else {
      console.log(`📥 Messages in "inbox" folder for this thread: ${inboxMessages.length}`)
      inboxMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.direction} - ${msg.folder} - ${msg.status}`)
      })
    }
    
    // 4. Test the exact query inbox API makes for threads
    console.log('\n4. Testing inbox API thread query:')
    console.log('=' .repeat(50))
    
    // Step 1: Get thread IDs that have messages in inbox folder
    const { data: messagesInFolder, error: folderError } = await supabase
      .from('inbox_messages')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('channel', 'email')
      .eq('folder', 'inbox')
    
    if (folderError) {
      console.error('❌ Folder query error:', folderError)
      return
    }
    
    const threadIds = [...new Set(messagesInFolder.map(m => m.conversation_id))]
    console.log(`📁 Found ${messagesInFolder.length} messages in inbox folder`)
    console.log(`📁 ${threadIds.length} unique thread IDs`)
    console.log(`📁 Our thread included? ${threadIds.includes(conversationId) ? 'YES ✅' : 'NO ❌'}`)
    
    if (!threadIds.includes(conversationId)) {
      console.log('\n❌ PROBLEM FOUND: Our thread has no messages in "inbox" folder!')
      console.log('🔧 SOLUTION: The reply message needs folder="inbox" not folder="sent"')
      
      // Check what folder the reply is actually in
      const replyMessage = messages.find(m => m.direction === 'inbound')
      if (replyMessage) {
        console.log(`📧 Reply message is in folder: "${replyMessage.folder}"`)
        console.log(`🔧 It should be in folder: "inbox"`)
      }
    }
    
    // 5. Test fix - what if we change the folder?
    console.log('\n5. Proposed fix:')
    console.log('=' .repeat(50))
    console.log('✅ All inbound (reply) messages should have folder="inbox"')
    console.log('✅ Outbound (sent) messages should have folder="sent"')
    console.log('✅ This will make threads show up correctly in each folder')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugInboxFiltering()