import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing direct SendGrid line breaks')
    
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ error: 'SendGrid not configured' }, { status: 500 })
    }

    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    // Test different line break formats
    const tests = [
      {
        name: 'Double Newlines',
        content: `Hi John,\n\nI noticed that as the Marketing Director at Tech Corp, you might be facing challenges.\n\nMany businesses struggle with feedback.\n\nWould you be open to a chat?`
      },
      {
        name: 'Unicode Line Separator',
        content: `Hi John,\u2028\u2028I noticed that as the Marketing Director at Tech Corp, you might be facing challenges.\u2028\u2028Many businesses struggle with feedback.\u2028\u2028Would you be open to a chat?`
      },
      {
        name: 'Multiple Spaces',
        content: `Hi John,        I noticed that as the Marketing Director at Tech Corp, you might be facing challenges.        Many businesses struggle with feedback.        Would you be open to a chat?`
      },
      {
        name: 'Dash Separators',
        content: `Hi John,\n\n--- --- ---\n\nI noticed that as the Marketing Director at Tech Corp, you might be facing challenges.\n\n--- --- ---\n\nMany businesses struggle with feedback.\n\n--- --- ---\n\nWould you be open to a chat?`
      }
    ]

    const results = []
    
    for (const test of tests) {
      const msg = {
        to: 'ya.essabarry@gmail.com',
        from: 'info@leadsup.io',
        subject: `LINE BREAK TEST: ${test.name}`,
        text: test.content
      }

      try {
        const result = await sgMail.send(msg)
        results.push({
          test: test.name,
          status: 'sent',
          messageId: result[0]?.headers?.['x-message-id'],
          content_preview: test.content.substring(0, 100) + '...'
        })
        console.log(`✅ Sent ${test.name}`)
      } catch (error) {
        results.push({
          test: test.name,
          status: 'failed',
          error: error.message
        })
        console.error(`❌ Failed ${test.name}:`, error)
      }

      // Wait between sends
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      success: true,
      message: 'Line break tests sent',
      tests: results,
      instruction: 'Check your Gmail for 4 test emails with different line break formats'
    })

  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}