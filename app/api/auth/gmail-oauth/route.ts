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

// GET - Start Gmail OAuth flow for a specific email
export async function GET(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Gmail OAuth API\"' } }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const action = searchParams.get('action') || 'authorize'

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email parameter required',
        usage: 'GET /api/auth/gmail-oauth?email=user@gmail.com&action=authorize'
      })
    }

    // Gmail OAuth2 configuration
    const clientId = process.env.GMAIL_CLIENT_ID
    const redirectUri = process.env.GMAIL_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/gmail-oauth/callback`
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Gmail OAuth not configured',
        required_env_vars: [
          'GMAIL_CLIENT_ID',
          'GMAIL_CLIENT_SECRET',
          'GMAIL_REDIRECT_URI (optional)'
        ]
      })
    }

    // Gmail OAuth2 scopes for sending emails
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ')

    // Generate OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', email) // Pass email in state parameter

    console.log(`🔐 Generated OAuth URL for ${email}`)

    return NextResponse.json({
      success: true,
      action: 'oauth_authorization_required',
      email: email,
      authorization_url: authUrl.toString(),
      instructions: [
        '1. Visit the authorization URL',
        '2. Sign in with the Gmail account: ' + email,
        '3. Grant permissions for email sending',
        '4. You will be redirected back with authorization code',
        '5. The system will automatically save the OAuth tokens'
      ],
      next_steps: [
        'Open this URL in your browser:',
        authUrl.toString()
      ]
    })

  } catch (error) {
    console.error('❌ Error generating OAuth URL:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate OAuth URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// POST - Handle OAuth callback and save tokens
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Gmail OAuth API\"' } }
    )
  }

  try {
    const body = await request.json()
    const { code, email, state } = body

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Authorization code required',
        usage: 'POST with {"code": "auth_code", "email": "user@gmail.com"}'
      })
    }

    const targetEmail = email || state

    if (!targetEmail) {
      return NextResponse.json({
        success: false,
        error: 'Email required (either in body or from OAuth state)'
      })
    }

    console.log(`🔐 Processing OAuth callback for ${targetEmail}`)

    // Exchange authorization code for tokens
    const clientId = process.env.GMAIL_CLIENT_ID
    const clientSecret = process.env.GMAIL_CLIENT_SECRET
    const redirectUri = process.env.GMAIL_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/gmail-oauth/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Gmail OAuth credentials not configured'
      })
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', tokenData)
      return NextResponse.json({
        success: false,
        error: 'Failed to exchange authorization code for tokens',
        details: tokenData
      })
    }

    console.log('✅ OAuth tokens received')

    // Get user info to verify the email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    const userInfo = await userInfoResponse.json()
    const actualEmail = userInfo.email

    if (targetEmail !== actualEmail) {
      return NextResponse.json({
        success: false,
        error: `Email mismatch. Expected: ${targetEmail}, Got: ${actualEmail}`,
        suggestion: 'Make sure you signed in with the correct Gmail account'
      })
    }

    // Save OAuth tokens to database
    const { error: saveError } = await supabaseServer
      .from('campaign_senders')
      .upsert({
        email: actualEmail,
        name: userInfo.name || actualEmail.split('@')[0],
        auth_type: 'oauth2',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        oauth_config: {
          client_id: clientId,
          scopes: tokenData.scope?.split(' ') || [],
          authorized_at: new Date().toISOString()
        },
        is_active: true,
        created_at: new Date().toISOString()
      })

    if (saveError) {
      console.error('❌ Failed to save OAuth tokens:', saveError)
      return NextResponse.json({
        success: false,
        error: 'Failed to save OAuth tokens to database',
        details: saveError.message
      })
    }

    console.log(`✅ OAuth setup complete for ${actualEmail}`)

    return NextResponse.json({
      success: true,
      email: actualEmail,
      name: userInfo.name,
      auth_type: 'oauth2',
      authorized_at: new Date().toISOString(),
      token_expires_in: tokenData.expires_in,
      scopes: tokenData.scope?.split(' ') || [],
      next_steps: [
        '✅ OAuth2 authentication configured successfully!',
        '📧 Account ready for sending emails',
        '',
        'Test email sending:',
        'curl -u "admin:password" -X POST http://localhost:3000/api/campaigns/automation/send-emails',
        '',
        'Add more accounts:',
        'curl -u "admin:password" "http://localhost:3000/api/auth/gmail-oauth?email=another@gmail.com"'
      ]
    })

  } catch (error) {
    console.error('❌ Error processing OAuth callback:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process OAuth callback',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}