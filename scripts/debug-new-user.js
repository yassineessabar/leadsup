#!/usr/bin/env node

/**
 * Debug New User Issue
 * 
 * This script debugs why the new user has threads but no inbox_messages
 * despite successful email sending.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugNewUser() {
  console.log('🔍 DEBUGGING NEW USER INBOX ISSUE\n')

  const newUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
  console.log(`👤 Debugging user: ${newUserId}`)

  try {
    // Check threads for this user
    console.log('\n🧵 Checking inbox_threads:')
    const { data: threads, error: threadsError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('user_id', newUserId)
      .order('created_at', { ascending: false })

    if (threadsError) {
      console.error('❌ Error:', threadsError)
    } else {
      console.log(`✅ Found ${threads.length} threads:`)
      threads.forEach((thread, i) => {
        console.log(`  ${i + 1}. ${thread.contact_email}`)
        console.log(`     Subject: ${thread.subject}`)
        console.log(`     Conversation ID: ${thread.conversation_id}`)
        console.log(`     Message Count: ${thread.message_count}`)
        console.log(`     Created: ${thread.created_at}`)
        console.log()
      })
    }

    // Check messages for this user
    console.log('📧 Checking inbox_messages:')
    const { data: messages, error: messagesError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', newUserId)
      .order('created_at', { ascending: false })

    if (messagesError) {
      console.error('❌ Error:', messagesError)
    } else {
      console.log(`📊 Found ${messages.length} messages:`)
      if (messages.length === 0) {
        console.log('❌ NO MESSAGES FOUND - This is the problem!')
      } else {
        messages.forEach((msg, i) => {
          console.log(`  ${i + 1}. ${msg.direction} | ${msg.sender_email} → ${msg.contact_email}`)
          console.log(`     Subject: ${msg.subject}`)
          console.log(`     Folder: ${msg.folder}, Status: ${msg.status}`)
          console.log(`     Created: ${msg.created_at}`)
          console.log()
        })
      }
    }

    // Check prospect_sequence_progress (the other tracking table)
    console.log('📊 Checking prospect_sequence_progress (email tracking):')
    const { data: progress, error: progressError } = await supabase
      .from('prospect_sequence_progress')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(10)

    if (progressError) {
      console.error('❌ Error:', progressError)
    } else {
      console.log(`📊 Found ${progress.length} recent email sends:`)
      progress.forEach((p, i) => {
        console.log(`  ${i + 1}. Campaign: ${p.campaign_id}`)
        console.log(`     Prospect: ${p.prospect_id}`)
        console.log(`     Status: ${p.status}`)
        console.log(`     Sender: ${p.sender_email}`)
        console.log(`     Message ID: ${p.message_id}`)
        console.log(`     Sent: ${p.sent_at}`)
        console.log()
      })
    }

    // Check campaigns for this user
    console.log('🎯 Checking campaigns for this user:')
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', newUserId)

    if (campaignsError) {
      console.error('❌ Error:', campaignsError)
    } else {
      console.log(`📊 Found ${campaigns.length} campaigns:`)
      campaigns.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name} (${c.status})`)
        console.log(`     ID: ${c.id}`)
        console.log(`     Created: ${c.created_at}`)
        console.log()
      })
    }

    // Simulate the inbox logging process that should have happened
    console.log('🧪 Testing inbox message insertion manually:')
    
    if (campaigns.length > 0 && threads.length > 0) {
      const testCampaign = campaigns[0]
      const testThread = threads[0]
      
      console.log(`Using campaign: ${testCampaign.id}`)
      console.log(`Using thread: ${testThread.conversation_id}`)
      
      // Try to insert a test message
      const testMessage = {
        user_id: newUserId,
        message_id: `debug-test-${Date.now()}`,
        conversation_id: testThread.conversation_id,
        campaign_id: testCampaign.id,
        contact_email: testThread.contact_email,
        contact_name: testThread.contact_name,
        sender_email: 'test@sender.com',
        subject: 'Test Debug Message',
        body_text: 'This is a debug test message',
        body_html: '<p>This is a debug test message</p>',
        direction: 'outbound',
        channel: 'email',
        message_type: 'email',
        status: 'read', // Using 'read' not 'sent'
        folder: 'sent',
        provider: 'debug',
        sent_at: new Date().toISOString()
      }

      console.log('📤 Attempting test insert...')
      const { data: insertResult, error: insertError } = await supabase
        .from('inbox_messages')
        .insert(testMessage)
        .select()

      if (insertError) {
        console.error('❌ TEST INSERT FAILED:')
        console.error('❌ Error details:', JSON.stringify(insertError, null, 2))
        console.log('\n🎯 THIS IS LIKELY THE SAME ERROR PREVENTING REAL INSERTS!')
        
        // Check what constraints are failing
        if (insertError.code === '23514') {
          console.log('\n🔧 CHECK CONSTRAINT VIOLATION:')
          console.log('The inbox_messages table has constraints that are being violated')
          console.log('Possible issues:')
          console.log('- provider: must be gmail|outlook|smtp|sms (we used "debug")')
          console.log('- status: must be read|unread|archived|deleted (we used "read" ✓)')
          console.log('- folder: must be inbox|sent|drafts|trash|archived (we used "sent" ✓)')
          console.log('- message_type: must be email|reply|forward (we used "email" ✓)')
          console.log('- direction: must be inbound|outbound (we used "outbound" ✓)')
          console.log('- channel: must be email|sms (we used "email" ✓)')
        }
      } else {
        console.log('✅ TEST INSERT SUCCESS!')
        console.log('Inserted message:', insertResult[0]?.id)
        console.log('\n🤔 If test insert works but real ones don\'t,')
        console.log('   the issue is in the email sending code logic')
      }
    }

    console.log('\n🎯 ANALYSIS:')
    console.log(`✅ Threads created: ${threads.length}`)
    console.log(`❌ Messages created: ${messages.length}`)
    console.log(`📊 Email sends tracked: ${progress.length}`)
    
    if (threads.length > 0 && messages.length === 0) {
      console.log('\n💡 DIAGNOSIS:')
      console.log('- Email sending is working (threads created)')
      console.log('- Thread creation in inbox system is working')
      console.log('- BUT inbox_messages insertion is failing silently')
      console.log('- This suggests a constraint violation in the inbox logging code')
    }

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run the debug
debugNewUser().then(() => {
  console.log('\n✅ Debug complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Debug script failed:', error)
  process.exit(1)
})