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

// POST - Verify what scopes the current token has
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

    console.log(`🔍 Verifying token scopes for ${testEmail}...`)

    // Get sender data
    const { data: senderData, error: senderError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        email,
        access_token,
        refresh_token,
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

    if (!senderData.access_token) {
      return NextResponse.json({
        success: false,
        error: 'No access token found',
        suggestion: 'Re-authenticate the Gmail account'
      })
    }

    console.log(`🔑 Checking token info for ${testEmail}...`)

    // Use Google's tokeninfo endpoint to check token details
    const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${senderData.access_token}`)
    
    if (!tokenInfoResponse.ok) {
      const errorText = await tokenInfoResponse.text()
      return NextResponse.json({
        success: false,
        error: 'Token verification failed',
        details: errorText,
        suggestion: 'Token may be expired or invalid'
      })
    }

    const tokenInfo = await tokenInfoResponse.json()

    // Check what scopes the token has
    const currentScopes = tokenInfo.scope ? tokenInfo.scope.split(' ') : []
    const requiredScopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]

    const missingScopes = requiredScopes.filter(scope => !currentScopes.includes(scope))
    const hasGmailSendScope = currentScopes.includes('https://www.googleapis.com/auth/gmail.send')

    return NextResponse.json({
      success: true,
      email: testEmail,
      token_info: {
        expires_in: tokenInfo.expires_in,
        client_id: tokenInfo.aud,
        user_id: tokenInfo.sub,
        email_verified: tokenInfo.email_verified
      },
      scopes: {
        current_scopes: currentScopes,
        required_scopes: requiredScopes,
        missing_scopes: missingScopes,
        has_gmail_send_scope: hasGmailSendScope,
        has_all_required: missingScopes.length === 0
      },
      diagnosis: hasGmailSendScope ? 
        '✅ Token has Gmail sending scope - issue may be elsewhere' :
        '❌ Token missing Gmail sending scope - re-authentication required',
      next_steps: hasGmailSendScope ? [
        '✅ Token has correct scopes',
        '🔍 Issue may be with OAuth client configuration',
        'Check Google Cloud Console settings'
      ] : [
        '❌ Token missing Gmail sending permissions',
        '🔄 User must re-authenticate to get new scopes',
        '1. Go to campaign dashboard sender tab',
        '2. Click "Connect Gmail" button',
        '3. Re-authorize with Gmail sending permissions'
      ]
    })

  } catch (error) {
    console.error('❌ Error verifying token scopes:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}