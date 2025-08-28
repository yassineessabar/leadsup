import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Testing SendGrid API key...')
    
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'SENDGRID_API_KEY not found',
        env: process.env.NODE_ENV
      }, { status: 400 })
    }

    console.log(`SendGrid API key: ${apiKey.substring(0, 15)}...`)
    
    // Test direct SendGrid API call
    const response = await fetch('https://api.sendgrid.com/v3/user/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'SendGrid API call failed',
        status: response.status,
        response: data,
        keyPrefix: apiKey.substring(0, 15)
      }, { status: response.status })
    }
    
    // Now test with SendGrid mail library
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(apiKey)
    
    // Create a test message (won't send, just validate)
    const msg = {
      to: 'test@example.com',
      from: 'test@test.com',
      subject: 'Test',
      text: 'Test message'
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'SendGrid API key is valid',
      account: data,
      keyPrefix: apiKey.substring(0, 15),
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