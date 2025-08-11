#!/usr/bin/env node

/**
 * Test Webhook Setup
 * 
 * This script tests your webhook configuration and verifies it can capture emails.
 */

const { createClient } = require('@supabase/supabase-js')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function testWebhookSetup() {
  console.log('🧪 WEBHOOK SETUP TESTING')
  console.log('========================\n')

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    console.log('🔍 Step 1: Test Webhook Endpoints')
    console.log('=================================')
    
    // Test Gmail webhook endpoint
    console.log('\n📧 Testing Gmail webhook endpoint...')
    try {
      const gmailResponse = await fetch('http://localhost:3000/api/webhooks/gmail', {
        method: 'GET'
      })
      console.log(`Gmail webhook status: ${gmailResponse.status}`)
      
      if (gmailResponse.ok) {
        console.log('✅ Gmail webhook endpoint is accessible')
      } else {
        console.log('❌ Gmail webhook endpoint error')
      }
    } catch (error) {
      console.log(`❌ Gmail webhook error: ${error.message}`)
      console.log('💡 Make sure your dev server is running: npm run dev')
    }
    
    // Test SMTP webhook endpoint  
    console.log('\n📨 Testing SMTP webhook endpoint...')
    try {
      const smtpResponse = await fetch('http://localhost:3000/api/webhooks/smtp', {
        method: 'GET'
      })
      console.log(`SMTP webhook status: ${smtpResponse.status}`)
      
      if (smtpResponse.ok) {
        console.log('✅ SMTP webhook endpoint is accessible')
      } else {
        console.log('❌ SMTP webhook endpoint error')
      }
    } catch (error) {
      console.log(`❌ SMTP webhook error: ${error.message}`)
      console.log('💡 Make sure your dev server is running: npm run dev')
    }
    
    console.log('\n🔍 Step 2: Test Webhook Processing')
    console.log('==================================')
    
    // Test Gmail webhook with sample data
    console.log('\n📧 Testing Gmail webhook with sample push notification...')
    
    const gmailSampleData = {
      message: {
        data: Buffer.from(JSON.stringify({
          emailAddress: 'essabar.yassine@gmail.com',
          historyId: '12345'
        })).toString('base64'),
        messageId: 'test-message-id',
        publishTime: new Date().toISOString()
      }
    }
    
    try {
      const gmailTestResponse = await fetch('http://localhost:3000/api/webhooks/gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gmailSampleData)
      })
      
      console.log(`Gmail webhook processing: ${gmailTestResponse.status}`)
      const gmailResult = await gmailTestResponse.json()
      console.log('Gmail response:', gmailResult)
      
    } catch (error) {
      console.log(`Gmail webhook processing error: ${error.message}`)
    }
    
    // Test SMTP webhook with sample email
    console.log('\n📨 Testing SMTP webhook with sample email...')
    
    const smtpSampleData = {
      from: 'test-sender@example.com',
      to: 'essabar.yassine@gmail.com',
      subject: 'Webhook Test Email',
      textBody: 'This is a test email to verify webhook processing.',
      htmlBody: '<p>This is a <strong>test email</strong> to verify webhook processing.</p>',
      messageId: `test-${Date.now()}@example.com`,
      date: new Date().toISOString()
    }
    
    try {
      const smtpTestResponse = await fetch('http://localhost:3000/api/webhooks/smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-webhook-secret'
        },
        body: JSON.stringify(smtpSampleData)
      })
      
      console.log(`SMTP webhook processing: ${smtpTestResponse.status}`)
      const smtpResult = await smtpTestResponse.json()
      console.log('SMTP response:', smtpResult)
      
      if (smtpTestResponse.ok) {
        console.log('✅ SMTP webhook processed test email successfully')
        
        // Check if message appeared in database
        console.log('\n🔍 Checking database for test message...')
        
        const { data: testMessage } = await supabase
          .from('inbox_messages')
          .select('*')
          .eq('user_id', userId)
          .eq('subject', 'Webhook Test Email')
          .single()
        
        if (testMessage) {
          console.log('✅ Test email found in database!')
          console.log(`   Subject: "${testMessage.subject}"`)
          console.log(`   From: ${testMessage.contact_email}`)
          console.log(`   Status: ${testMessage.status}`)
          console.log(`   Created: ${new Date(testMessage.created_at).toLocaleString()}`)
        } else {
          console.log('❌ Test email not found in database')
          console.log('💡 Check webhook processing logic')
        }
        
      } else {
        console.log('❌ SMTP webhook failed to process test email')
      }
      
    } catch (error) {
      console.log(`SMTP webhook processing error: ${error.message}`)
    }
    
    console.log('\n🔍 Step 3: Environment Check')
    console.log('============================')
    
    const requiredEnvVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GMAIL_CLIENT_ID', 
      'SMTP_WEBHOOK_SECRET',
      'WEBHOOK_DOMAIN'
    ]
    
    console.log('Checking environment variables:')
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar]
      if (value) {
        console.log(`✅ ${envVar}: Set (${value.substring(0, 10)}...)`)
      } else {
        console.log(`❌ ${envVar}: Not set`)
      }
    })
    
    console.log('\n🔍 Step 4: Current Inbox State')
    console.log('==============================')
    
    // Show current messages to establish baseline
    const { data: currentMessages } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log(`Current inbox messages (latest ${currentMessages?.length || 0}):`)
    currentMessages?.forEach((msg, i) => {
      const direction = msg.direction === 'outbound' ? '📤' : '📥'
      const status = msg.status.toUpperCase()
      const time = new Date(msg.created_at).toLocaleTimeString()
      console.log(`   ${i + 1}. ${direction} ${status} "${msg.subject}" (${time})`)
    })
    
    console.log('\n🎯 Step 5: Real Email Test Instructions')
    console.log('=======================================')
    console.log('')
    console.log('Now test with real emails:')
    console.log('')
    console.log('1. 📧 Send an email to your configured webhook address')
    console.log('   - For Gmail forwarding: Send to your Gmail address')
    console.log('   - For SendGrid: Send to test@yourdomain.com')
    console.log('   - For Mailgun: Send to test@yourdomain.com')
    console.log('')
    console.log('2. ⏳ Wait 1-2 minutes for processing')
    console.log('')
    console.log('3. 🔍 Check for new messages:')
    console.log('   node scripts/monitor-real-response.js')
    console.log('')
    console.log('4. 📱 Refresh your LeadsUp inbox UI')
    console.log('')
    console.log('5. 🧵 Look for the new thread and test functionality')
    console.log('')
    
    console.log('🐛 Troubleshooting Guide')
    console.log('=======================')
    console.log('')
    console.log('If emails are not appearing:')
    console.log('')
    console.log('1. 🔍 Check webhook endpoint logs:')
    console.log('   - Look at your Next.js console for webhook requests')
    console.log('   - Check for any error messages')
    console.log('')
    console.log('2. 🔍 Verify DNS configuration:')
    console.log('   dig MX yourdomain.com')
    console.log('   dig A mail.yourdomain.com')
    console.log('')
    console.log('3. 🔍 Test email delivery:')
    console.log('   - Send from external email providers (Gmail, Outlook)')
    console.log('   - Check spam folders')
    console.log('   - Verify email forwarding rules')
    console.log('')
    console.log('4. 🔍 Check webhook processing:')
    console.log('   - Add console.log statements to webhook handlers')
    console.log('   - Verify authentication and parsing logic')
    console.log('')
    
    console.log('📊 Success Indicators')
    console.log('=====================')
    console.log('')
    console.log('✅ Webhook endpoints respond with 200 OK')
    console.log('✅ Test emails appear in database')
    console.log('✅ Badge counts update in UI')
    console.log('✅ Threads group properly by conversation')
    console.log('✅ Mark-as-read functionality works')
    console.log('')
    
  } catch (error) {
    console.error('❌ Webhook testing failed:', error)
  }
}

// Run the tests
testWebhookSetup().then(() => {
  console.log('✅ Webhook setup testing complete')
  console.log('')
  console.log('📧 Next: Send a real test email and run:')
  console.log('   node scripts/monitor-real-response.js')
  console.log('')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Testing failed:', error)
  process.exit(1)
})