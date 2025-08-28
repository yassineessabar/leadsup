import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { from, to, subject = "Test Email", text = "This is a test email." } = body
    
    if (!from || !to) {
      return NextResponse.json({ error: 'from and to emails are required' }, { status: 400 })
    }

    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SENDGRID_API_KEY not found' }, { status: 400 })
    }

    console.log(`Testing SendGrid send: ${from} -> ${to}`)
    
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(apiKey.trim())
    
    const msg = {
      to: to,
      from: from,
      subject: subject,
      text: text
    }
    
    console.log('Sending message:', JSON.stringify(msg, null, 2))
    
    const result = await sgMail.send(msg)
    
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result[0]?.headers?.['x-message-id'] || 'unknown',
      statusCode: result[0]?.statusCode,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('SendGrid send error:', error)
    
    // Extract detailed error information
    const errorDetails = {
      message: error.message,
      code: error.code,
      response: error.response?.body || null,
      statusCode: error.response?.statusCode || null
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send email',
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}