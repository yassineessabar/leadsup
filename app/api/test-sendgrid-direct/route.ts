import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json()
    
    // Log environment check
    console.log('🔍 Environment check:')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('VERCEL:', process.env.VERCEL)
    console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY)
    console.log('SENDGRID_API_KEY length:', process.env.SENDGRID_API_KEY?.length || 0)
    
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ 
        error: 'SENDGRID_API_KEY not found in environment',
        env: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
          hasKey: false
        }
      }, { status: 500 })
    }
    
    // Direct SendGrid test - clean the API key
    const sgMail = require('@sendgrid/mail')
    const cleanApiKey = process.env.SENDGRID_API_KEY.trim().replace(/[\r\n\s]/g, '')
    console.log('🔑 API Key first 7 chars:', cleanApiKey.substring(0, 7))
    console.log('🔑 API Key last 3 chars:', cleanApiKey.slice(-3))
    sgMail.setApiKey(cleanApiKey)
    
    const msg = {
      to: to || 'ya.essabarry@gmail.com',
      from: 'contact@leadsup.io',
      subject: 'Direct SendGrid Test - ' + new Date().toISOString(),
      text: 'This is a direct test to verify SendGrid is working in production.',
      html: '<p>This is a direct test to verify SendGrid is working in production.</p>'
    }
    
    console.log('📧 Attempting to send email to:', msg.to)
    
    try {
      const result = await sgMail.send(msg)
      console.log('✅ SendGrid send successful:', result[0]?.statusCode)
      
      return NextResponse.json({ 
        success: true,
        message: 'Email sent successfully',
        to: msg.to,
        messageId: result[0]?.headers?.['x-message-id'],
        statusCode: result[0]?.statusCode
      })
    } catch (sgError: any) {
      console.error('❌ SendGrid error:', sgError)
      return NextResponse.json({ 
        error: 'SendGrid send failed',
        details: sgError.message,
        code: sgError.code,
        response: sgError.response?.body
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('❌ Route error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
  }
}