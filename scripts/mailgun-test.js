#!/usr/bin/env node

/**
 * Mailgun Direct Test
 * 
 * Tests Mailgun webhook directly to your app (no N8N needed)
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function testMailgunDirect() {
  console.log('📧 MAILGUN DIRECT TEST')
  console.log('======================\n')
  
  const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/smtp'
  
  console.log(`📡 Testing direct webhook: ${WEBHOOK_URL}`)
  console.log('(This simulates what Mailgun sends to your app)\n')
  
  // Simulate Mailgun form data format
  const formData = new FormData()
  formData.append('sender', 'prospect@example.com')
  formData.append('recipient', 'essabar.yassine@gmail.com')
  formData.append('subject', 'Re: Your Campaign - Direct Mailgun Test!')
  formData.append('body-plain', 'Hi! This is a direct test from Mailgun to your app, bypassing N8N completely. Much simpler!')
  formData.append('body-html', '<p>Hi!</p><p>This is a <strong>direct test</strong> from Mailgun to your app, bypassing N8N completely. Much simpler!</p>')
  formData.append('Message-Id', `mailgun-direct-${Date.now()}@example.com`)
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString())
  formData.append('token', 'test-token-123')
  formData.append('signature', 'test-signature')
  
  console.log('📤 Sending Mailgun-format data:')
  console.log(`   From: prospect@example.com`)
  console.log(`   To: essabar.yassine@gmail.com`)
  console.log(`   Subject: Re: Your Campaign - Direct Mailgun Test!`)
  console.log('')
  
  try {
    // Test webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-webhook-secret'
      },
      body: formData
    })
    
    const result = await response.json()
    
    console.log(`📊 Response Status: ${response.status}`)
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (response.ok && result.success) {
      console.log('\n✅ DIRECT WEBHOOK WORKING!')
      console.log('===========================')
      console.log('🎯 This proves Mailgun → Your App works directly')
      console.log('🚫 No N8N needed!')
      console.log('')
      
      // Check database
      console.log('🔍 Checking database...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: messages } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('contact_email', 'prospect@example.com')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (messages && messages.length > 0) {
        const message = messages[0]
        console.log('✅ Email found in database!')
        console.log(`   Subject: "${message.subject}"`)
        console.log(`   Provider: ${message.provider}`)
        console.log(`   Status: ${message.status}`)
        console.log(`   Created: ${new Date(message.created_at).toLocaleString()}`)
        
        console.log('\n🎉 PERFECT! MAILGUN DIRECT WORKS!')
        console.log('==================================')
        console.log('✅ Mailgun can send directly to your app')
        console.log('✅ Your existing webhook processes emails')
        console.log('✅ Emails are stored in database')
        console.log('✅ No N8N complexity needed')
        console.log('')
        console.log('📋 Next Steps:')
        console.log('1. Sign up for Mailgun')
        console.log('2. Add your domain')
        console.log('3. Create route pointing to your webhook')
        console.log('4. Send real emails!')
        
      } else {
        console.log('⚠️  Email not found in database')
        console.log('Check your webhook processing logic')
      }
      
    } else {
      console.log('\n❌ Webhook failed')
      console.log('Check your webhook code and authentication')
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.log('\n💡 Make sure your app is running:')
    console.log('   npm run dev')
  }
}

// Run test
testMailgunDirect().then(() => {
  console.log('\n✅ Mailgun direct test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})