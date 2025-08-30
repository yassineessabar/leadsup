// Simple test to verify SendGrid is working in production
const sgMail = require('@sendgrid/mail')

console.log('🔑 SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY)

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
  const msg = {
    to: 'ya.essabarry@gmail.com',
    from: 'contact@leadsup.io',
    subject: 'Direct SendGrid Test',
    text: 'This is a direct test of SendGrid functionality',
    html: '<p>This is a direct test of SendGrid functionality</p>'
  }
  
  sgMail.send(msg)
    .then((result) => {
      console.log('✅ Email sent successfully!')
      console.log('Message ID:', result[0]?.headers?.['x-message-id'])
    })
    .catch((error) => {
      console.error('❌ SendGrid error:', error)
      if (error.response?.body?.errors) {
        console.error('SendGrid errors:', error.response.body.errors)
      }
    })
} else {
  console.error('❌ SENDGRID_API_KEY not found in environment')
}