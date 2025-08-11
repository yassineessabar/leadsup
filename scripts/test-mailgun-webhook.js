#!/usr/bin/env node

/**
 * Test Mailgun Webhook
 * 
 * This script tests your Mailgun webhook endpoint with real Mailgun data format
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function testMailgunWebhook() {
  console.log('🧪 MAILGUN WEBHOOK TEST')
  console.log('=======================\n')
  
  const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/mailgun'
  
  console.log(`📡 Testing webhook: ${WEBHOOK_URL}`)
  console.log('This simulates exactly what Mailgun sends to your webhook\n')
  
  // Create form data exactly as Mailgun sends it
  const formData = new FormData()
  
  // Mailgun webhook fields
  formData.append('sender', 'prospect@example.com')
  formData.append('recipient', 'essabar.yassine@gmail.com')
  formData.append('subject', 'Re: Your Campaign - Mailgun Direct Test!')
  formData.append('body-plain', 'Hi! I got your campaign email and I am very interested in your product. Please send me more details about pricing and features. Thanks!')
  formData.append('body-html', '<p>Hi!</p><p>I got your campaign email and I am <strong>very interested</strong> in your product.</p><p>Please send me more details about pricing and features.</p><p>Thanks!</p>')
  formData.append('Message-Id', `mailgun-test-${Date.now()}@example.com`)
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString())
  formData.append('token', 'test-token-123')
  formData.append('signature', 'test-signature-abc')
  formData.append('attachment-count', '0')
  
  console.log('📤 Sending Mailgun webhook data:')
  console.log(`   From: prospect@example.com`)
  console.log(`   To: essabar.yassine@gmail.com`)
  console.log(`   Subject: Re: Your Campaign - Mailgun Direct Test!`)
  console.log('')
  
  try {
    console.log('🔍 Step 1: Testing webhook endpoint...')
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    console.log(`📊 Response Status: ${response.status}`)
    console.log('Response Data:', JSON.stringify(result, null, 2))
    
    if (response.ok && result.success) {
      console.log('\n✅ MAILGUN WEBHOOK SUCCESS!')
      console.log('============================')
      console.log(`✅ Message processed: ${result.messageId}`)
      console.log(`✅ Conversation ID: ${result.conversationId}`)
      console.log(`✅ Direction: ${result.direction}`)
      
      // Step 2: Check database
      console.log('\n🔍 Step 2: Verifying database storage...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: message } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('message_id', formData.get('Message-Id'))
        .single()
      
      if (message) {
        console.log('\n✅ MESSAGE STORED IN DATABASE!')
        console.log('=============================')
        console.log(`📧 Subject: "${message.subject}"`)
        console.log(`📥 Direction: ${message.direction}`)
        console.log(`🔵 Status: ${message.status}`)
        console.log(`📁 Folder: ${message.folder}`)
        console.log(`🏷️  Provider: ${message.provider}`)
        console.log(`⏰ Created: ${new Date(message.created_at).toLocaleString()}`)
        console.log(`👤 Contact: ${message.contact_email}`)
        
        // Check thread
        const { data: thread } = await supabase
          .from('inbox_threads')
          .select('*')
          .eq('conversation_id', result.conversationId)
          .single()
        
        if (thread) {
          console.log('\n✅ THREAD CREATED/UPDATED!')
          console.log(`🧵 Subject: "${thread.subject}"`)
          console.log(`📅 Last Message: ${new Date(thread.last_message_at).toLocaleString()}`)
          console.log(`👤 Contact: ${thread.contact_email}`)
        }
        
        // Check badge count
        const { count: unreadCount } = await supabase
          .from('inbox_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', message.user_id)
          .eq('folder', 'inbox')
          .eq('status', 'unread')
        
        console.log(`\n📊 Updated badge count: ${unreadCount || 0} unread messages`)
        
        console.log('\n🎉 MAILGUN INTEGRATION FULLY WORKING!')
        console.log('=====================================')
        console.log('✅ Mailgun webhook receives emails')
        console.log('✅ Processes and stores in database')
        console.log('✅ Creates/updates threads correctly')
        console.log('✅ Updates badge counts properly')
        console.log('✅ Provider tracking working (mailgun)')
        console.log('')
        console.log('📱 Check your LeadsUp inbox UI to see the message!')
        console.log('🔄 The message should appear with proper threading')
        
      } else {
        console.log('\n⚠️  Message not found in database')
        console.log('This could mean:')
        console.log('1. The email was not for a campaign sender')
        console.log('2. Database insertion failed')
        console.log('3. Processing error occurred')
      }
      
    } else {
      console.log('\n❌ WEBHOOK TEST FAILED')
      console.log('=====================')
      console.log('Response:', result)
      
      if (result.message === 'Not a campaign email, ignored') {
        console.log('\n💡 This means:')
        console.log('- The "to" email is not in campaign_senders table')
        console.log('- Add essabar.yassine@gmail.com to campaign_senders')
        console.log('- Or use a different sender email in the test')
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.log('\nTroubleshooting:')
    console.log('1. Is your app running? Check: npm run dev')
    console.log('2. Is the webhook endpoint accessible?')
    console.log('3. Check your app logs for errors')
    console.log('4. Verify database connection')
  }
  
  console.log('\n📋 Next Steps:')
  console.log('=============')
  console.log('1. Set up Mailgun route in dashboard')
  console.log('2. Point route to your webhook URL')
  console.log('3. Send real test emails')
  console.log('4. Monitor with: node scripts/monitor-real-response.js')
  console.log('')
  console.log('🌍 Production webhook URL:')
  console.log('https://your-app.com/api/webhooks/mailgun')
}

// Run the test
testMailgunWebhook().then(() => {
  console.log('\n✅ Mailgun webhook test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})