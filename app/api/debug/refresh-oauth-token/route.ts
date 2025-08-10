import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth helper function
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Refresh OAuth token for a sender
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Debug API\"' } }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { email } = body
    
    const testEmail = email || 'essabar.yassine@gmail.com'

    console.log(`🔄 Attempting to refresh OAuth token for ${testEmail}...`)

    // Get sender data
    const { data: senderData, error: senderError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        email,
        name,
        access_token,
        refresh_token,
        auth_type,
        token_expires_at
      `)
      .eq('email', testEmail)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (senderError || !senderData) {
      return NextResponse.json({
        success: false,
        error: 'Sender not found',
        details: senderError?.message
      })
    }

    if (!senderData.refresh_token) {
      return NextResponse.json({
        success: false,
        error: 'No refresh token available',
        suggestion: 'Re-authenticate the sender account from the frontend'
      })
    }

    console.log(`🔐 Refreshing token using refresh_token: ${senderData.refresh_token.substring(0, 20)}...`)

    // Try to refresh the token
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        refresh_token: senderData.refresh_token,
        grant_type: 'refresh_token'
      })
    })

    const refreshData = await refreshResponse.json()

    if (!refreshResponse.ok) {
      console.error('❌ Token refresh failed:', refreshData)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to refresh OAuth token',
        details: refreshData,
        suggestions: [
          'The refresh token may be expired or invalid',
          'Try re-authenticating the account from the frontend',
          'Check if the OAuth client configuration matches the frontend setup'
        ]
      })
    }

    console.log('✅ Token refreshed successfully!')

    // Update the database with new token
    const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
    
    const { error: updateError } = await supabaseServer
      .from('campaign_senders')
      .update({
        access_token: refreshData.access_token,
        token_expires_at: newExpiresAt,
        // Keep the existing refresh_token unless we get a new one
        ...(refreshData.refresh_token ? { refresh_token: refreshData.refresh_token } : {})
      })
      .eq('email', testEmail)
      .eq('is_active', true)

    if (updateError) {
      console.error('❌ Failed to update token in database:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to save refreshed token',
        details: updateError.message
      })
    }

    console.log('✅ Database updated with new token')

    // Test the new token
    let testResult = null
    try {
      console.log('🧪 Testing new token...')
      
      const nodemailer = require('nodemailer')
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: senderData.email,
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: senderData.refresh_token,
          accessToken: refreshData.access_token
        }
      })

      await transporter.verify()
      
      testResult = {
        success: true,
        message: 'New token works correctly'
      }
      
      console.log('✅ New token test: SUCCESS')
      
    } catch (error) {
      testResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      
      console.log('❌ New token test: FAILED')
      console.log('   Error:', error?.message)
    }

    return NextResponse.json({
      success: true,
      message: 'OAuth token refreshed successfully',
      sender: {
        email: senderData.email,
        name: senderData.name
      },
      token_info: {
        new_expires_at: newExpiresAt,
        expires_in_seconds: refreshData.expires_in,
        got_new_refresh_token: !!refreshData.refresh_token
      },
      test_result: testResult,
      next_steps: [
        '✅ Token has been refreshed and saved',
        testResult?.success ? 
          '✅ New token verified - emails should work now' :
          '⚠️ New token test failed - may need re-authentication',
        '',
        'Test sending:',
        'curl -u "admin:password" -X POST http://localhost:3000/api/campaigns/automation/send-emails'
      ]
    })

  } catch (error) {
    console.error('❌ Error refreshing OAuth token:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}