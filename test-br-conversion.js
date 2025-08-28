// Test the br tag conversion logic
const testContent = `Hi {{firstName}},<br/><br/>I hope this email finds you well! I wanted to reach out because...<br/><br/>Best regards,<br/>{{senderName}}`

console.log('Content with br tags:')
console.log(testContent)

const hasLineBreaks = testContent.includes('\n') || 
                     testContent.includes('<br') || 
                     testContent.includes('<p>')

console.log('\nHas line breaks detected:', hasLineBreaks)

if (hasLineBreaks) {
  let result = testContent
    .replace(/\r\n/g, '\n')  // Convert Windows line breaks
    .replace(/\r/g, '\n')    // Convert Mac line breaks
    .replace(/<br\s*\/?><br\s*\/?>/gi, '</p><p>')  // Convert double br tags to paragraphs
    .replace(/\n\n+/g, '</p><p>')  // Convert paragraph breaks to proper HTML paragraphs
    .replace(/\n/g, '<br>')  // Convert remaining single newlines
    .replace(/<br\s*\/?>/gi, '<br>')  // Normalize br tags

  console.log('\nAfter conversion:')
  console.log(result)
  
  const final = `<p>${result}</p>`
  console.log('\nFinal HTML:')
  console.log(final)
}