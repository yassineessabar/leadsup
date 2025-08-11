#!/usr/bin/env node

/**
 * Test API Response
 * 
 * This script tests the exact API response format that the UI is receiving
 * to debug why messages aren't displaying despite folder count being correct.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAPIResponse() {
  console.log('🔍 TESTING INBOX API RESPONSE FORMAT\n')

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const folder = 'sent'
    const channel = 'email'

    console.log(`👤 Testing with user: ${userId}`)
    console.log(`📁 Folder: ${folder}`)
    console.log(`📧 Channel: ${channel}`)

    // Simulate the exact API logic from route.ts
    console.log('\n📋 Step 1: Get conversation IDs with messages in folder')
    
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
    console.log(`✅ Found ${threadIds.length} unique conversations: ${threadIds.join(', ')}`)

    if (threadIds.length === 0) {
      console.log('🚨 NO CONVERSATION IDs FOUND - This is why UI shows "No emails found"')
      return
    }

    console.log('\n🧵 Step 2: Get threads for these conversations')
    
    const { data: threads, error: threadsError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', userId)
      .in('conversation_id', threadIds)
      .order('last_message_at', { ascending: false })

    if (threadsError) {
      console.error('❌ Error:', threadsError)
      return
    }

    console.log(`✅ Found ${threads.length} threads`)

    console.log('\n📧 Step 3: Get latest message for each thread')
    
    const formattedThreads = await Promise.all(
      threads.map(async (thread) => {
        const { data: latestMessage, error: msgError } = await supabase
          .from('inbox_messages')
          .select('id, subject, body_text, direction, status, sent_at, received_at, sender_id, sender_email, contact_name, contact_email, has_attachments, folder')
          .eq('user_id', userId)
          .eq('conversation_id', thread.conversation_id)
          .order('sent_at', { ascending: false, nullsLast: true })
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (msgError) {
          console.log(`⚠️ No latest message for thread ${thread.conversation_id}: ${msgError.message}`)
        }

        return {
          id: thread.id,
          conversation_id: thread.conversation_id,
          subject: thread.subject,
          contact_name: thread.contact_name,
          contact_email: thread.contact_email,
          campaign_id: thread.campaign_id,
          message_count: thread.message_count,
          unread_count: thread.unread_count,
          last_message_at: thread.last_message_at,
          last_message_preview: thread.last_message_preview,
          status: thread.status,
          lead_status: thread.lead_status,
          tags: thread.tags,
          latest_message: latestMessage || null
        }
      })
    )

    console.log('✅ Formatted threads with latest messages:')
    formattedThreads.forEach((thread, index) => {
      console.log(`\n  ${index + 1}. Thread: ${thread.contact_email}`)
      console.log(`     Subject: ${thread.subject}`)
      console.log(`     Message Count: ${thread.message_count}`)
      console.log(`     Latest Message:`)
      if (thread.latest_message) {
        console.log(`       ✅ HAS LATEST MESSAGE`)
        console.log(`       - Direction: ${thread.latest_message.direction}`)
        console.log(`       - From: ${thread.latest_message.sender_email}`)
        console.log(`       - To: ${thread.latest_message.contact_email}`)
        console.log(`       - Subject: ${thread.latest_message.subject}`)
        console.log(`       - Folder: ${thread.latest_message.folder}`)
        console.log(`       - Status: ${thread.latest_message.status}`)
        console.log(`       - Sent At: ${thread.latest_message.sent_at}`)
      } else {
        console.log(`       ❌ NO LATEST MESSAGE FOUND`)
      }
    })

    console.log('\n📤 Step 4: Final API Response Format')
    
    const response = {
      success: true,
      data: {
        threads: formattedThreads,
        pagination: {
          page: 1,
          limit: 20,
          total: formattedThreads.length,
          totalPages: Math.ceil(formattedThreads.length / 20),
          hasMore: false
        }
      }
    }

    console.log('🎯 API RESPONSE:')
    console.log(JSON.stringify(response, null, 2))

    console.log('\n🔍 DEBUGGING CHECKLIST:')
    console.log(`✅ Threads found: ${threads.length}`)
    console.log(`✅ Latest messages populated: ${formattedThreads.filter(t => t.latest_message).length}`)
    console.log(`✅ Response structure: { success: true, data: { threads: [...] } }`)
    
    console.log('\n💡 IF UI STILL SHOWS "No emails found":')
    console.log('1. Check browser console for JavaScript errors')
    console.log('2. Check Network tab in DevTools for actual API response')
    console.log('3. Verify UI is looking for data.threads (not data.messages)')
    console.log('4. Check if UI expects different field names')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testAPIResponse().then(() => {
  console.log('\n✅ API response test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test script failed:', error)
  process.exit(1)
})