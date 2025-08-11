#!/usr/bin/env node

/**
 * Debug Inbox Messages Script
 * 
 * This script specifically checks the inbox_messages table structure
 * and tries to understand why messages aren't appearing in the UI.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugInboxMessages() {
  console.log('🔍 DEBUGGING INBOX MESSAGES TABLE\n')

  try {
    // Check table structure
    console.log('📋 Checking inbox_messages table structure...')
    const { data: columns, error: structureError } = await supabase.rpc('get_table_columns', {
      table_name: 'inbox_messages'
    })

    if (structureError) {
      console.log('⚠️ Could not get table structure via RPC, checking data instead...')
    }

    // Count all messages
    console.log('📊 Counting all messages in inbox_messages...')
    const { count, error: countError } = await supabase
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Error counting messages:', countError)
    } else {
      console.log(`📊 Total messages count: ${count}`)
    }

    // Get all messages with all details
    console.log('\n📧 Fetching ALL messages with full details...')
    const { data: allMessages, error: allError } = await supabase
      .from('inbox_messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (allError) {
      console.error('❌ Error fetching all messages:', allError)
    } else {
      console.log(`📊 Found ${allMessages.length} messages in inbox_messages:`)
      
      if (allMessages.length === 0) {
        console.log('❌ INBOX_MESSAGES TABLE IS EMPTY!')
      } else {
        allMessages.forEach((msg, index) => {
          console.log(`\n--- Message ${index + 1} ---`)
          console.log(`ID: ${msg.id}`)
          console.log(`User ID: ${msg.user_id}`)
          console.log(`Direction: ${msg.direction}`)
          console.log(`From: ${msg.sender_email} → To: ${msg.contact_email}`)
          console.log(`Subject: ${msg.subject}`)
          console.log(`Status: ${msg.status}`)
          console.log(`Folder: ${msg.folder}`)
          console.log(`Conversation ID: ${msg.conversation_id}`)
          console.log(`Sent At: ${msg.sent_at}`)
          console.log(`Created At: ${msg.created_at}`)
        })
      }
    }

    // Check threads count for comparison
    console.log('\n🧵 Checking threads for comparison...')
    const { count: threadCount, error: threadCountError } = await supabase
      .from('inbox_threads')
      .select('*', { count: 'exact', head: true })

    if (threadCountError) {
      console.error('❌ Error counting threads:', threadCountError)
    } else {
      console.log(`📊 Total threads count: ${threadCount}`)
    }

    // Check if there are any constraints or triggers that might be interfering
    console.log('\n🔧 Testing a simple insert...')
    const testInsert = {
      user_id: '6dae1cdc-2dbc-44ce-9145-4584981eef44', // Use existing user_id
      message_id: `debug-test-${Date.now()}`,
      conversation_id: 'debug-test-conversation',
      contact_email: 'debug@test.com',
      sender_email: 'debug-sender@test.com',
      subject: 'Debug Test Message',
      body_text: 'This is a debug test message',
      direction: 'outbound',
      status: 'read',
      folder: 'sent',
      provider: 'debug'
    }

    console.log('📤 Attempting debug insert...')
    const { data: debugResult, error: debugError } = await supabase
      .from('inbox_messages')
      .insert(testInsert)
      .select()

    if (debugError) {
      console.error('❌ DEBUG INSERT FAILED:', debugError)
    } else {
      console.log('✅ DEBUG INSERT SUCCESS:', debugResult)
      
      // Immediately check if we can find it
      const { data: foundDebug, error: findError } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('message_id', testInsert.message_id)
        .single()

      if (findError) {
        console.error('❌ Could not find debug message after insert:', findError)
      } else {
        console.log('✅ Found debug message after insert:', foundDebug.id)
      }
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error)
  }
}

// Run the debug
debugInboxMessages().then(() => {
  console.log('\n✅ Debug complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Debug script failed:', error)
  process.exit(1)
})