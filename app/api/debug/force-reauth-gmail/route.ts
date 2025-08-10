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

// POST - Force re-authentication by clearing OAuth tokens
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Debug API\"' } }
    )
  }

  try {
    console.log('🔄 Forcing Gmail re-authentication by clearing OAuth tokens...')

    // Clear all OAuth tokens to force re-authentication
    const { error: updateError, data: updatedRecords } = await supabaseServer
      .from('campaign_senders')
      .update({
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        expires_at: null,
        updated_at: new Date().toISOString()
      })
      .not('access_token', 'is', null) // Only update records that have tokens
      .select('email')

    if (updateError) {
      console.error('❌ Error clearing OAuth tokens:', updateError)
      return NextResponse.json({
        success: false,
        error: updateError.message
      })
    }

    console.log(`✅ Cleared OAuth tokens for ${updatedRecords?.length || 0} accounts`)

    return NextResponse.json({
      success: true,
      message: 'OAuth tokens cleared - users must re-authenticate',
      cleared_accounts: updatedRecords?.length || 0,
      affected_emails: updatedRecords?.map(r => r.email) || [],
      instructions: [
        '🔄 All OAuth tokens have been cleared',
        '📧 Users must re-authenticate their Gmail accounts',
        '',
        'Steps for users:',
        '1. Go to the sender tab in campaign dashboard',
        '2. Click "Connect Gmail" button',
        '3. Sign in and grant Gmail sending permissions',
        '4. New OAuth tokens will have Gmail.send scope',
        '',
        'After re-authentication, test with:',
        'curl -u "admin:password" -X POST http://localhost:3000/api/campaigns/automation/send-emails'
      ],
      oauth_scopes_now_include: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    })

  } catch (error) {
    console.error('❌ Error forcing re-authentication:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}