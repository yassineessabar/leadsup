import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ error: 'SendGrid not configured' }, { status: 500 })
    }

    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    // Use the same content from database
    const testContent = `Hi {{firstName}},

I noticed that as the Marketing Director at {{company}}, you might be facing challenges with low response rates from customers. Many businesses in the software development industry struggle with obtaining feedback, which can hinder their online reputation.

At Loop Review, we automate the process of collecting reviews through WhatsApp, SMS, and Email, ensuring higher response rates and helping you showcase customer satisfaction effectively.

Would you be open to a quick chat to explore this further?`

    // Apply the same processing as automation endpoint
    let personalizedContent = testContent
      .replace(/\{\{firstName\}\}/g, 'John')
      .replace(/\{\{company\}\}/g, 'Tech Corp')

    // Process line breaks exactly like automation
    const hasLineBreaks = personalizedContent.includes('\n') || 
                         personalizedContent.includes('<br') || 
                         personalizedContent.includes('<p>')

    if (hasLineBreaks) {
      personalizedContent = personalizedContent
        .replace(/\r\n/g, '\n')  // Convert Windows line breaks
        .replace(/\r/g, '\n')    // Convert Mac line breaks
        .replace(/\n\n+/g, '__PARAGRAPH_BREAK__')  // Double newlines to paragraph marker
        .replace(/\n/g, '__LINE_BREAK__')  // Single newlines to line marker
      
      // Convert markers to line breaks
      personalizedContent = personalizedContent
        .replace(/__PARAGRAPH_BREAK__/g, '\n\n')  // Double newlines 
        .replace(/__LINE_BREAK__/g, '\n')
      
      // ✅ FINAL FIX: Keep existing line breaks from database content
      console.log('📝 Preserving existing line breaks from database content')
    }

    console.log('📧 Sending test email with content:', JSON.stringify(personalizedContent))

    const msg = {
      to: 'ya.essabarry@gmail.com',
      from: 'info@leadsup.io',
      subject: '✅ FIXED: Line Breaks Test - Should Work Now!',
      text: personalizedContent
    }

    const result = await sgMail.send(msg)
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully with fixed line breaks!',
      messageId: result[0]?.headers?.['x-message-id'],
      content_preview: personalizedContent.substring(0, 200) + '...',
      instruction: 'Check your Gmail - line breaks should now be preserved properly!'
    })

  } catch (error) {
    console.error('❌ Error sending test email:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}