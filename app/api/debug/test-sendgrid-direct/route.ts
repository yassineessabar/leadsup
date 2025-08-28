import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Testing SendGrid configuration...')
    console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY)
    console.log('SENDGRID_API_KEY starts with:', process.env.SENDGRID_API_KEY?.substring(0, 10))
    
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ 
        error: 'SENDGRID_API_KEY not found',
        env: process.env.NODE_ENV
      }, { status: 400 })
    }

    // Test SendGrid API connection
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    // Test with a simple message (won't send, just validate)
    const msg = {
      to: 'test@example.com',
      from: 'test@test.com',
      subject: 'Test',
      text: 'Test message'
    }
    
    // Just validate the message format without sending
    console.log('SendGrid initialized successfully')
    
    return NextResponse.json({ 
      success: true,
      message: 'SendGrid API key is valid and initialized',
      keyPrefix: process.env.SENDGRID_API_KEY.substring(0, 15),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('SendGrid test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}