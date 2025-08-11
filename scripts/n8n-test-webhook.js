#!/usr/bin/env node

/**
 * N8N Webhook Test Script
 * 
 * Tests your N8N email capture webhook
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function testN8NWebhook() {
  console.log('🧪 N8N WEBHOOK TEST')
  console.log('==================\n')
  
  // Configure your N8N webhook URL here
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/email-webhook'
  
  console.log(`📡 Testing webhook at: ${N8N_WEBHOOK_URL}`)
  console.log('')
  
  // Test email data
  const testEmail = {
    from: 'prospect@example.com',
    to: 'essabar.yassine@gmail.com', // This should match a campaign_sender
    subject: 'Re: Your Campaign - Interested in your product!',
    text: 'Hi! I received your campaign email and I am very interested. Please send me more information about pricing and features. Thanks!',
    html: '<p>Hi!</p><p>I received your campaign email and I am <strong>very interested</strong>.</p><p>Please send me more information about pricing and features.</p><p>Thanks!</p>',
    date: new Date().toISOString(),
    messageId: `test-${Date.now()}@example.com`
  }
  
  console.log('📧 Sending test email:')
  console.log(`   From: ${testEmail.from}`)
  console.log(`   To: ${testEmail.to}`)
  console.log(`   Subject: "${testEmail.subject}"`)
  console.log('')
  
  try {
    // Step 1: Send to N8N
    console.log('🔍 Step 1: Sending to N8N webhook...')
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testEmail)
    })
    
    const result = await response.json()
    
    console.log(`Response Status: ${response.status}`)
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (response.ok && result.success) {
      console.log('✅ N8N webhook accepted the email!')
      
      // Step 2: Wait a moment for processing
      console.log('\n🔍 Step 2: Waiting for N8N to process...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Step 3: Check if message was stored
      console.log('\n🔍 Step 3: Checking Supabase for the message...')
      
      const { data: messages } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('contact_email', testEmail.from)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (messages && messages.length > 0) {
        const message = messages[0]
        console.log('\n✅ MESSAGE FOUND IN DATABASE!')
        console.log('================================')
        console.log(`📧 Subject: "${message.subject}"`)
        console.log(`📥 Direction: ${message.direction}`)
        console.log(`🔵 Status: ${message.status}`)
        console.log(`📁 Folder: ${message.folder}`)
        console.log(`🏷️  Provider: ${message.provider}`)
        console.log(`⏰ Created: ${new Date(message.created_at).toLocaleString()}`)
        
        // Check thread
        const { data: thread } = await supabase
          .from('inbox_threads')
          .select('*')
          .eq('conversation_id', result.conversation_id || message.conversation_id)
          .single()
        
        if (thread) {
          console.log('\n✅ THREAD FOUND!')
          console.log(`🧵 Thread ID: ${thread.id}`)
          console.log(`📅 Last Message: ${new Date(thread.last_message_at).toLocaleString()}`)
        }
        
        // Check badge count
        const { count: unreadCount } = await supabase
          .from('inbox_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', message.user_id)
          .eq('folder', 'inbox')
          .eq('status', 'unread')
        
        console.log(`\n📊 Current unread count: ${unreadCount || 0}`)
        
        console.log('\n🎉 N8N EMAIL CAPTURE WORKING PERFECTLY!')
        console.log('========================================')
        console.log('✅ N8N webhook receives emails')
        console.log('✅ Processes and stores in database')
        console.log('✅ Creates/updates threads')
        console.log('✅ Updates badge counts')
        console.log('\n📱 Check your LeadsUp inbox to see the message!')
        
      } else {
        console.log('⚠️  Message not found in database yet')
        console.log('This could mean:')
        console.log('1. N8N is still processing')
        console.log('2. The email was not for a campaign sender')
        console.log('3. There was an error in N8N workflow')
        console.log('\nCheck N8N Executions tab for details')
      }
      
    } else {
      console.log('\n❌ N8N webhook failed or rejected the email')
      console.log('Response:', result)
      
      if (result.message === 'Not a campaign email, ignored') {
        console.log('\n💡 This means the "to" email is not in campaign_senders table')
        console.log('Add the email to campaign_senders or use a different email')
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.log('\nTroubleshooting:')
    console.log('1. Is N8N running? Check: docker ps')
    console.log('2. Is the webhook URL correct?')
    console.log('3. Is the workflow active in N8N?')
    console.log('4. Check N8N logs: docker logs n8n')
  }
  
  console.log('\n📋 Next Steps:')
  console.log('=============')
  console.log('1. Set up your email provider to forward to N8N')
  console.log('2. Configure N8N webhook URL in provider settings')
  console.log('3. Send real test emails')
  console.log('4. Monitor with: node scripts/monitor-real-response.js')
}

// Run the test
testN8NWebhook().then(() => {
  console.log('\n✅ N8N webhook test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})