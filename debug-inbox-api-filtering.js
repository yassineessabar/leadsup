#!/usr/bin/env node

/**
 * Debug why inbox API returns empty array when threads exist
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugInboxAPIFiltering() {
  try {
    console.log('🔍 Debugging why inbox API returns empty array\n')
    
    const userId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    const conversationId = 'YW50aG95MjMyN0BnbWFpbC5jb218dGVz'
    
    // 1. Test the exact inbox API filtering logic step by step
    console.log('1. Step-by-step inbox API filtering:')
    console.log('=' .repeat(50))
    
    // Step 1: Get thread IDs that have messages in inbox folder
    console.log('Step 1: Get messages in inbox folder...')
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
    console.log(`✅ Found ${messagesInFolder.length} messages, ${threadIds.length} unique threads`)
    console.log(`✅ Our thread included: ${threadIds.includes(conversationId) ? 'YES' : 'NO'}`)
    
    // Step 2: Get threads with those IDs
    console.log('\nStep 2: Get threads with those IDs...')
    let query = supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
    
    if (threadIds.length > 0) {
      query = query.in('conversation_id', threadIds)
    }
    
    const { data: threads, error: threadError } = await query.limit(5)
    
    if (threadError) {
      console.error('❌ Thread query error:', threadError)
      return
    }
    
    console.log(`✅ Found ${threads.length} threads`)
    threads.forEach((thread, i) => {
      console.log(`${i + 1}. ${thread.conversation_id} - ${thread.contact_email}`)
      console.log(`   Subject: ${thread.subject}`)
      console.log(`   Status: ${thread.status}`)
      console.log(`   Messages: ${thread.message_count}`)
    })
    
    // Step 3: For each thread, get latest message in folder
    console.log('\nStep 3: Get latest messages for each thread...')
    const formattedThreads = []
    
    for (const thread of threads) {
      console.log(`\nProcessing thread: ${thread.conversation_id}`)
      
      let messageQuery = supabase
        .from('inbox_messages')
        .select('id, subject, body_text, direction, status, sent_at, received_at, sender_email, contact_name, contact_email, has_attachments, folder')
        .eq('user_id', userId)
        .eq('conversation_id', thread.conversation_id)
        .eq('folder', 'inbox') // This is the key filter!
        
      const { data: latestMessage, error: messageError } = await messageQuery
        .order('sent_at', { ascending: false, nullsLast: true })
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (messageError) {
        console.log(`❌ No message found: ${messageError.message}`)
        console.log(`   This thread will be FILTERED OUT`)
        continue
      } else {
        console.log(`✅ Latest message found: ${latestMessage.direction} - ${latestMessage.folder}`)
        formattedThreads.push({
          conversation_id: thread.conversation_id,
          contact_email: thread.contact_email,
          subject: thread.subject
        })
      }
    }
    
    console.log(`\n📊 Final result: ${formattedThreads.length} threads after filtering`)
    
    // 4. Check what's wrong with our specific thread
    console.log('\n4. Debugging our specific thread:')
    console.log('=' .repeat(50))
    
    // Get our thread
    const { data: ourThread, error: ourThreadError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single()
    
    if (ourThreadError) {
      console.error('❌ Our thread not found:', ourThreadError)
      return
    }
    
    console.log(`✅ Our thread exists: ${ourThread.contact_email}`)
    
    // Get latest message for our thread with folder filter
    console.log('\nTesting latest message query for our thread...')
    const { data: ourLatestMessage, error: ourMsgError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .eq('folder', 'inbox')
      .order('sent_at', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (ourMsgError) {
      console.error('❌ PROBLEM FOUND: No latest message in inbox folder')
      console.error('Error:', ourMsgError.message)
      
      // Check what messages exist for this thread
      console.log('\nChecking ALL messages for this thread:')
      const { data: allOurMessages, error: allMsgError } = await supabase
        .from('inbox_messages')
        .select('id, direction, folder, status, subject')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
      
      if (allMsgError) {
        console.error('❌ Error getting all messages:', allMsgError)
      } else {
        console.log(`📧 Found ${allOurMessages.length} messages:`)
        allOurMessages.forEach((msg, i) => {
          console.log(`${i + 1}. ${msg.direction} - folder: "${msg.folder}" - status: "${msg.status}"`)
        })
        
        // Check if any have null/undefined folder
        const badFolders = allOurMessages.filter(m => !m.folder || m.folder === null || m.folder === undefined)
        if (badFolders.length > 0) {
          console.log(`❌ PROBLEM: ${badFolders.length} messages have null/undefined folder`)
        }
      }
    } else {
      console.log('✅ Latest message found - thread should appear in inbox')
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugInboxAPIFiltering()