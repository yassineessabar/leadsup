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

// POST - Test OAuth authentication with a specific sender
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

    console.log(`🧪 Testing OAuth authentication for ${testEmail}...`)

    // Get sender data
    const { data: senderData, error: senderError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        email,
        name,
        access_token,
        refresh_token,
        app_password,
        auth_type,
        token_expires_at,
        oauth_config
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

    console.log('📋 Sender data analysis:')
    console.log(`   Email: ${senderData.email}`)
    console.log(`   Auth type: ${senderData.auth_type}`)
    console.log(`   Has access_token: ${!!senderData.access_token}`)
    console.log(`   Has refresh_token: ${!!senderData.refresh_token}`)
    console.log(`   Has app_password: ${!!senderData.app_password}`)
    console.log(`   Token expires: ${senderData.token_expires_at}`)

    // Determine best auth method
    let authMethod = 'none'
    let canSend = false
    
    if (senderData.access_token && senderData.refresh_token) {
      authMethod = 'oauth2'
      canSend = true
    } else if (senderData.app_password) {
      authMethod = 'app_password'
      canSend = true
    }

    console.log(`🎯 Selected auth method: ${authMethod}`)

    // Test OAuth2 connection if available
    let oauthTest = null
    if (senderData.access_token && senderData.refresh_token) {
      try {
        console.log('🔐 Testing OAuth2 transporter creation...')
        
        const nodemailer = require('nodemailer')
        
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: senderData.email,
            clientId: process.env.GOOGLE_CLIENT_ID, // Use same as frontend
            clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Use same as frontend  
            refreshToken: senderData.refresh_token,
            accessToken: senderData.access_token
          }
        })

        // Verify the connection
        await transporter.verify()
        
        oauthTest = {
          success: true,
          message: 'OAuth2 connection verified successfully'
        }
        
        console.log('✅ OAuth2 connection test: SUCCESS')
        
      } catch (error) {
        oauthTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          code: error?.code
        }
        
        console.log('❌ OAuth2 connection test: FAILED')
        console.log('   Error:', error?.message)
        console.log('   Code:', error?.code)
      }
    }

    return NextResponse.json({
      success: true,
      sender: {
        email: senderData.email,
        name: senderData.name,
        auth_type: senderData.auth_type
      },
      authentication: {
        has_access_token: !!senderData.access_token,
        has_refresh_token: !!senderData.refresh_token,
        has_app_password: !!senderData.app_password,
        access_token_length: senderData.access_token?.length || 0,
        refresh_token_length: senderData.refresh_token?.length || 0,
        token_expires_at: senderData.token_expires_at,
        selected_method: authMethod,
        can_send_emails: canSend
      },
      oauth_test: oauthTest,
      environment: {
        has_gmail_client_id: !!process.env.GMAIL_CLIENT_ID,
        has_gmail_client_secret: !!process.env.GMAIL_CLIENT_SECRET,
        gmail_client_id_length: process.env.GMAIL_CLIENT_ID?.length || 0
      },
      recommendations: canSend ? [
        '✅ Authentication is configured',
        authMethod === 'oauth2' ? 
          '🔐 OAuth2 tokens available from frontend authentication' :
          '🔑 App Password configured',
        oauthTest?.success ? 
          '✅ OAuth2 connection test passed' :
          '⚠️ OAuth2 connection test failed - check token validity'
      ] : [
        '❌ No valid authentication configured',
        'Set up OAuth2 or App Password authentication'
      ]
    })

  } catch (error) {
    console.error('❌ Error testing OAuth sender:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}