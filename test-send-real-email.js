#!/usr/bin/env node

/**
 * Send a real test email that you can reply to
 * 
 * Usage: node test-send-real-email.js your-email@example.com
 */

const sgMail = require('@sendgrid/mail')

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

if (!SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY environment variable is required')
  process.exit(1)
}

async function sendRealTestEmail(recipientEmail) {
  if (!recipientEmail) {
    console.error('❌ Please provide an email address')
    console.log('Usage: node test-send-real-email.js your-email@example.com')
    process.exit(1)
  }

  console.log('📧 Sending Real Test Email for Reply Testing\n')
  
  try {
    sgMail.setApiKey(SENDGRID_API_KEY)
    
    const testId = Date.now()
    const email = {
      to: recipientEmail,
      from: {
        email: 'noreply@leadsup.io', // Update with your verified sender
        name: 'LeadsUp Test'
      },
      replyTo: 'test@reply.leadsup.io', // Your inbound parse domain
      subject: `Test Email #${testId} - Please Reply`,
      text: `This is test email #${testId}.

IMPORTANT: Please reply to this email to test the inbound webhook.

When you reply, your response should be captured automatically by our SendGrid webhook.

Test Details:
- Email ID: ${testId}
- Sent at: ${new Date().toISOString()}
- Reply-To: test@reply.leadsup.io

Best regards,
LeadsUp Test System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email #${testId}</h2>
          <p><strong>IMPORTANT: Please reply to this email to test the inbound webhook.</strong></p>
          <p>When you reply, your response should be captured automatically by our SendGrid webhook.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Test Details:</h3>
            <ul>
              <li>Email ID: <code>${testId}</code></li>
              <li>Sent at: ${new Date().toISOString()}</li>
              <li>Reply-To: <code>test@reply.leadsup.io</code></li>
            </ul>
          </div>
          <p>Best regards,<br>LeadsUp Test System</p>
        </div>
      `
    }

    console.log('Sending email to:', recipientEmail)
    console.log('Reply-To address:', email.replyTo)
    console.log('Test ID:', testId)
    
    const result = await sgMail.send(email)
    
    console.log('\n✅ Email sent successfully!')
    console.log('Message ID:', result[0]?.headers?.['x-message-id'] || 'Unknown')
    console.log('\n📋 Next Steps:')
    console.log('1. Check your inbox for the test email')
    console.log('2. Reply to the email with any message')
    console.log('3. Wait 30-60 seconds for webhook processing')
    console.log('4. Run: node check-inbox-replies.js')
    console.log(`\n💡 Your reply will be sent to: test@reply.leadsup.io`)
    console.log('   SendGrid will capture it and forward to our webhook')
    
    // Save test ID for checking later
    const fs = require('fs')
    fs.writeFileSync('last-test-email.json', JSON.stringify({
      testId,
      recipientEmail,
      sentAt: new Date().toISOString(),
      messageId: result[0]?.headers?.['x-message-id']
    }, null, 2))
    
    console.log('\n📝 Test details saved to: last-test-email.json')
    
  } catch (error) {
    console.error('❌ Failed to send email:', error.message)
    if (error.response?.body?.errors) {
      error.response.body.errors.forEach(err => {
        console.error(`   • ${err.message}`)
      })
    }
  }
}

// Get email from command line
const recipientEmail = process.argv[2]
sendRealTestEmail(recipientEmail)