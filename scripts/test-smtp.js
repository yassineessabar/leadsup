const nodemailer = require('nodemailer')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const smtpHost = process.env.SMTP_HOST
const smtpPort = process.env.SMTP_PORT
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const fromEmail = process.env.FROM_EMAIL

console.log('🔧 SMTP Configuration:')
console.log(`Host: ${smtpHost}`)
console.log(`Port: ${smtpPort}`)
console.log(`User: ${smtpUser}`)
console.log(`From: ${fromEmail}`)
console.log(`Password: ${smtpPass ? '***configured***' : 'NOT SET'}`)

async function testSMTP() {
  try {
    console.log('\n📧 Testing SMTP connection...')
    
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // Verify connection
    await transporter.verify()
    console.log('✅ SMTP connection successful!')

    // Send test email
    console.log('📤 Sending test email...')
    
    const testEmail = {
      from: `"LeadsUp Support" <${fromEmail}>`,
      to: 'essabar.yassine@gmail.com',
      subject: 'Test Email - SMTP Configuration',
      text: 'This is a test email to verify SMTP configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">SMTP Test Email</h2>
          <p>This is a test email to verify that the SMTP configuration is working correctly.</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>Host: ${smtpHost}</li>
            <li>Port: ${smtpPort}</li>
            <li>From: ${fromEmail}</li>
          </ul>
          <p style="color: #666; font-size: 14px;">If you received this email, the SMTP setup is working!</p>
        </div>
      `
    }

    const result = await transporter.sendMail(testEmail)
    console.log('✅ Test email sent successfully!')
    console.log(`Message ID: ${result.messageId}`)
    
  } catch (error) {
    console.error('❌ SMTP test failed:', error.message)
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication failed. Please check:')
      console.log('   - Gmail username and password are correct')
      console.log('   - 2-factor authentication is enabled and you\'re using an App Password')
      console.log('   - Less secure app access is enabled (if not using App Password)')
    } else if (error.code === 'ECONNECTION') {
      console.log('\n💡 Connection failed. Please check:')
      console.log('   - Internet connection')
      console.log('   - SMTP host and port are correct')
      console.log('   - Firewall settings')
    }
  }
}

if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
  console.error('❌ Missing SMTP configuration. Please set all required environment variables.')
  process.exit(1)
}

testSMTP()