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

// POST - Update Gmail App Password with user-provided password
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    const body = await request.json()
    const { gmail_app_password, email } = body

    if (!gmail_app_password) {
      return NextResponse.json({
        success: false,
        error: 'gmail_app_password required',
        instructions: [
          '1. Go to Gmail → Settings → Security → 2-Step Verification',
          '2. Enable 2-Step Verification if not already enabled',
          '3. Go to App passwords',
          '4. Create password for "Mail"',
          '5. Copy the 16-character password (like "abcd efgh ijkl mnop")',
          '6. Use it with:',
          '   curl -u "admin:password" -X POST http://localhost:3001/api/debug/update-gmail-password',
          '   -H "Content-Type: application/json"',
          '   -d \'{"gmail_app_password":"your-real-16-char-password"}\''
        ]
      })
    }

    const targetEmail = email || 'essabar.yassine@gmail.com'

    console.log(`🔧 Updating Gmail App Password for ${targetEmail}...`)

    // Update the Gmail App Password
    const { error: updateError } = await supabaseServer
      .from('campaign_senders')
      .update({
        auth_type: 'app_password',
        app_password: gmail_app_password.replace(/\s/g, '') // Remove any spaces
      })
      .eq('email', targetEmail)

    if (updateError) {
      console.error('❌ Error updating password:', updateError)
      return NextResponse.json({
        success: false,
        error: updateError.message
      })
    }

    console.log('✅ Gmail App Password updated successfully!')

    return NextResponse.json({
      success: true,
      message: 'Gmail App Password updated',
      email: targetEmail,
      password_length: gmail_app_password.replace(/\s/g, '').length,
      next_steps: [
        '✅ Password updated in database',
        '',
        '🧪 Test email sending:',
        'curl -u "admin:password" -X POST http://localhost:3001/api/campaigns/automation/send-emails',
        '',
        'If it still fails:',
        '1. Double-check the App Password is exactly 16 characters',
        '2. Make sure 2-Step Verification is enabled', 
        '3. Try creating a new App Password',
        '4. Make sure you\'re using the Gmail account that created the App Password'
      ]
    })

  } catch (error) {
    console.error('❌ Error updating Gmail password:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}