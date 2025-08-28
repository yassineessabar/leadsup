// Test the paragraph splitting logic
const testContent = `Hi John, I noticed that as the Marketing Director at Tech Corp, you might be facing challenges with low response rates from customers. Many businesses in the software development industry struggle with obtaining feedback, which can hinder their online reputation. At Loop Review, we automate the process of collecting reviews through WhatsApp, SMS, and Email, ensuring higher response rates and helping you showcase customer satisfaction effectively. Would you be open to a quick chat to explore this further?`

console.log('Original:')
console.log(testContent)
console.log('\nHas \\n:', testContent.includes('\n'))
console.log('Has <br:', testContent.includes('<br'))

let result = testContent
  // Split at period + space + capital letter
  .replace(/\.\s+([A-Z])/g, '.</p><p>$1')
  // Split at question mark + space + capital letter  
  .replace(/\?\s+([A-Z])/g, '?</p><p>$1')
  // Split at exclamation + space + capital letter
  .replace(/!\s+([A-Z])/g, '!</p><p>$1')

console.log('\nAfter paragraph splitting:')
console.log(result)

// Wrap in p tags like the API does
const finalResult = `<p>${result}</p>`
console.log('\nFinal HTML:')
console.log(finalResult)