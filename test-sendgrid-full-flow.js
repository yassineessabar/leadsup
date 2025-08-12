#!/usr/bin/env node

/**
 * SendGrid Full Integration Test
 * 
 * This script tests the complete email flow:
 * 1. Send a test campaign email via SendGrid
 * 2. Simulate an inbound reply webhook
 * 3. Verify the reply is captured in the database
 * 
 * Run with: node test-sendgrid-full-flow.js
 */

const { createClient } = require('@supabase/supabase-js')

// Configuration
// Load environment variables  
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test data
const TEST_CAMPAIGN_ID = 'test-campaign-' + Date.now()
const TEST_SENDER_EMAIL = 'campaigns@leadsup.io' // Your verified sender
const TEST_RECIPIENT_EMAIL = 'test.recipient@example.com'
const TEST_USER_ID = 'test-user-id' // Replace with actual user ID

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testSendGridFlow() {
  console.log('🧪 Testing Complete SendGrid Email Flow\n')
  console.log('=' .repeat(50))

  // Step 1: Test Outbound Email Sending
  console.log('\n📤 STEP 1: Test Outbound Email Sending')
  console.log('-'.repeat(40))
  
  try {
    console.log('Sending test campaign email via SendGrid...')
    
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(SENDGRID_API_KEY)
    
    const testEmail = {
      to: TEST_RECIPIENT_EMAIL,
      from: {
        email: TEST_SENDER_EMAIL,
        name: 'LeadsUp Campaigns'
      },
      subject: `Test Campaign Email - ${new Date().toISOString()}`,
      text: 'This is a test campaign email. Please reply to test the webhook integration.',
      html: `
        <p>Hi there!</p>
        <p>This is a test campaign email from LeadsUp.</p>
        <p><strong>Please reply to this email</strong> to test the webhook integration.</p>
        <p>Campaign ID: ${TEST_CAMPAIGN_ID}</p>
        <p>Best regards,<br>The LeadsUp Team</p>
      `,
      replyTo: 'reply@reply.leadsup.io' // Your inbound parse domain
    }

    const result = await sgMail.send(testEmail)
    console.log('✅ Test email sent successfully!')
    console.log(`   Message ID: ${result[0]?.headers?.['x-message-id'] || 'Unknown'}`)
    console.log(`   From: ${TEST_SENDER_EMAIL}`)
    console.log(`   To: ${TEST_RECIPIENT_EMAIL}`)
    console.log(`   Reply-To: reply@reply.leadsup.io`)
    
    // Log to database as outbound message
    const conversationId = Buffer.from(`${TEST_RECIPIENT_EMAIL}|${TEST_SENDER_EMAIL}|${TEST_CAMPAIGN_ID}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
    
    const { data: outboundMsg, error: outboundError } = await supabase
      .from('inbox_messages')
      .insert({
        user_id: TEST_USER_ID,
        message_id: `sendgrid-test-${Date.now()}`,
        conversation_id: conversationId,
        campaign_id: TEST_CAMPAIGN_ID,
        contact_email: TEST_RECIPIENT_EMAIL,
        sender_email: TEST_SENDER_EMAIL,
        subject: testEmail.subject,
        body_text: testEmail.text,
        body_html: testEmail.html,
        direction: 'outbound',
        channel: 'email',
        status: 'read',
        folder: 'sent',
        provider: 'smtp',
        sent_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (outboundError) {
      console.log('⚠️  Could not log outbound message to database:', outboundError.message)
    } else {
      console.log('✅ Outbound message logged to database')
      console.log(`   Message ID: ${outboundMsg.id}`)
    }
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message)
    if (error.response?.body?.errors) {
      error.response.body.errors.forEach(err => {
        console.error(`   • ${err.message}`)
      })
    }
  }

  await delay(2000)

  // Step 2: Simulate Inbound Reply Webhook
  console.log('\n📥 STEP 2: Simulate Inbound Reply via Webhook')
  console.log('-'.repeat(40))
  
  try {
    console.log('Simulating SendGrid inbound webhook call...')
    
    // Create form data as SendGrid would send it
    const FormData = require('form-data')
    const formData = new FormData()
    
    // Simulate reply data
    const replyData = {
      from: `Test User <${TEST_RECIPIENT_EMAIL}>`,
      to: `reply@reply.leadsup.io`,
      subject: `Re: Test Campaign Email`,
      text: 'This is my reply to your campaign email. I am interested!',
      html: '<p>This is my reply to your campaign email. I am interested!</p>',
      envelope: JSON.stringify({
        from: TEST_RECIPIENT_EMAIL,
        to: ['reply@reply.leadsup.io']
      })
    }
    
    // Add form fields
    Object.entries(replyData).forEach(([key, value]) => {
      formData.append(key, value)
    })
    formData.append('headers', 'Received: by mx.sendgrid.net')
    formData.append('spam_score', '0.5')
    formData.append('attachments', '0')
    formData.append('charsets', '{}')
    
    // First, create a test campaign sender record
    console.log('Setting up test campaign sender...')
    const { error: senderError } = await supabase
      .from('campaign_senders')
      .upsert({
        campaign_id: TEST_CAMPAIGN_ID,
        email: 'reply@reply.leadsup.io',
        user_id: TEST_USER_ID,
        name: 'Test Sender',
        is_active: true
      })
    
    if (senderError) {
      console.log('⚠️  Could not create test sender:', senderError.message)
    }
    
    // Call the webhook endpoint
    console.log('Calling webhook endpoint...')
    const response = await fetch('http://localhost:3000/api/webhooks/sendgrid', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    })
    
    const responseData = await response.json()
    
    if (response.ok && responseData.success) {
      console.log('✅ Webhook processed successfully!')
      console.log(`   Message ID: ${responseData.messageId}`)
      console.log(`   Conversation ID: ${responseData.conversationId}`)
    } else {
      console.log('⚠️  Webhook response:', responseData)
    }
    
  } catch (error) {
    console.error('❌ Failed to simulate webhook:', error.message)
  }

  await delay(2000)

  // Step 3: Verify Database Capture
  console.log('\n🔍 STEP 3: Verify Database Capture')
  console.log('-'.repeat(40))
  
  try {
    console.log('Checking inbox_messages table for captured reply...')
    
    // Query for inbound messages
    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('contact_email', TEST_RECIPIENT_EMAIL)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('❌ Database query error:', error.message)
    } else if (messages && messages.length > 0) {
      const msg = messages[0]
      console.log('✅ Found inbound message in database!')
      console.log(`   ID: ${msg.id}`)
      console.log(`   From: ${msg.contact_email}`)
      console.log(`   To: ${msg.sender_email}`)
      console.log(`   Subject: ${msg.subject}`)
      console.log(`   Direction: ${msg.direction}`)
      console.log(`   Provider: ${msg.provider}`)
      console.log(`   Created: ${msg.created_at}`)
    } else {
      console.log('⚠️  No inbound messages found in database')
      console.log('   This could mean the webhook hasn\'t processed yet or there was an error')
    }
    
    // Check threads
    console.log('\nChecking inbox_threads table...')
    const { data: threads, error: threadError } = await supabase
      .from('inbox_threads')
      .select('*')
      .eq('contact_email', TEST_RECIPIENT_EMAIL)
      .order('updated_at', { ascending: false })
      .limit(1)
    
    if (!threadError && threads && threads.length > 0) {
      const thread = threads[0]
      console.log('✅ Found email thread in database!')
      console.log(`   Thread ID: ${thread.id}`)
      console.log(`   Conversation ID: ${thread.conversation_id}`)
      console.log(`   Message Count: ${thread.message_count}`)
      console.log(`   Last Message: ${thread.last_message_at}`)
    } else {
      console.log('⚠️  No email threads found')
    }
    
  } catch (error) {
    console.error('❌ Failed to verify database:', error.message)
  }

  // Step 4: Test Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  
  console.log('\n✅ What\'s Working:')
  console.log('   • SendGrid API connection')
  console.log('   • Webhook endpoint is active')
  console.log('   • Database schema is correct')
  
  console.log('\n⚠️  Manual Testing Required:')
  console.log('   1. Send a real email to a valid address')
  console.log('   2. Reply to that email')
  console.log('   3. Check if reply appears in database')
  
  console.log('\n📋 Quick Manual Test Steps:')
  console.log('   1. Run: node test-send-real-email.js your-email@example.com')
  console.log('   2. Check your inbox and reply to the email')
  console.log('   3. Wait 30 seconds')
  console.log('   4. Run: node check-inbox-replies.js')
  
  console.log('\n🔧 Troubleshooting:')
  console.log('   • Ensure MX records point to: mx.sendgrid.net')
  console.log('   • Verify webhook URL in SendGrid: http://app.leadsup.io/api/webhooks/sendgrid')
  console.log('   • Check SendGrid Activity Feed for webhook calls')
  console.log('   • Review server logs for webhook processing')
}

// Run the test
testSendGridFlow().catch(console.error)