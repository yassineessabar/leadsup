// Test line break conversion logic
const testContent = `Hi John,

I noticed that as the Marketing Director at Tech Corp, you might be facing challenges with low response rates from customers.

Many businesses in the software development industry struggle with obtaining feedback, which can hinder their online reputation.

At Loop Review, we automate the process of collecting reviews through WhatsApp, SMS, and Email, ensuring higher response rates and helping you showcase customer satisfaction effectively.

Would you be open to a quick chat to explore this further?`

console.log('Original content:')
console.log(JSON.stringify(testContent))

console.log('\nHas \\n:', testContent.includes('\n'))
console.log('Has \\r\\n:', testContent.includes('\r\n'))

// Apply the same conversion logic as the API
let converted = testContent
  .replace(/\r\n/g, '\n')  // Convert Windows line breaks
  .replace(/\r/g, '\n')    // Convert Mac line breaks
  .replace(/\n\n+/g, '<br/><br/>')  // Convert paragraph breaks
  .replace(/\n/g, '<br/>')  // Convert remaining single newlines

console.log('\nConverted content:')
console.log(JSON.stringify(converted))

console.log('\nHTML preview:')
console.log(converted)