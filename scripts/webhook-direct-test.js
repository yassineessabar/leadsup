#!/usr/bin/env node

/**
 * Direct Webhook Test
 * 
 * Simple test to verify webhook is working with minimal data
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testWebhook() {
  console.log('🧪 DIRECT WEBHOOK TEST')
  console.log('======================\n')
  
  const webhookData = {
    from: 'prospect@example.com',
    to: 'essabar.yassine@gmail.com',  // Known campaign sender
    subject: 'Re: Your Campaign Email',
    textBody: 'Thanks for your email! I am interested in learning more.',
    messageId: `test-${Date.now()}@example.com`,
    date: new Date().toISOString(),
    threadId: `thread-${Date.now()}`
  }
  
  console.log('📤 Testing webhook endpoint...')
  console.log(`From: ${webhookData.from}`)
  console.log(`To: ${webhookData.to}`)
  console.log(`Subject: ${webhookData.subject}`)
  console.log()
  
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/smtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-webhook-secret'
      },
      body: JSON.stringify(webhookData)
    })
    
    const result = await response.json()
    
    console.log(`Status: ${response.status}`)
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (response.ok && result.success) {
      console.log('\n✅ SUCCESS! Webhook processed the email')
      console.log(`Message ID: ${result.messageId}`)
      console.log(`Conversation ID: ${result.conversationId}`)
      console.log(`Direction: ${result.direction}`)
      console.log('\n🎉 WEBHOOK IS WORKING!')
      console.log('Check your LeadsUp inbox to see the new message')
    } else {
      console.log('\n❌ FAILED')
      console.log('The webhook returned an error')
    }
    
  } catch (error) {
    console.log('\n❌ ERROR')
    console.log('Failed to connect to webhook:', error.message)
    console.log('\nMake sure your dev server is running: npm run dev')
  }
}

testWebhook()