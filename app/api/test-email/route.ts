import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Environment check:')
    console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'Set' : 'Not set')
    console.log('EMAIL_SIMULATION_MODE:', process.env.EMAIL_SIMULATION_MODE)
    
    const { to, subject = 'Test Email from LeadsUp' } = await request.json()
    
    if (!to) {
      return NextResponse.json({ success: false, error: 'Email recipient required' }, { status: 400 })
    }
    
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'SENDGRID_API_KEY not configured',
        env: {
          SENDGRID_API_KEY: 'Not set',
          EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE
        }
      })
    }
    
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    const msg = {
      to: to,
      from: 'info@leadsup.io', // Verified sender
      subject: subject,
      html: `
        <h2>Test Email from LeadsUp</h2>
        <p>This is a test email to verify SendGrid integration is working.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
        <p>Configuration:</p>
        <ul>
          <li>SENDGRID_API_KEY: ✅ Configured</li>
          <li>EMAIL_SIMULATION_MODE: ${process.env.EMAIL_SIMULATION_MODE}</li>
        </ul>
      `,
      text: `Test Email from LeadsUp\n\nThis is a test email to verify SendGrid integration is working.\nSent at: ${new Date().toISOString()}`
    }
    
    console.log(`📧 Sending test email to: ${to}`)
    
    const result = await sgMail.send(msg)
    
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
      messageId: result[0]?.headers?.['x-message-id'] || 'unknown',
      env: {
        SENDGRID_API_KEY: 'Set',
        EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE
      }
    })
    
  } catch (error) {
    console.error('❌ Test email error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      env: {
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? 'Set' : 'Not set',
        EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE
      }
    }, { status: 500 })
  }
}