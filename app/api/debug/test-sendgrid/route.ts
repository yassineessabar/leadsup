import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🧪 Testing SendGrid configuration in production...')
    
    // Check environment variables
    const envCheck = {
      SENDGRID_API_KEY_EXISTS: !!process.env.SENDGRID_API_KEY,
      SENDGRID_API_KEY_LENGTH: process.env.SENDGRID_API_KEY?.length || 0,
      EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      willSendRealEmails: !!(process.env.SENDGRID_API_KEY && process.env.EMAIL_SIMULATION_MODE !== 'true')
    }
    
    console.log('📊 Production Environment Check:', envCheck)
    
    // Try to send a test email if SendGrid is configured
    if (process.env.SENDGRID_API_KEY) {
      try {
        const sgMail = require('@sendgrid/mail')
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        
        const testMsg = {
          to: 'essabar.yassine@gmail.com',
          from: 'info@leadsup.io',
          subject: `SendGrid Production Test - ${new Date().toISOString()}`,
          text: 'This is a test email from your production environment to verify SendGrid is working.',
          custom_args: {
            test: 'production_test',
            sender_email: 'info@leadsup.io',
            timestamp: Date.now().toString()
          }
        }
        
        console.log('📤 Attempting to send test email...')
        const result = await sgMail.send(testMsg)
        
        return NextResponse.json({
          success: true,
          environment: envCheck,
          emailSent: true,
          messageId: result[0]?.headers?.['x-message-id'],
          statusCode: result[0]?.statusCode,
          message: 'Test email sent successfully! Check essabar.yassine@gmail.com'
        })
        
      } catch (emailError) {
        console.error('❌ SendGrid email error:', emailError)
        return NextResponse.json({
          success: false,
          environment: envCheck,
          emailSent: false,
          error: emailError.message,
          details: emailError.response?.body || 'No additional details'
        })
      }
    } else {
      return NextResponse.json({
        success: false,
        environment: envCheck,
        emailSent: false,
        error: 'SENDGRID_API_KEY not found in production environment'
      })
    }
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}