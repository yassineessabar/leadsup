#!/usr/bin/env node

/**
 * Simulate the exact inbox API call to debug the empty response
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function simulateInboxAPI() {
  try {
    console.log('🔍 Simulating exact inbox API call\n')
    
    const userId = '6dae1cdc-2dbc-44ce-9145-4584981eef44'
    const filters = {
      page: 1,
      limit: 20,
      offset: 0,
      campaigns: [],
      senders: [],
      leadStatuses: [],
      folder: 'inbox',
      channel: 'email',
      search: '',
      dateFrom: null,
      dateTo: null,
      status: null
    }
    
    console.log('Parameters:', filters)
    console.log('')
    
    // Step 1: Get thread IDs that have messages in the specified folder
    console.log('Step 1: Getting messages in inbox folder...')
    let folderQuery = supabase
      .from('inbox_messages')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('channel', 'email')
      .eq('folder', 'inbox')
      
    const { data: messagesInFolder, error: folderError } = await folderQuery
      
    if (folderError) {
      console.error('❌ Error fetching messages by folder:', folderError)
      return
    }
    
    const threadIds = [...new Set(messagesInFolder.map(m => m.conversation_id))]
    console.log(`✅ Found ${messagesInFolder.length} messages, ${threadIds.length} unique threads`)
    
    if (threadIds.length === 0) {
      console.log('❌ No messages in inbox folder - returning empty result')
      return
    }
    
    // Step 2: Build the main query for threads
    console.log('\nStep 2: Getting threads...')
    let query = supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .in('conversation_id', threadIds)
      .range(0, 19) // limit 20
    
    const { data: threads, error: threadError } = await query
    
    if (threadError) {
      console.error('❌ Error fetching threads:', threadError)
      return
    }
    
    console.log(`✅ Found ${threads.length} threads`)
    
    // Step 3: Get latest messages for each thread
    console.log('\nStep 3: Getting latest message for each thread...')
    const formattedThreads = []
    
    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i]
      console.log(`\nProcessing thread ${i + 1}/${threads.length}: ${thread.conversation_id}`)
      
      // Get the latest message for this conversation
      let messageQuery = supabase
        .from('inbox_messages')
        .select('id, subject, body_text, direction, status, sent_at, received_at, sender_id, sender_email, contact_name, contact_email, has_attachments, folder')
        .eq('user_id', userId)
        .eq('conversation_id', thread.conversation_id)
        .eq('folder', 'inbox') // This is the critical filter
        
      const { data: latestMessage, error: messageError } = await messageQuery
        .order('sent_at', { ascending: false, nullsLast: true })
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Debug message fetching
      if (messageError) {
        console.log(`❌ No message found: ${messageError.message}`)
        console.log(`   Thread will be SKIPPED (returns null)`)
        continue // This thread gets filtered out
      } else {
        console.log(`✅ Latest message found: ${latestMessage.direction} - ${latestMessage.folder}`)
      }
      
      // Only return threads that have a message in the specified folder
      if (!latestMessage) {
        console.log(`❌ No latest message - thread skipped`)
        continue
      }
      
      const formattedThread = {
        id: thread.id,
        conversation_id: thread.conversation_id,
        sender: thread.contact_email?.trim() || 'Unknown',
        subject: thread.subject || 'No subject',
        preview: thread.last_message_preview || (latestMessage?.body_text?.substring(0, 100) + '...' || ''),
        isRead: thread.unread_count === 0,
        content: latestMessage?.body_html || latestMessage?.body_text || thread.last_message_preview || 'No content available',
        // ... other fields
      }
      
      formattedThreads.push(formattedThread)
      console.log(`✅ Thread formatted and added to results`)
    }
    
    console.log(`\n📊 FINAL RESULT: ${formattedThreads.length} threads`)
    
    // This is what the API returns
    const apiResponse = {
      success: true,
      emails: formattedThreads, // UI expects 'emails' at root level
      pagination: {
        page: 1,
        limit: 20,
        total: formattedThreads.length,
        totalPages: Math.ceil(formattedThreads.length / 20),
        hasMore: false
      }
    }
    
    console.log('\n🔍 API Response Structure:')
    console.log('success:', apiResponse.success)
    console.log('emails.length:', apiResponse.emails.length)
    console.log('pagination:', apiResponse.pagination)
    
    if (formattedThreads.length > 0) {
      console.log('\n📧 First thread:')
      console.log('conversation_id:', formattedThreads[0].conversation_id)
      console.log('sender:', formattedThreads[0].sender)
      console.log('subject:', formattedThreads[0].subject)
    }
    
  } catch (error) {
    console.error('❌ Simulation failed:', error)
  }
}

simulateInboxAPI()