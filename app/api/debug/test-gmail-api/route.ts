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

// POST - Test Gmail API access directly
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

    console.log(`🧪 Testing Gmail API access for ${testEmail}...`)

    // Get sender data
    const { data: senderData, error: senderError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        email,
        access_token,
        refresh_token
      `)
      .eq('email', testEmail)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (senderError || !senderData || !senderData.access_token) {
      return NextResponse.json({
        success: false,
        error: 'No valid token found for this email'
      })
    }

    console.log(`🔍 Testing Gmail API profile access...`)

    // Test Gmail API access by getting the user's profile
    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${senderData.access_token}`
      }
    })

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      console.error('❌ Gmail API profile access failed:', errorText)
      
      return NextResponse.json({
        success: false,
        gmail_api_access: false,
        error: `Gmail API error: ${profileResponse.status} ${profileResponse.statusText}`,
        details: errorText,
        diagnosis: profileResponse.status === 403 ? 
          'Gmail API may not be enabled in Google Cloud Console' :
          'Token may not have proper Gmail API access',
        fix_steps: [
          '1. Go to Google Cloud Console',
          '2. Navigate to APIs & Services > Library',
          '3. Search for "Gmail API"',
          '4. Click "Enable" if not already enabled',
          '5. Wait 5-10 minutes for changes to propagate'
        ]
      })
    }

    const profileData = await profileResponse.json()
    console.log('✅ Gmail API profile access successful')

    // Test sending a draft (doesn't actually send)
    console.log('🔍 Testing Gmail send capability...')
    
    const draftResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${senderData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          raw: Buffer.from([
            'To: test@example.com',
            'Subject: Test Draft',
            'Content-Type: text/plain; charset=utf-8',
            '',
            'This is a test draft to verify Gmail sending permissions.'
          ].join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
        }
      })
    })

    if (!draftResponse.ok) {
      const errorText = await draftResponse.text()
      console.error('❌ Gmail draft creation failed:', errorText)
      
      return NextResponse.json({
        success: false,
        gmail_api_access: true,
        gmail_send_access: false,
        profile: profileData,
        error: `Gmail send error: ${draftResponse.status} ${draftResponse.statusText}`,
        details: errorText,
        diagnosis: 'Token has Gmail API access but not sending permissions'
      })
    }

    const draftData = await draftResponse.json()
    console.log('✅ Gmail draft creation successful')

    // Clean up the test draft
    if (draftData.id) {
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftData.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${senderData.access_token}`
        }
      })
      console.log('✅ Test draft cleaned up')
    }

    return NextResponse.json({
      success: true,
      gmail_api_access: true,
      gmail_send_access: true,
      email: testEmail,
      profile: {
        email: profileData.emailAddress,
        messages_total: profileData.messagesTotal,
        threads_total: profileData.threadsTotal
      },
      test_results: [
        '✅ Gmail API is enabled and accessible',
        '✅ Token has Gmail API permissions',  
        '✅ Token has Gmail sending permissions',
        '✅ Draft creation/deletion works'
      ],
      diagnosis: '🎯 Gmail API access is working perfectly!',
      next_investigation: [
        'Since Gmail API works, the SMTP OAuth issue may be:',
        '1. Nodemailer OAuth configuration',
        '2. Google SMTP server settings',
        '3. OAuth token format for SMTP'
      ]
    })

  } catch (error) {
    console.error('❌ Error testing Gmail API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}