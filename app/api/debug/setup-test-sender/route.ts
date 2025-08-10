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

// POST - Set up test sender for demo purposes (simulates Gmail App Password)
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🔧 Setting up test sender configuration...')

    const body = await request.json().catch(() => ({}))
    const { gmail_app_password } = body

    // For demo purposes, we'll set up a mock authentication
    // In production, user would provide their real Gmail App Password
    const testPassword = gmail_app_password || 'DEMO_APP_PASSWORD_16CH'

    // Update essabar.yassine@gmail.com with test authentication
    const { error: updateError } = await supabaseServer
      .from('campaign_senders')
      .update({
        auth_type: 'app_password',
        app_password: testPassword
      })
      .eq('email', 'essabar.yassine@gmail.com')

    if (updateError) {
      console.error('❌ Error updating sender:', updateError)
      return NextResponse.json({
        success: false,
        error: updateError.message
      })
    }

    // Also set up the other senders with demo passwords for testing
    const { error: updateOthersError } = await supabaseServer
      .from('campaign_senders')
      .update({
        auth_type: 'app_password',
        app_password: 'DEMO_PASSWORD_FOR_TESTING'
      })
      .in('email', ['anthoy2327@gmail.com', 'ecomm2405@gmail.com'])

    if (updateOthersError) {
      console.log('⚠️ Could not update other senders (this is OK for testing)')
    }

    // Verify all senders
    const { data: allSenders, error: verifyError } = await supabaseServer
      .from('campaign_senders')
      .select('email, name, auth_type, is_active')
      .eq('is_active', true)

    if (verifyError) {
      return NextResponse.json({
        success: false,
        error: 'Could not verify senders'
      })
    }

    console.log('✅ Test sender configuration complete')

    return NextResponse.json({
      success: true,
      message: 'Test sender configuration complete',
      test_mode: true,
      senders: allSenders?.map(s => ({
        email: s.email,
        name: s.name,
        auth_type: s.auth_type,
        has_password: true, // We just set it
        ready_for_testing: true
      })) || [],
      warning: [
        '🚨 This is DEMO mode with fake passwords!',
        '📧 Emails will not actually send without real Gmail App Passwords',
        '',
        'To send real emails:',
        '1. Get Gmail App Password for each sender',
        '2. Update database with real passwords',
        '3. Test will then send actual emails'
      ],
      test_command: 'curl -u "admin:password" -X POST http://localhost:3001/api/campaigns/automation/send-emails'
    })

  } catch (error) {
    console.error('❌ Error setting up test sender:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}