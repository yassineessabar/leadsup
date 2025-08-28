// Direct SendGrid test to verify line break handling
const sgMail = require('@sendgrid/mail')

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
if (!SENDGRID_API_KEY) {
  console.log('❌ SENDGRID_API_KEY not found')
  process.exit(1)
}

sgMail.setApiKey(SENDGRID_API_KEY)

const testContent = `Hi John,

I noticed that as the Marketing Director at Tech Corp, you might be facing challenges with low response rates from customers.

Many businesses in the software development industry struggle with obtaining feedback, which can hinder their online reputation.

At Loop Review, we automate the process of collecting reviews through WhatsApp, SMS, and Email, ensuring higher response rates and helping you showcase customer satisfaction effectively.

Would you be open to a quick chat to explore this further?`

console.log('Sending test email with explicit line breaks...')
console.log('Content:', JSON.stringify(testContent))

const msg = {
  to: 'ya.essabarry@gmail.com',
  from: 'info@leadsup.io',
  subject: 'TEST: Line Break Fix - Direct Send',
  text: testContent
}

sgMail.send(msg)
  .then(() => {
    console.log('✅ Test email sent successfully')
  })
  .catch((error) => {
    console.error('❌ Error:', error)
  })