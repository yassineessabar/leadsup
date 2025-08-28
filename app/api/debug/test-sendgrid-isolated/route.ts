import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SENDGRID_API_KEY not found' }, { status: 400 })
    }

    console.log('Testing SendGrid with verified sender...')
    
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(apiKey.trim())
    
    const msg = {
      to: 'ya.essabarry@gmail.com',
      from: 'hello@leadsup.io', // Verified sender
      subject: 'SendGrid Test from Automation Debug',
      text: 'This is a test email to debug the SendGrid Unauthorized error.'
    }
    
    console.log('Sending test message:', JSON.stringify(msg, null, 2))
    
    const result = await sgMail.send(msg)
    
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result[0]?.headers?.['x-message-id'] || 'unknown',
      statusCode: result[0]?.statusCode,
      result: result[0],
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('SendGrid test error:', error)
    
    const detailedError = {
      message: error.message,
      code: error.code,
      statusCode: error.response?.statusCode,
      body: error.response?.body,
      headers: error.response?.headers
    }
    
    console.error('Detailed SendGrid error:', JSON.stringify(detailedError, null, 2))
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send test email',
      details: detailedError,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}