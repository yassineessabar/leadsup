#!/usr/bin/env node

/**
 * Verify the new replies appear in inbox with correct user ID
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function verifyInboxDisplay() {
  try {
    console.log('📱 Verifying inbox display\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // 1. Check the new reply messages with correct user ID
    console.log('1. New reply messages:')
    console.log('=' .repeat(50))
    
    const { data: newReplies, error: replyError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false })
    
    if (replyError) {
      console.error('❌ Error:', replyError)
      return
    }
    
    console.log(`📧 Found ${newReplies.length} new replies:`)
    newReplies.forEach((msg, i) => {
      const userMatch = msg.user_id === correctUserId ? '✅' : '❌'
      const folderCheck = msg.folder === 'inbox' ? '✅' : '❌'
      console.log(`${i + 1}. ${msg.contact_email} ${userMatch}`)
      console.log(`   Subject: ${msg.subject}`)
      console.log(`   User ID: ${msg.user_id} ${userMatch}`)
      console.log(`   Folder: ${msg.folder} ${folderCheck}`)
      console.log(`   Time: ${new Date(msg.created_at).toLocaleTimeString()}`)
      console.log('')
    })
    
    // 2. Check threads for these replies
    console.log('2. Threads for new replies:')
    console.log('=' .repeat(50))
    
    const conversationIds = newReplies.map(r => r.conversation_id)
    
    const { data: newThreads, error: threadError } = await supabase
      .from('inbox_threads')
      .select('*')
      .in('conversation_id', conversationIds)
    
    if (threadError) {
      console.error('❌ Thread error:', threadError)
    } else {
      console.log(`🧵 Found ${newThreads.length} threads:`)
      newThreads.forEach((thread, i) => {
        const userMatch = thread.user_id === correctUserId ? '✅' : '❌'
        console.log(`${i + 1}. ${thread.contact_email} ${userMatch}`)
        console.log(`   User ID: ${thread.user_id} ${userMatch}`)
        console.log(`   Conversation: ${thread.conversation_id}`)
        console.log('')
      })
    }
    
    // 3. Simulate inbox API query
    console.log('3. Inbox API simulation:')
    console.log('=' .repeat(50))
    
    // Step 1: Get messages in inbox folder
    const { data: inboxMessages, error: inboxError } = await supabase
      .from('inbox_messages')
      .select('conversation_id')
      .eq('user_id', correctUserId)
      .eq('folder', 'inbox')
      .eq('channel', 'email')
    
    if (inboxError) {
      console.error('❌ Inbox query error:', inboxError)
      return
    }
    
    const threadIds = [...new Set(inboxMessages.map(m => m.conversation_id))]
    console.log(`📁 Messages in inbox: ${inboxMessages.length}`)
    console.log(`📁 Unique threads: ${threadIds.length}`)
    
    // Check if our new replies are included
    const newReplyThreads = newReplies.map(r => r.conversation_id)
    const includedThreads = newReplyThreads.filter(t => threadIds.includes(t))
    console.log(`📁 New reply threads in inbox: ${includedThreads.length}/${newReplyThreads.length}`)
    
    if (includedThreads.length === newReplyThreads.length) {
      console.log('✅ All new replies are in inbox query!')
    } else {
      console.log('❌ Some new replies missing from inbox query')
    }
    
    // Step 2: Get threads that would appear
    if (threadIds.length > 0) {
      const { data: apiThreads, error: apiError } = await supabase
        .from('inbox_threads')
        .select('contact_email, subject, last_message_at')
        .eq('user_id', correctUserId)
        .in('conversation_id', threadIds)
        .order('last_message_at', { ascending: false })
        .limit(10)
      
      if (apiError) {
        console.error('❌ API threads error:', apiError)
      } else {
        console.log(`\n📋 Threads that would appear in inbox:`)
        apiThreads.forEach((thread, i) => {
          console.log(`${i + 1}. ${thread.contact_email} - "${thread.subject}"`)
          console.log(`   Last message: ${new Date(thread.last_message_at).toLocaleTimeString()}`)
        })
      }
    }
    
    // 4. Final verdict
    console.log('\n4. Final verdict:')
    console.log('=' .repeat(50))
    
    const correctUserReplies = newReplies.filter(r => r.user_id === correctUserId)
    const inboxFolderReplies = newReplies.filter(r => r.folder === 'inbox')
    const correctThreads = newThreads.filter(t => t.user_id === correctUserId)
    
    console.log(`✅ Replies with correct user ID: ${correctUserReplies.length}/${newReplies.length}`)
    console.log(`✅ Replies in inbox folder: ${inboxFolderReplies.length}/${newReplies.length}`)
    console.log(`✅ Threads with correct user ID: ${correctThreads.length}/${newThreads.length}`)
    console.log(`✅ Replies appear in inbox query: ${includedThreads.length}/${newReplyThreads.length}`)
    
    if (correctUserReplies.length === newReplies.length && 
        inboxFolderReplies.length === newReplies.length &&
        correctThreads.length === newThreads.length &&
        includedThreads.length === newReplyThreads.length) {
      console.log('\n🎉 SUCCESS: Everything is working perfectly!')
      console.log('📱 Your replies should appear in the inbox tab!')
      console.log('🔄 Refresh your browser to see them')
    } else {
      console.log('\n❌ Issues detected - need to investigate further')
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

verifyInboxDisplay()