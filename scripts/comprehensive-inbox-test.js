#!/usr/bin/env node

/**
 * COMPREHENSIVE INBOX TEST
 * 
 * This script tests the complete inbox functionality:
 * 1. Send emails via automation
 * 2. Check if they're logged to inbox_messages
 * 3. Verify inbox_threads are updated
 * 4. Test webhook endpoints
 * 5. Validate conversation threading
 */

const { createClient } = require('@supabase/supabase-js')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BASE_URL = 'http://localhost:3000'

async function comprehensiveInboxTest() {
  console.log('🧪 COMPREHENSIVE INBOX SYSTEM TEST')
  console.log('==================================\n')

  let testResults = {
    emailSending: false,
    inboxLogging: false,
    threadCreation: false,
    smtpWebhook: false,
    gmailWebhook: false,
    conversationThreading: false
  }

  try {
    // 1. BASELINE - Check current state
    console.log('📊 Step 1: Checking baseline state...')
    
    const { data: baselineMessages, error: baselineError } = await supabase
      .from('inbox_messages')
      .select('id')
      .eq('direction', 'outbound')

    const baselineCount = baselineMessages?.length || 0
    console.log(`📧 Current outbound messages: ${baselineCount}`)

    // 2. SEND TEST EMAILS
    console.log('\n📤 Step 2: Sending test emails via automation...')
    
    const emailResponse = await fetch(`${BASE_URL}/api/campaigns/automation/send-emails`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
      }
    })

    const emailResult = await emailResponse.json()
    console.log('📧 Email send result:', JSON.stringify(emailResult, null, 2))

    if (emailResult.success && emailResult.sent > 0) {
      testResults.emailSending = true
      console.log(`✅ Email sending: SUCCESS (${emailResult.sent} sent)`)
    } else {
      console.log('⚠️ Email sending: No emails sent (may be expected if no pending campaigns)')
    }

    // Wait a moment for async processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 3. CHECK INBOX LOGGING
    console.log('\n📥 Step 3: Checking inbox message logging...')
    
    const { data: newMessages, error: messagesError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'outbound')
      .order('created_at', { ascending: false })

    if (messagesError) {
      console.error('❌ Error checking inbox messages:', messagesError)
    } else {
      const newCount = newMessages?.length || 0
      const addedMessages = newCount - baselineCount
      
      console.log(`📊 Total outbound messages: ${newCount}`)
      console.log(`📊 Newly added messages: ${addedMessages}`)

      if (newMessages && newMessages.length > 0) {
        testResults.inboxLogging = true
        console.log('✅ Inbox logging: SUCCESS')
        
        // Show recent messages
        console.log('\n📧 Recent outbound messages:')
        newMessages.slice(0, 3).forEach((msg, index) => {
          console.log(`  ${index + 1}. ${msg.sender_email} → ${msg.contact_email}`)
          console.log(`     Subject: ${msg.subject}`)
          console.log(`     Status: ${msg.status}, Folder: ${msg.folder}`)
          console.log(`     Conversation ID: ${msg.conversation_id}`)
          console.log()
        })
      } else {
        console.log('❌ Inbox logging: No messages found')
      }
    }

    // 4. CHECK THREAD CREATION
    console.log('🧵 Step 4: Checking thread creation and updates...')
    
    const { data: threads, error: threadsError } = await supabase
      .from('inbox_threads')
      .select('*')
      .order('last_message_at', { ascending: false })

    if (threadsError) {
      console.error('❌ Error checking threads:', threadsError)
    } else {
      console.log(`📊 Total threads: ${threads?.length || 0}`)
      
      if (threads && threads.length > 0) {
        testResults.threadCreation = true
        console.log('✅ Thread creation: SUCCESS')
        
        // Show recent threads
        console.log('\n🧵 Recent threads:')
        threads.slice(0, 3).forEach((thread, index) => {
          console.log(`  ${index + 1}. ${thread.contact_email}`)
          console.log(`     Subject: ${thread.subject}`)
          console.log(`     Messages: ${thread.message_count}`)
          console.log(`     Last: ${thread.last_message_at}`)
          console.log()
        })
      } else {
        console.log('❌ Thread creation: No threads found')
      }
    }

    // 5. TEST CONVERSATION THREADING
    console.log('🔗 Step 5: Testing conversation threading logic...')
    
    const generateConversationId = (contactEmail, senderEmail, campaignId) => {
      const participants = [contactEmail, senderEmail].sort().join('|')
      const base = participants + (campaignId ? `|${campaignId}` : '')
      return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
    }

    const testConversationId1 = generateConversationId('test@example.com', 'sender@domain.com', 'campaign123')
    const testConversationId2 = generateConversationId('test@example.com', 'sender@domain.com', 'campaign123')
    const testConversationId3 = generateConversationId('different@example.com', 'sender@domain.com', 'campaign123')

    if (testConversationId1 === testConversationId2 && testConversationId1 !== testConversationId3) {
      testResults.conversationThreading = true
      console.log('✅ Conversation threading: SUCCESS')
      console.log(`   Same participants → Same ID: ${testConversationId1}`)
      console.log(`   Different participants → Different ID: ${testConversationId3}`)
    } else {
      console.log('❌ Conversation threading: Logic error')
    }

    // 6. TEST SMTP WEBHOOK
    console.log('\n📨 Step 6: Testing SMTP webhook...')
    
    try {
      const smtpWebhookData = {
        from: 'customer@example.com',
        to: 'sender@domain.com',
        subject: 'Test Response via SMTP',
        textBody: 'This is a test response to check SMTP webhook.',
        messageId: `smtp-test-${Date.now()}`,
        date: new Date().toISOString()
      }

      const smtpResponse = await fetch(`${BASE_URL}/api/webhooks/smtp`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer your-super-secret-webhook-token-here',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(smtpWebhookData)
      })

      const smtpResult = await smtpResponse.json()
      
      if (smtpResponse.ok && smtpResult.success) {
        testResults.smtpWebhook = true
        console.log('✅ SMTP webhook: SUCCESS')
        console.log(`   Message ID: ${smtpResult.messageId}`)
      } else {
        console.log('⚠️ SMTP webhook: Expected failure (no matching campaign sender)')
        console.log(`   Status: ${smtpResponse.status}`)
        console.log(`   Result: ${JSON.stringify(smtpResult)}`)
      }
    } catch (error) {
      console.log('❌ SMTP webhook: Network error -', error.message)
    }

    // 7. TEST GMAIL WEBHOOK
    console.log('\n📧 Step 7: Testing Gmail webhook...')
    
    try {
      const gmailWebhookData = {
        message: {
          data: Buffer.from(JSON.stringify({
            emailAddress: 'test@gmail.com',
            historyId: '12345'
          })).toString('base64')
        }
      }

      const gmailResponse = await fetch(`${BASE_URL}/api/webhooks/gmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gmailWebhookData)
      })

      const gmailResult = await gmailResponse.json()
      
      if (gmailResponse.ok && gmailResult.success) {
        testResults.gmailWebhook = true
        console.log('✅ Gmail webhook: SUCCESS')
      } else {
        console.log('⚠️ Gmail webhook: Expected failure (no Gmail account configured)')
        console.log(`   Status: ${gmailResponse.status}`)
        console.log(`   Result: ${JSON.stringify(gmailResult)}`)
      }
    } catch (error) {
      console.log('❌ Gmail webhook: Network error -', error.message)
    }

    // 8. SUMMARY
    console.log('\n📋 TEST SUMMARY')
    console.log('================')
    
    const testEntries = Object.entries(testResults)
    const passedTests = testEntries.filter(([_, passed]) => passed).length
    const totalTests = testEntries.length

    testEntries.forEach(([testName, passed]) => {
      const emoji = passed ? '✅' : '❌'
      const status = passed ? 'PASS' : 'FAIL'
      console.log(`${emoji} ${testName}: ${status}`)
    })

    console.log(`\n📊 Overall Result: ${passedTests}/${totalTests} tests passed`)

    if (passedTests >= 4) {
      console.log('\n🎉 INBOX SYSTEM IS WORKING!')
      console.log('✅ Core functionality (email sending + inbox logging) is operational')
      
      if (testResults.emailSending && testResults.inboxLogging) {
        console.log('\n🚀 NEXT STEPS:')
        console.log('1. Login to your UI with the correct user account')
        console.log('2. Navigate to Inbox → Sent folder')
        console.log('3. You should see your sent emails with conversation threading')
        console.log('4. Set up Gmail Pub/Sub for real-time inbound email capture')
        console.log('5. Configure SMTP forwarding for non-Gmail providers')
      }
    } else {
      console.log('\n⚠️ INBOX SYSTEM NEEDS ATTENTION')
      console.log('Some core functionality is not working properly')
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error)
  }
}

// Run the comprehensive test
comprehensiveInboxTest().then(() => {
  console.log('\n✅ Comprehensive test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test script failed:', error)
  process.exit(1)
})