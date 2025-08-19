import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing SendGrid API key...')
    
    // Check if SendGrid API key exists
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'SendGrid API key not configured'
      }, { status: 400 })
    }

    // Test email configuration
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    const testEmail = {
      to: 'yassineessabar92@gmail.com',
      from: {
        email: 'hello@leadsup.io', // Use leadsup.io verified domain
        name: 'LeadsUp Test'
      },
      subject: 'SendGrid API Test - LeadsUp System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>✅ SendGrid API Test Successful!</h2>
          <p>This is a test email to verify that your new SendGrid API key is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>API Key:</strong> ${process.env.SENDGRID_API_KEY?.slice(0, 20)}...</p>
          <p><strong>Simulation Mode:</strong> ${process.env.EMAIL_SIMULATION_MODE || 'false'}</p>
          
          <div style="background: #f0f8ff; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>🚀 System Status:</h3>
            <ul>
              <li>✅ SendGrid API: Active</li>
              <li>✅ Real Email Mode: Enabled</li>
              <li>✅ Warmup System: Ready</li>
              <li>✅ Sequence Emails: Ready</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 12px;">
            This email was sent as a test from your LeadsUp email automation system.
          </p>
        </div>
      `,
      text: 'SendGrid API Test - LeadsUp System. This test confirms your new API key is working correctly.'
    }

    console.log('📧 Sending test email via SendGrid...')
    const result = await sgMail.send(testEmail)
    
    console.log('✅ Test email sent successfully!')
    console.log('SendGrid Response Status:', result[0]?.statusCode)
    console.log('Message ID:', result[0]?.headers?.['x-message-id'])

    return NextResponse.json({
      success: true,
      message: 'SendGrid API test successful!',
      details: {
        status_code: result[0]?.statusCode,
        message_id: result[0]?.headers?.['x-message-id'],
        recipient: testEmail.to,
        sender: testEmail.from.email,
        simulation_mode: process.env.EMAIL_SIMULATION_MODE === 'true',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ SendGrid test failed:', error)
    console.error('Error details:', error.response?.body || error.response || 'No response body')
    
    return NextResponse.json({
      success: false,
      error: 'SendGrid API test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      sendgrid_error: error.response?.body || error.response,
      api_key_configured: !!process.env.SENDGRID_API_KEY,
      simulation_mode: process.env.EMAIL_SIMULATION_MODE === 'true'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST method to test SendGrid API',
    api_key_configured: !!process.env.SENDGRID_API_KEY,
    simulation_mode: process.env.EMAIL_SIMULATION_MODE === 'true'
  })
}