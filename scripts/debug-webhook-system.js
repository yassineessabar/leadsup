#!/usr/bin/env node

/**
 * Debug Webhook System
 * 
 * This script investigates why incoming email responses are not being captured.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function debugWebhookSystem() {
  console.log('🔍 DEBUGGING WEBHOOK SYSTEM');
  console.log('==========================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    const yourEmail = 'essabar.yassine@gmail.com'
    
    // 1. Check the latest messages in the system
    console.log('📊 Step 1: Recent inbox activity...')
    
    const { data: recentMessages } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log(`Found ${recentMessages?.length || 0} recent messages:`)
    recentMessages?.forEach((msg, i) => {
      const direction = msg.direction === 'outbound' ? '📤' : '📥'
      const time = new Date(msg.created_at).toLocaleTimeString()
      console.log(`   ${i + 1}. ${direction} "${msg.subject}" (${time})`)
      console.log(`      From/To: ${msg.contact_email}`)
      console.log(`      Status: ${msg.status}`)
      console.log(`      Conv ID: ${msg.conversation_id}`)
    })
    
    // 2. Check for any new messages since the "magggegeeull" email
    console.log('\n📧 Step 2: Messages since "magggegeeull" email...')
    
    const { data: magggegeeullMessage } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', 'magggegeeull')
      .single()
    
    if (magggegeeullMessage) {
      console.log(`✅ Found "magggegeeull" email sent at: ${new Date(magggegeeullMessage.created_at).toLocaleString()}`)
      
      const { data: newerMessages } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('user_id', userId)
        .gt('created_at', magggegeeullMessage.created_at)
        .order('created_at', { ascending: false })
      
      console.log(`Messages received after magggegeeull: ${newerMessages?.length || 0}`)
      newerMessages?.forEach((msg, i) => {
        const direction = msg.direction === 'outbound' ? '📤' : '📥'
        console.log(`   ${i + 1}. ${direction} "${msg.subject}"`)
        console.log(`      Time: ${new Date(msg.created_at).toLocaleString()}`)
        console.log(`      From: ${msg.contact_email}`)
      })
      
      // 3. Check messages in the same conversation
      console.log(`\n🧵 Step 3: Messages in same conversation (${magggegeeullMessage.conversation_id})...`)
      
      const { data: conversationMessages } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_id', magggegeeullMessage.conversation_id)
        .order('sent_at', { ascending: true })
      
      console.log(`Total messages in conversation: ${conversationMessages?.length || 0}`)
      conversationMessages?.forEach((msg, i) => {
        const direction = msg.direction === 'outbound' ? '📤' : '📥'
        const time = new Date(msg.sent_at || msg.created_at).toLocaleTimeString()
        console.log(`   ${i + 1}. ${direction} "${msg.subject}" (${time})`)
        console.log(`      ${msg.direction}: ${msg.direction === 'outbound' ? msg.contact_email : msg.sender_email || msg.contact_email}`)
        console.log(`      Message ID: ${msg.message_id}`)
      })
      
    } else {
      console.log('❌ Could not find "magggegeeull" email')
    }
    
    // 4. Check webhook endpoints are working
    console.log('\n🔗 Step 4: Testing webhook endpoints...')
    
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    // Test SMTP webhook endpoint
    try {
      const response = await fetch('http://localhost:3000/api/webhooks/smtp', {
        method: 'GET'
      })
      console.log(`SMTP webhook status: ${response.status}`)
    } catch (error) {
      console.log(`SMTP webhook error: ${error.message}`)
    }
    
    // Test Gmail webhook endpoint  
    try {
      const response = await fetch('http://localhost:3000/api/webhooks/gmail', {
        method: 'GET'
      })
      console.log(`Gmail webhook status: ${response.status}`)
    } catch (error) {
      console.log(`Gmail webhook error: ${error.message}`)
    }
    
    // 5. Check if there are any error logs or webhook attempts
    console.log('\n📋 Step 5: Checking for webhook logs...')
    
    // Look for any webhook-related tables or logs
    const possibleLogTables = ['webhook_logs', 'email_logs', 'inbox_logs', 'webhook_attempts']
    
    for (const tableName of possibleLogTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (!error && data) {
          console.log(`✅ ${tableName}: ${data.length} recent entries`)
          data.forEach((log, i) => {
            console.log(`   ${i + 1}. ${new Date(log.created_at).toLocaleString()}: ${log.status || log.type || 'unknown'}`)
          })
        }
      } catch (e) {
        // Table doesn't exist, skip
      }
    }
    
    console.log('\n🔧 DIAGNOSIS:')
    
    if (!newerMessages || newerMessages.length === 0) {
      console.log('❌ No new messages received after your reply')
      console.log('\n💡 Possible issues:')
      console.log('   1. 📧 Email webhook not configured')
      console.log('   2. 🔗 Webhook endpoints not receiving data')
      console.log('   3. 📨 Email provider not forwarding to webhooks')
      console.log('   4. ⏱️  Processing delay (try waiting a few more minutes)')
      console.log('   5. 🔒 Authentication or permission issues')
      
      console.log('\n🛠️ TROUBLESHOOTING STEPS:')
      console.log('   1. Check if Gmail Pub/Sub is configured')
      console.log('   2. Verify SMTP forwarding rules')
      console.log('   3. Test webhook endpoints manually')
      console.log('   4. Check server logs for errors')
      console.log('   5. Verify the reply was sent from the correct email')
      
      console.log('\n📧 Expected webhook flow:')
      console.log('   You reply → Gmail/Email provider → Webhook → Database → Inbox UI')
      
    } else {
      console.log('✅ New messages found - analyzing...')
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run the debug
debugWebhookSystem().then(() => {
  console.log('\n✅ Webhook system debug complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Debug failed:', error)
  process.exit(1)
});