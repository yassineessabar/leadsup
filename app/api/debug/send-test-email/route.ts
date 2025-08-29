import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { recipient = 'essabar.yassine@gmail.com' } = await request.json().catch(() => ({}))
    
    console.log('🧪 Testing SendGrid email sending directly...')
    console.log(`📊 Environment Check:`)
    console.log(`   SENDGRID_API_KEY exists: ${!!process.env.SENDGRID_API_KEY}`)
    console.log(`   SENDGRID_API_KEY length: ${process.env.SENDGRID_API_KEY?.length || 0}`)
    console.log(`   EMAIL_SIMULATION_MODE: "${process.env.EMAIL_SIMULATION_MODE}"`)
    console.log(`   NODE_ENV: "${process.env.NODE_ENV}"`)
    console.log(`   VERCEL_ENV: "${process.env.VERCEL_ENV}"`)
    
    const willSendReal = !!(process.env.SENDGRID_API_KEY && process.env.EMAIL_SIMULATION_MODE !== 'true')
    console.log(`   Will send real email: ${willSendReal}`)
    
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'SENDGRID_API_KEY not found in production environment',
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV,
          EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE
        }
      })
    }
    
    if (process.env.EMAIL_SIMULATION_MODE === 'true') {
      return NextResponse.json({
        success: false,
        error: 'EMAIL_SIMULATION_MODE is set to true - no real emails will be sent',
        simulation_mode: true
      })
    }
    
    // Try to send actual email
    try {
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      
      const testMsg = {
        to: recipient,
        from: {
          email: 'info@leadsup.io',
          name: 'LeadsUp Direct Test'
        },
        subject: `Direct SendGrid Test - ${new Date().toISOString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>🧪 Direct SendGrid Test</h2>
            <p>This email was sent directly from the test API to verify SendGrid is working.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'unknown'}</p>
            <p><strong>Sent from:</strong> Production API</p>
          </div>
        `,
        custom_args: {
          test: 'direct_api_test',
          sender_email: 'info@leadsup.io',
          user_id: 'test-direct-user',
          campaign_id: 'test-direct-campaign',
          timestamp: Date.now().toString()
        },
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true },
          subscription_tracking: { enable: false }
        }
      }
      
      console.log('📤 Sending test email via SendGrid...')
      console.log(`   To: ${recipient}`)
      console.log(`   From: ${testMsg.from.email}`)
      console.log(`   Subject: ${testMsg.subject}`)
      
      const result = await sgMail.send(testMsg)
      const messageId = result[0]?.headers?.['x-message-id'] || 'unknown'
      
      console.log('✅ Email sent successfully!')
      console.log(`📨 SendGrid Message ID: ${messageId}`)
      console.log(`📊 Status Code: ${result[0]?.statusCode}`)
      
      return NextResponse.json({
        success: true,
        emailSent: true,
        recipient,
        messageId,
        statusCode: result[0]?.statusCode,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV,
          EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE,
          SENDGRID_CONFIGURED: true
        },
        message: `Test email sent to ${recipient}. Check your inbox and spam folder!`
      })
      
    } catch (emailError) {
      console.error('❌ SendGrid error:', emailError)
      
      return NextResponse.json({
        success: false,
        emailSent: false,
        error: emailError.message,
        errorCode: emailError.code,
        errorDetails: emailError.response?.body || 'No additional details',
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV,
          EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE,
          SENDGRID_CONFIGURED: true
        }
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'SendGrid test endpoint',
    usage: 'POST to send a test email and verify SendGrid configuration'
  })
}