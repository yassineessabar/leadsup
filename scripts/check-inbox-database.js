#!/usr/bin/env node

/**
 * Check Inbox Database Script
 * 
 * This script directly queries the database to check if emails
 * are being logged to the inbox_messages and inbox_threads tables.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkInboxDatabase() {
  console.log('🔍 CHECKING INBOX DATABASE TABLES\n')

  try {
    // Check inbox_messages table
    console.log('📧 Checking inbox_messages table...')
    const { data: messages, error: messagesError } = await supabase
      .from('inbox_messages')
      .select('id, direction, contact_email, subject, sent_at, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (messagesError) {
      console.error('❌ Error querying inbox_messages:', messagesError)
    } else {
      console.log(`📊 Found ${messages.length} messages in inbox_messages:`)
      messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.direction} | ${msg.contact_email} | ${msg.subject || 'No subject'} | ${msg.sent_at || msg.created_at}`)
      })
    }

    console.log()

    // Check inbox_threads table  
    console.log('🧵 Checking inbox_threads table...')
    const { data: threads, error: threadsError } = await supabase
      .from('inbox_threads')
      .select('id, contact_email, subject, last_message_at, message_count')
      .order('last_message_at', { ascending: false })
      .limit(10)

    if (threadsError) {
      console.error('❌ Error querying inbox_threads:', threadsError)
    } else {
      console.log(`📊 Found ${threads.length} threads in inbox_threads:`)
      threads.forEach((thread, index) => {
        console.log(`  ${index + 1}. ${thread.contact_email} | ${thread.subject || 'No subject'} | ${thread.message_count} messages | ${thread.last_message_at}`)
      })
    }

    console.log()

    // Check for outbound messages specifically
    console.log('📤 Checking for outbound messages...')
    const { data: outbound, error: outboundError } = await supabase
      .from('inbox_messages')
      .select('id, contact_email, subject, sender_email, sent_at')
      .eq('direction', 'outbound')
      .order('created_at', { ascending: false })
      .limit(5)

    if (outboundError) {
      console.error('❌ Error querying outbound messages:', outboundError)
    } else {
      console.log(`📊 Found ${outbound.length} outbound messages:`)
      outbound.forEach((msg, index) => {
        console.log(`  ${index + 1}. FROM: ${msg.sender_email} → TO: ${msg.contact_email}`)
        console.log(`     Subject: ${msg.subject || 'No subject'}`)
        console.log(`     Sent: ${msg.sent_at}`)
        console.log()
      })
    }

    // Check campaigns table for reference
    console.log('🎯 Checking campaigns table...')
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, user_id, status')
      .limit(5)

    if (campaignsError) {
      console.error('❌ Error querying campaigns:', campaignsError)
    } else {
      console.log(`📊 Found ${campaigns.length} campaigns:`)
      campaigns.forEach((campaign, index) => {
        console.log(`  ${index + 1}. ${campaign.name} (${campaign.status}) | User: ${campaign.user_id}`)
      })
    }

  } catch (error) {
    console.error('❌ Database check failed:', error)
  }
}

// Run the check
checkInboxDatabase().then(() => {
  console.log('✅ Database check complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})