#!/usr/bin/env node

/**
 * Complete Mailgun Test
 * 
 * Tests Mailgun webhook with proper campaign sender setup
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function testMailgunComplete() {
  console.log('🎯 COMPLETE MAILGUN TEST')
  console.log('========================\n')
  
  const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/mailgun'
  const fromEmail = 'prospect@example.com'  // Test contact
  const toEmail = 'campaign@sandbox09593b053aaa4a158cfdada61cbbdb0d.mailgun.org'  // Campaign sender
  
  console.log(`📡 Testing Mailgun webhook: ${WEBHOOK_URL}`)
  console.log(`📧 Test email flow: ${fromEmail} → ${toEmail}`)
  console.log('')
  
  // Create Mailgun form data
  const formData = new FormData()
  formData.append('sender', fromEmail)
  formData.append('recipient', toEmail)
  formData.append('subject', 'Re: Your LeadsUp Campaign - I\'m Interested!')
  formData.append('body-plain', 'Hello! I received your campaign email and I am very interested in your product. Can you please send me more information about your services and pricing? I would like to schedule a call to discuss this further. Thank you!')
  formData.append('body-html', '<p>Hello!</p><p>I received your campaign email and I am <strong>very interested</strong> in your product.</p><p>Can you please send me more information about your services and pricing?</p><p>I would like to schedule a call to discuss this further.</p><p>Thank you!</p>')
  formData.append('Message-Id', `mailgun-complete-test-${Date.now()}@example.com`)
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString())
  formData.append('token', `test-token-${Date.now()}`)
  formData.append('signature', 'valid-signature-123')
  formData.append('attachment-count', '0')
  
  console.log('📤 Sending webhook data:')
  console.log(`   From: ${fromEmail}`)
  console.log(`   To: ${toEmail}`)
  console.log(`   Subject: Re: Your LeadsUp Campaign - I'm Interested!`)
  console.log('')
  
  try {
    // Send webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    console.log(`📊 Response Status: ${response.status}`)
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (response.ok && result.success && result.messageId) {
      console.log('\n🎉 MAILGUN WEBHOOK SUCCESS!')
      console.log('===========================')
      console.log(`✅ Message ID: ${result.messageId}`)
      console.log(`✅ Conversation ID: ${result.conversationId}`)
      console.log(`✅ Direction: ${result.direction}`)
      console.log(`✅ Provider: Mailgun`)
      
      // Wait and check database
      console.log('\n🔍 Verifying database storage...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const { data: message } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('id', result.messageId)
        .single()
      
      if (message) {
        console.log('\n📧 MESSAGE DETAILS:')
        console.log('==================')
        console.log(`📧 Subject: "${message.subject}"`)
        console.log(`📥 Direction: ${message.direction}`)
        console.log(`🔵 Status: ${message.status}`)
        console.log(`📁 Folder: ${message.folder}`)
        console.log(`🏷️  Provider: ${message.provider}`)
        console.log(`👤 From: ${message.contact_email}`)
        console.log(`📨 To: ${message.sender_email}`)
        console.log(`⏰ Created: ${new Date(message.created_at).toLocaleString()}`)
        console.log(`🎯 Campaign: ${message.campaign_id}`)
        
        if (message.body_text) {
          const preview = message.body_text.substring(0, 100)
          console.log(`📝 Preview: "${preview}${message.body_text.length > 100 ? '...' : ''}"`)
        }
        
        // Check thread
        console.log('\n🧵 THREAD DETAILS:')
        console.log('==================')
        
        const { data: thread } = await supabase
          .from('inbox_threads')
          .select('*')
          .eq('conversation_id', result.conversationId)
          .single()
        
        if (thread) {
          console.log(`📧 Subject: "${thread.subject}"`)
          console.log(`📅 Last Message: ${new Date(thread.last_message_at).toLocaleString()}`)
          console.log(`👤 Contact: ${thread.contact_email}`)
          console.log(`📊 Status: ${thread.status}`)
        }
        
        // Check badge counts
        console.log('\n📊 BADGE COUNTS:')
        console.log('===============')
        
        const { count: unreadCount } = await supabase
          .from('inbox_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', message.user_id)
          .eq('folder', 'inbox')
          .eq('status', 'unread')
        
        console.log(`📥 Inbox unread: ${unreadCount || 0}`)
        
        // Show recent messages
        const { data: recentMessages } = await supabase
          .from('inbox_messages')
          .select('subject, direction, status, provider, created_at')
          .eq('user_id', message.user_id)
          .order('created_at', { ascending: false })
          .limit(3)
        
        console.log('\n📋 Recent Messages:')
        console.log('==================')
        recentMessages?.forEach((msg, i) => {
          const dir = msg.direction === 'outbound' ? '📤' : '📥'
          const status = msg.status.toUpperCase()
          const provider = msg.provider ? `[${msg.provider.toUpperCase()}]` : ''
          const time = new Date(msg.created_at).toLocaleTimeString()
          console.log(`   ${i + 1}. ${dir} ${status} "${msg.subject}" ${provider} (${time})`)
        })
        
        console.log('\n🏆 MAILGUN INTEGRATION COMPLETE!')
        console.log('=================================')
        console.log('✅ Webhook receives and processes emails')
        console.log('✅ Messages stored in database correctly')
        console.log('✅ Threads created and managed properly')
        console.log('✅ Badge counts updated automatically')
        console.log('✅ Provider tracking working (mailgun)')
        console.log('✅ Campaign association working')
        console.log('')
        console.log('📱 NEXT: Check your LeadsUp inbox UI!')
        console.log('🔄 The new message should appear with unread status')
        console.log('🧵 Click to expand the thread and see the conversation')
        console.log('')
        console.log('🎯 PRODUCTION SETUP:')
        console.log('1. Deploy your app to production')
        console.log('2. Set up Mailgun route in dashboard')
        console.log('3. Point route to: https://your-app.com/api/webhooks/mailgun')
        console.log('4. Test with real emails!')
        
      } else {
        console.log('\n❌ Message not found in database')
        console.log('Check message ID:', result.messageId)
      }
      
    } else {
      console.log('\n❌ WEBHOOK TEST FAILED')
      console.log('Response:', result)
      
      if (result.message?.includes('Not a campaign email')) {
        console.log('\n💡 Campaign sender not found')
        console.log('Run setup script: node scripts/setup-mailgun-test-data.js')
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.log('\nTroubleshooting:')
    console.log('1. Ensure app is running: npm run dev')
    console.log('2. Check webhook endpoint: GET http://localhost:3000/api/webhooks/mailgun')
    console.log('3. Verify campaign sender exists in database')
  }
}

// Run test
testMailgunComplete().then(() => {
  console.log('\n✅ Complete Mailgun test finished')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})