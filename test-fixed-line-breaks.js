// Test the fixed line break handling
const sgMail = require('@sendgrid/mail')

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
if (!SENDGRID_API_KEY) {
  console.log('❌ SENDGRID_API_KEY not found')
  process.exit(1)
}

sgMail.setApiKey(SENDGRID_API_KEY)

// Sample content from database (with \n line breaks)
const testContent = `Hi {{firstName}},

I noticed that as the Marketing Director at {{company}}, you might be facing challenges with low response rates from customers. Many businesses in the software development industry struggle with obtaining feedback, which can hinder their online reputation.

At Loop Review, we automate the process of collecting reviews through WhatsApp, SMS, and Email, ensuring higher response rates and helping you showcase customer satisfaction effectively.

Would you be open to a quick chat to explore this further?`

// Personalize the content (same as automation endpoint)
let personalizedContent = testContent
  .replace(/\{\{firstName\}\}/g, 'John')
  .replace(/\{\{company\}\}/g, 'Tech Corp')

// Apply the same line break logic as the automation endpoint
const hasLineBreaks = personalizedContent.includes('\n') || 
                     personalizedContent.includes('<br') || 
                     personalizedContent.includes('<p>')

console.log('Has line breaks detected:', hasLineBreaks)
console.log('Content before processing:', JSON.stringify(personalizedContent))

if (hasLineBreaks) {
  personalizedContent = personalizedContent
    .replace(/\r\n/g, '\n')  // Convert Windows line breaks
    .replace(/\r/g, '\n')    // Convert Mac line breaks
    .replace(/\n\n+/g, '__PARAGRAPH_BREAK__')  // Double newlines to paragraph marker
    .replace(/\n/g, '__LINE_BREAK__')  // Single newlines to line marker
  
  // Add intelligent sentence-based paragraph breaks
  personalizedContent = personalizedContent
    .replace(/\.\s+([A-Z])/g, '.__PARAGRAPH_BREAK__$1')
    .replace(/\?\s+([A-Z])/g, '?__PARAGRAPH_BREAK__$1')
    .replace(/!\s+([A-Z])/g, '!__PARAGRAPH_BREAK__$1')
  
  // Convert markers to line breaks
  personalizedContent = personalizedContent
    .replace(/__PARAGRAPH_BREAK__/g, '\n\n')  // Double newlines 
    .replace(/__LINE_BREAK__/g, '\n')
  
  // ✅ FINAL FIX: Keep existing line breaks from database content
  console.log('📝 Preserving existing line breaks from database content')
}

console.log('Final content for email:', JSON.stringify(personalizedContent))

const msg = {
  to: 'ya.essabarry@gmail.com',
  from: 'info@leadsup.io',
  subject: 'TEST: Fixed Line Breaks - Should Work Now!',
  text: personalizedContent
}

sgMail.send(msg)
  .then(() => {
    console.log('✅ Test email sent successfully with fixed line breaks')
    console.log('📧 Check your Gmail - line breaks should now be preserved!')
  })
  .catch((error) => {
    console.error('❌ Error:', error)
  })