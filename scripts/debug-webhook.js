#!/usr/bin/env node

/**
 * Debug Webhook
 * 
 * This script tests the webhook step by step to identify issues
 */

const { createClient } = require('@supabase/supabase-js')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function debugWebhook() {
  console.log('🔧 WEBHOOK DEBUG')
  console.log('================\n')
  
  const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
  
  console.log('🔍 Step 1: Check campaign senders...')
  const { data: senders } = await supabase
    .from('campaign_senders')
    .select('*')
    .eq('user_id', userId)
  
  console.log(`Found ${senders?.length || 0} campaign senders:`)
  senders?.forEach(s => {
    console.log(`  - ${s.email} (Campaign: ${s.campaign_id})`)
  })
  
  console.log('\n🔍 Step 2: Check contacts...')
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .limit(5)
  
  console.log(`Found ${contacts?.length || 0} contacts:`)
  contacts?.forEach(c => {
    console.log(`  - ${c.email} (ID: ${c.id})`)
  })
  
  console.log('\n🔍 Step 3: Test simple webhook data...')
  
  const webhookData = {
    from: 'webhook-tester@example.com',  // Existing contact
    to: 'essabar.yassine@gmail.com',    // Existing campaign sender
    subject: 'Test Email',
    textBody: 'This is a test',
    messageId: `test-${Date.now()}@example.com`
  }
  
  console.log('Testing with minimal data:')
  console.log(JSON.stringify(webhookData, null, 2))
  
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/smtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-webhook-secret'
      },
      body: JSON.stringify(webhookData)
    })
    
    const result = await response.text()
    
    console.log(`\nResponse status: ${response.status}`)
    console.log('Response body:', result)
    
    if (response.status === 500) {
      console.log('\n❌ Internal server error - check Next.js console logs')
      console.log('The webhook code may be throwing an exception')
    } else if (response.status === 404) {
      console.log('\n❌ 404 - Email matching failed')
      console.log('Check campaign_senders and contacts tables')
    } else if (response.ok) {
      console.log('\n✅ Webhook successful!')
      
      // Check if message was created
      const { data: message } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('message_id', webhookData.messageId)
        .single()
      
      if (message) {
        console.log('✅ Message stored in database')
        console.log(`Subject: "${message.subject}"`)
        console.log(`Status: ${message.status}`)
        console.log(`Provider: ${message.provider}`)
      } else {
        console.log('❌ Message not found in database')
      }
    }
    
  } catch (error) {
    console.log(`\n❌ Request failed: ${error.message}`)
    console.log('Make sure your Next.js dev server is running (npm run dev)')
  }
}

debugWebhook().catch(console.error)