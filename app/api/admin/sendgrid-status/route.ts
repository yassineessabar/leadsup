import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
    
    if (!SENDGRID_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'SendGrid API key not configured',
        status: 'error'
      })
    }

    // Test SendGrid API by attempting to get account information
    const response = await fetch('https://api.sendgrid.com/v3/user/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const accountData = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: accountData.errors?.[0]?.message || 'SendGrid API error',
        status: response.status === 401 ? 'unauthorized' : 'error',
        details: accountData
      })
    }

    // Get usage/quota information
    let usageInfo = null
    try {
      const usageResponse = await fetch('https://api.sendgrid.com/v3/user/credits', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (usageResponse.ok) {
        usageInfo = await usageResponse.json()
      }
    } catch (error) {
      console.log('Could not fetch usage info:', error)
    }

    // Test email sending capability with a simple validation
    let sendingStatus = 'unknown'
    let sendingError = null
    
    try {
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(SENDGRID_API_KEY.trim())
      
      // Just test the API key validation without actually sending
      const testMsg = {
        to: 'test@example.com',
        from: 'info@leadsup.io',
        subject: 'Test',
        html: 'Test',
        mailSettings: {
          sandboxMode: {
            enable: true // This prevents actual sending
          }
        }
      }
      
      await sgMail.send(testMsg)
      sendingStatus = 'operational'
    } catch (error: any) {
      sendingStatus = 'error'
      sendingError = error.message
      
      // Check for specific credit-related errors
      if (error.message?.includes('credits') || error.message?.includes('limit') || error.code === 401) {
        sendingStatus = 'credits_exceeded'
      }
    }

    return NextResponse.json({
      success: true,
      status: 'operational',
      account: {
        type: accountData.type || 'unknown',
        reputation: accountData.reputation || 0
      },
      usage: usageInfo,
      sending: {
        status: sendingStatus,
        error: sendingError
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      status: 'error'
    }, { status: 500 })
  }
}