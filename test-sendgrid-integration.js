#!/usr/bin/env node

/**
 * SendGrid Integration Test Script
 * 
 * This script tests:
 * 1. SendGrid API configuration
 * 2. Email sending functionality
 * 3. Webhook endpoint availability
 * 
 * Run with: node test-sendgrid-integration.js
 */

const sgMail = require('@sendgrid/mail')

// SendGrid API Key from environment or hardcoded
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

async function testSendGridIntegration() {
  console.log('🧪 Testing SendGrid Integration...\n')

  // Test 1: API Key Configuration
  console.log('1️⃣ Testing SendGrid API Key Configuration...')
  try {
    sgMail.setApiKey(SENDGRID_API_KEY)
    console.log('✅ SendGrid API key configured successfully')
  } catch (error) {
    console.error('❌ Failed to configure SendGrid API key:', error.message)
    return
  }

  // Test 2: Test Email Send
  console.log('\n2️⃣ Testing SendGrid Email Send...')
  try {
    const testEmail = {
      to: 'test@example.com', // This won't actually send since it's a test domain
      from: {
        email: 'noreply@reply.leadsup.io',
        name: 'LeadsUp Test'
      },
      subject: 'SendGrid Integration Test',
      text: 'This is a test email from SendGrid integration.',
      html: '<p>This is a test email from <strong>SendGrid integration</strong>.</p>',
      replyTo: 'noreply@reply.leadsup.io'
    }

    console.log('📧 Attempting to send test email...')
    console.log(`   To: ${testEmail.to}`)
    console.log(`   From: ${testEmail.from.email} (${testEmail.from.name})`)
    console.log(`   Subject: ${testEmail.subject}`)

    const result = await sgMail.send(testEmail)
    console.log('✅ Test email sent successfully!')
    console.log(`   Message ID: ${result[0]?.headers?.['x-message-id'] || 'Unknown'}`)
    console.log(`   Status Code: ${result[0]?.statusCode}`)
  } catch (error) {
    console.error('❌ Failed to send test email:')
    if (error.response?.body?.errors) {
      error.response.body.errors.forEach(err => {
        console.error(`   • ${err.message}`)
        if (err.field) console.error(`     Field: ${err.field}`)
        if (err.help) console.error(`     Help: ${err.help}`)
      })
    } else {
      console.error(`   ${error.message}`)
    }
  }

  // Test 3: Webhook Endpoint
  console.log('\n3️⃣ Testing SendGrid Webhook Endpoint...')
  try {
    const webhookUrl = 'http://app.leadsup.io/api/webhooks/sendgrid'
    console.log(`📡 Testing webhook endpoint: ${webhookUrl}`)
    
    const response = await fetch(webhookUrl, {
      method: 'GET'
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Webhook endpoint is accessible')
      console.log(`   Status: ${data.status}`)
      console.log(`   Provider: ${data.provider}`)
      console.log(`   Documentation: ${data.documentation}`)
    } else {
      console.log(`⚠️ Webhook endpoint returned status: ${response.status}`)
    }
  } catch (error) {
    console.error('❌ Failed to test webhook endpoint:', error.message)
  }

  // Test 4: Configuration Summary
  console.log('\n4️⃣ Configuration Summary:')
  console.log('✅ SendGrid Integration Status:')
  console.log(`   • API Key: ${SENDGRID_API_KEY.substring(0, 10)}...`)
  console.log('   • Inbound Parse Domain: reply.leadsup.io')
  console.log('   • Webhook URL: http://app.leadsup.io/api/webhooks/sendgrid')
  console.log('   • Method: POST (multipart/form-data)')
  
  console.log('\n📋 Next Steps:')
  console.log('1. Ensure your SendGrid Inbound Parse is configured:')
  console.log('   - Host: reply.leadsup.io')
  console.log('   - URL: http://app.leadsup.io/api/webhooks/sendgrid')
  console.log('2. Set up DNS MX records for reply.leadsup.io to point to SendGrid')
  console.log('3. Test email replies to verify webhook integration')
  
  console.log('\n🎉 SendGrid Integration Test Complete!')
}

// Run the test
testSendGridIntegration().catch(console.error)