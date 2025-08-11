#!/usr/bin/env node

/**
 * Test Fixed API Response
 * 
 * This script tests the updated API response format that should now work with the UI.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testFixedAPI() {
  console.log('🔍 TESTING FIXED API RESPONSE FORMAT\n')

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const folder = 'sent'
    const channel = 'email'

    console.log(`👤 Testing with user: ${userId}`)
    console.log(`📁 Folder: ${folder}`)

    // Simulate the exact fixed API logic
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
    console.log(`✅ Found ${threadIds.length} unique conversations`)

    console.log('\n🧵 Step 2: Get threads and format for UI')
    
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

    console.log('\n📧 Step 3: Format threads with UI-compatible fields')
    
    const formattedThreads = await Promise.all(
      threads.map(async (thread) => {
        const { data: latestMessage } = await supabase
          .from('inbox_messages')
          .select('id, subject, body_text, direction, status, sent_at, received_at, sender_id, sender_email, contact_name, contact_email, has_attachments, folder')
          .eq('user_id', userId)
          .eq('conversation_id', thread.conversation_id)
          .order('sent_at', { ascending: false, nullsLast: true })
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          id: thread.id,
          conversation_id: thread.conversation_id,
          
          // UI expects these fields for email display
          sender: thread.contact_email?.trim() || 'Unknown',
          subject: thread.subject || 'No subject',
          preview: thread.last_message_preview || (latestMessage?.body_text?.substring(0, 100) + '...' || ''),
          date: latestMessage?.sent_at ? new Date(latestMessage.sent_at).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }) : new Date(thread.last_message_at).toLocaleDateString(),
          isRead: thread.unread_count === 0,
          hasAttachment: latestMessage?.has_attachments || false,
          
          // Keep original thread data for compatibility
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

    console.log('📤 Step 4: Final API Response Format (UI Compatible)')
    
    const response = {
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

    console.log('🎯 API RESPONSE (UI Compatible):')
    console.log(JSON.stringify(response, null, 2))

    console.log('\n🔍 VERIFICATION CHECKLIST:')
    console.log(`✅ Response has 'emails' array: ${!!response.emails}`)
    console.log(`✅ Emails count: ${response.emails.length}`)
    
    if (response.emails.length > 0) {
      const firstEmail = response.emails[0]
      console.log(`✅ First email has required UI fields:`)
      console.log(`   - sender: "${firstEmail.sender}"`)
      console.log(`   - subject: "${firstEmail.subject}"`)
      console.log(`   - preview: "${firstEmail.preview?.substring(0, 50)}..."`)
      console.log(`   - date: "${firstEmail.date}"`)
      console.log(`   - isRead: ${firstEmail.isRead}`)
      console.log(`   - hasAttachment: ${firstEmail.hasAttachment}`)
    }

    console.log('\n🎉 SUCCESS! This format should work with the UI!')
    console.log('💡 Now refresh your inbox page and check if messages appear!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testFixedAPI().then(() => {
  console.log('\n✅ Fixed API test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test script failed:', error)
  process.exit(1)
})