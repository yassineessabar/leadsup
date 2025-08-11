const FormData = require('form-data')
const http = require('http')
const https = require('https')
const { URL } = require('url')

async function testWebhookDirectly() {
  console.log('🧪 Testing SendGrid Webhook Directly\n')
  console.log('=' .repeat(50))

  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/sendgrid'
  
  console.log(`📡 Webhook URL: ${webhookUrl}`)
  console.log('\nSimulating inbound email from SendGrid...\n')

  // Load test campaign config if available
  let toEmail = 'campaign@app.leadsup.io'  // Use existing sender
  let configInfo = 'using existing sender'
  
  try {
    const fs = require('fs')
    if (fs.existsSync('webhook-test-config.json')) {
      const config = JSON.parse(fs.readFileSync('webhook-test-config.json', 'utf8'))
      toEmail = config.senderEmail
      configInfo = `using campaign: ${config.campaignName}`
      console.log(`📋 Found webhook config: ${config.campaignName}`)
      console.log(`   Campaign ID: ${config.campaignId}`)
      console.log(`   Sender Email: ${config.senderEmail}`)
    } else if (fs.existsSync('test-campaign-config.json')) {
      const config = JSON.parse(fs.readFileSync('test-campaign-config.json', 'utf8'))
      toEmail = config.senderEmail
      configInfo = 'using test config'
      console.log(`📋 Using test campaign sender: ${toEmail}`)
    }
  } catch (e) {
    console.log('📋 No campaign config found, using default')
  }

  // Create test data
  const testId = Date.now()
  const formData = new FormData()
  
  // Simulate an email reply
  const emailData = {
    from: `John Doe <john.doe${testId}@example.com>`,
    to: toEmail,
    subject: `Re: Your Campaign Message - Test ${testId}`,
    text: `This is a test reply to your campaign.
    
I'm interested in learning more about your product.

Please send me more information.

Best regards,
John Doe`,
    html: `<p>This is a test reply to your campaign.</p>
<p>I'm interested in learning more about your product.</p>
<p>Please send me more information.</p>
<p>Best regards,<br>John Doe</p>`,
    envelope: JSON.stringify({
      from: `john.doe${testId}@example.com`,
      to: [toEmail]
    }),
    headers: `Received: by mx.sendgrid.net
From: John Doe <john.doe${testId}@example.com>
To: ${toEmail}
Subject: Re: Your Campaign Message - Test ${testId}
Date: ${new Date().toUTCString()}`,
    spam_score: '0.1',
    spam_report: 'Spam detection software running',
    attachments: '0',
    charsets: JSON.stringify({
      to: 'UTF-8',
      from: 'UTF-8',
      subject: 'UTF-8',
      text: 'UTF-8'
    })
  }

  // Add all fields to form data
  Object.entries(emailData).forEach(([key, value]) => {
    formData.append(key, value)
  })

  try {
    console.log('📤 Sending webhook request...')
    console.log(`   From: ${emailData.from}`)
    console.log(`   To: ${emailData.to}`)
    console.log(`   Subject: ${emailData.subject}`)
    
    // Parse URL
    const parsedUrl = new URL(webhookUrl)
    const protocol = parsedUrl.protocol === 'https:' ? https : http
    
    // Create promise for the request
    const response = await new Promise((resolve, reject) => {
      const req = protocol.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname,
        method: 'POST',
        headers: formData.getHeaders()
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data))
          })
        })
      })
      
      req.on('error', reject)
      formData.pipe(req)
    })

    const responseText = await response.text()
    let responseData
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    console.log('\n📥 Webhook Response:')
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      console.log('✅ Webhook processed successfully!')
      
      if (responseData.success) {
        console.log('\n📊 Processing Details:')
        console.log(`   Message ID: ${responseData.messageId || 'N/A'}`)
        console.log(`   Conversation ID: ${responseData.conversationId || 'N/A'}`)
        console.log(`   Direction: ${responseData.direction || 'N/A'}`)
        console.log(`   Timestamp: ${responseData.timestamp || 'N/A'}`)
        
        if (responseData.message) {
          console.log(`   Note: ${responseData.message}`)
        }
      } else {
        console.log('⚠️  Webhook returned success=false')
        console.log(`   Error: ${responseData.error || 'Unknown'}`)
        console.log(`   Message: ${responseData.message || 'None'}`)
      }
    } else {
      console.log('❌ Webhook request failed!')
      console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`)
    }

    // Test GET endpoint to verify webhook is accessible
    console.log('\n🔍 Testing GET endpoint...')
    const getResponse = await fetch(webhookUrl, { method: 'GET' })
    
    if (getResponse.ok) {
      const getInfo = await getResponse.json()
      console.log('✅ Webhook endpoint is accessible')
      console.log(`   Status: ${getInfo.status}`)
      console.log(`   Provider: ${getInfo.provider}`)
    } else {
      console.log('❌ GET endpoint not accessible')
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Connection refused. Make sure:')
      console.log('   1. Your Next.js app is running (npm run dev)')
      console.log('   2. The webhook URL is correct')
      console.log('   3. No firewall is blocking the connection')
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📋 WEBHOOK TEST COMPLETE')
  console.log('='.repeat(50))
  
  console.log('\n💡 What to check next:')
  console.log('   1. Check your database for the test message')
  console.log('   2. Run: node check-inbox-replies.js')
  console.log('   3. Check application logs for processing details')
  console.log('   4. If using production URL, ensure it\'s publicly accessible')
  
  console.log('\n🔧 For production testing:')
  console.log('   Set WEBHOOK_URL=http://app.leadsup.io/api/webhooks/sendgrid')
  console.log('   Then run this script again')
}

// Run the test
testWebhookDirectly().catch(console.error)