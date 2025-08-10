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

// GET - Check existing OAuth tokens in campaign_senders
export async function GET(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Debug API\"' } }
    )
  }

  try {
    console.log('🔍 Checking existing OAuth tokens in campaign_senders...')

    // Get all sender data with authentication info
    const { data: senders, error: sendersError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        email,
        name,
        auth_type,
        access_token,
        refresh_token,
        app_password,
        token_expires_at,
        oauth_config,
        is_active,
        created_at
      `)
      .eq('is_active', true)

    if (sendersError) {
      console.error('❌ Error fetching senders:', sendersError)
      return NextResponse.json({
        success: false,
        error: sendersError.message
      })
    }

    console.log(`✅ Found ${senders?.length || 0} active senders`)

    const analysis = senders?.map(sender => {
      let authStatus = 'No authentication'
      let canSendEmails = false

      if (sender.access_token && sender.refresh_token) {
        authStatus = 'OAuth2 tokens available'
        canSendEmails = true
      } else if (sender.app_password) {
        authStatus = 'App Password available'
        canSendEmails = true
      } else if (sender.access_token) {
        authStatus = 'Access token only (no refresh token)'
        canSendEmails = false
      }

      return {
        email: sender.email,
        name: sender.name,
        auth_type: sender.auth_type,
        auth_status: authStatus,
        can_send_emails: canSendEmails,
        has_access_token: !!sender.access_token,
        has_refresh_token: !!sender.refresh_token,
        has_app_password: !!sender.app_password,
        token_expires_at: sender.token_expires_at,
        created_at: sender.created_at,
        access_token_preview: sender.access_token ? 
          sender.access_token.substring(0, 20) + '...' : null
      }
    }) || []

    const summary = {
      total_senders: senders?.length || 0,
      ready_for_oauth: analysis.filter(s => s.has_access_token && s.has_refresh_token).length,
      ready_for_app_password: analysis.filter(s => s.has_app_password).length,
      ready_for_sending: analysis.filter(s => s.can_send_emails).length,
      needs_setup: analysis.filter(s => !s.can_send_emails).length
    }

    return NextResponse.json({
      success: true,
      summary: summary,
      senders: analysis,
      recommendations: {
        oauth_ready: summary.ready_for_oauth > 0 ? 
          `${summary.ready_for_oauth} senders have OAuth tokens and can send emails immediately` :
          'No OAuth tokens found',
        app_password_ready: summary.ready_for_app_password > 0 ?
          `${summary.ready_for_app_password} senders have App Passwords configured` :
          'No App Passwords configured',
        next_action: summary.ready_for_sending > 0 ?
          'Test email sending with existing authentication' :
          'Set up authentication for senders'
      },
      test_command: summary.ready_for_sending > 0 ?
        'curl -u "admin:password" -X POST http://localhost:3000/api/campaigns/automation/send-emails' :
        'curl -u "admin:password" "http://localhost:3000/api/auth/gmail-oauth?email=essabar.yassine@gmail.com"'
    })

  } catch (error) {
    console.error('❌ Error checking existing tokens:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}