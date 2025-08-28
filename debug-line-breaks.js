// Debug the sequence content line break processing
const testContent = `Hi {{firstName}},

I noticed that as the Marketing Director at {{company}}, you might be facing challenges with low response rates from customers. Many businesses in the software development industry struggle with obtaining feedback, which can hinder their online reputation.

At Loop Review, we automate the process of collecting reviews through WhatsApp, SMS, and Email, ensuring higher response rates and helping you showcase customer satisfaction effectively.

Would you be open to a quick chat to explore this further?`

console.log('🔍 Original content from database:')
console.log(JSON.stringify(testContent))

// Personalize the content
let personalizedContent = testContent
  .replace(/\{\{firstName\}\}/g, 'John')
  .replace(/\{\{company\}\}/g, 'Tech Corp')

console.log('\n🎯 After personalization:')
console.log(JSON.stringify(personalizedContent))

// Apply the line break logic (same as automation)
const hasLineBreaks = personalizedContent.includes('\n') || 
                     personalizedContent.includes('<br') || 
                     personalizedContent.includes('<p>')

console.log('\n📊 Line break analysis:')
console.log('- Has newlines:', personalizedContent.includes('\n'))
console.log('- Has <br> tags:', personalizedContent.includes('<br'))
console.log('- Has <p> tags:', personalizedContent.includes('<p>'))
console.log('- Overall hasLineBreaks:', hasLineBreaks)

if (hasLineBreaks) {
  console.log('\n🔧 Processing line breaks...')
  
  personalizedContent = personalizedContent
    .replace(/\r\n/g, '\n')  // Convert Windows line breaks
    .replace(/\r/g, '\n')    // Convert Mac line breaks
    .replace(/\n\n+/g, '__PARAGRAPH_BREAK__')  // Double newlines to paragraph marker
    .replace(/\n/g, '__LINE_BREAK__')  // Single newlines to line marker
  
  console.log('After initial replacement:', JSON.stringify(personalizedContent))
  
  // Convert markers to line breaks (removed excessive sentence-based breaks)
  personalizedContent = personalizedContent
    .replace(/__PARAGRAPH_BREAK__/g, '\n\n')  // Double newlines 
    .replace(/__LINE_BREAK__/g, '\n')
  
  console.log('After marker conversion:', JSON.stringify(personalizedContent))
  
  // ✅ FINAL FIX: Keep existing line breaks from database content
  console.log('📝 Preserving existing line breaks from database content')
}

console.log('\n✅ FINAL EMAIL CONTENT:')
console.log('='.repeat(50))
console.log(personalizedContent)
console.log('='.repeat(50))
console.log('\n📧 This is what would be sent via SendGrid as plain text.')