import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { recipient = 'essabar.yassine@gmail.com' } = await request.json().catch(() => ({}))
    
    console.log('🧪 Testing SendGrid API directly with raw HTTP...')
    console.log(`📊 Environment Check:`)
    console.log(`   SENDGRID_API_KEY exists: ${!!process.env.SENDGRID_API_KEY}`)
    console.log(`   EMAIL_SIMULATION_MODE: "${process.env.EMAIL_SIMULATION_MODE}"`)
    
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'SENDGRID_API_KEY not found'
      })
    }
    
    if (process.env.EMAIL_SIMULATION_MODE === 'true') {
      return NextResponse.json({
        success: false,
        error: 'EMAIL_SIMULATION_MODE is true - skipping real send'
      })
    }
    
    // Test with raw fetch to SendGrid API instead of SDK
    const apiKey = process.env.SENDGRID_API_KEY
    console.log(`🔑 API Key length: ${apiKey.length}`)
    console.log(`🔑 API Key starts with: ${apiKey.substring(0, 10)}...`)
    console.log(`🔑 API Key contains newlines: ${apiKey.includes('\n')}`)
    console.log(`🔑 API Key contains returns: ${apiKey.includes('\r')}`)
    
    const emailData = {
      personalizations: [
        {
          to: [{ email: recipient }]
        }
      ],
      from: {
        email: 'info@leadsup.io',
        name: 'LeadsUp Direct Test'
      },
      subject: `Raw API Test - ${new Date().toISOString()}`,
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>🧪 Raw SendGrid API Test</h2>
              <p>This email was sent directly via SendGrid HTTP API to test connectivity.</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              <p><strong>Method:</strong> Raw HTTP API (not SDK)</p>
            </div>
          `
        }
      ],
      custom_args: {
        test: 'raw_api_test',
        sender_email: 'info@leadsup.io',
        user_id: 'test-raw-user',
        timestamp: Date.now().toString()
      },
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
        subscription_tracking: { enable: false }
      }
    }
    
    console.log('📤 Sending via raw SendGrid HTTP API...')
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })
    
    const responseText = await response.text()
    console.log(`📊 SendGrid response status: ${response.status}`)
    console.log(`📊 SendGrid response: ${responseText}`)
    
    if (response.ok) {
      const messageId = response.headers.get('x-message-id')
      console.log(`✅ Email sent successfully via raw API!`)
      console.log(`📨 Message ID: ${messageId}`)
      
      return NextResponse.json({
        success: true,
        emailSent: true,
        method: 'raw_http_api',
        recipient,
        messageId,
        statusCode: response.status,
        message: `Raw API test email sent to ${recipient}. Check inbox!`
      })
    } else {
      console.error('❌ SendGrid API error:', responseText)
      return NextResponse.json({
        success: false,
        emailSent: false,
        error: `SendGrid API error: ${response.status}`,
        details: responseText,
        statusCode: response.status
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Raw API test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Raw API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}