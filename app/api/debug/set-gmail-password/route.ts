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

// POST - Set Gmail App Password for essabar.yassine@gmail.com
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🔧 Setting Gmail App Password for essabar.yassine@gmail.com...')

    // Set the Gmail App Password
    const { error: updateError } = await supabaseServer
      .from('campaign_senders')
      .update({
        auth_type: 'app_password',
        app_password: 'yassisthebestofthecour'
      })
      .eq('email', 'essabar.yassine@gmail.com')

    if (updateError) {
      console.error('❌ Error updating password:', updateError)
      return NextResponse.json({
        success: false,
        error: updateError.message
      })
    }

    // Verify the update
    const { data: verifyData, error: verifyError } = await supabaseServer
      .from('campaign_senders')
      .select('email, auth_type, app_password')
      .eq('email', 'essabar.yassine@gmail.com')

    if (verifyError) {
      return NextResponse.json({
        success: false,
        error: 'Could not verify update'
      })
    }

    console.log('✅ Gmail App Password set successfully!')

    return NextResponse.json({
      success: true,
      message: 'Gmail App Password configured',
      updated_records: verifyData?.length || 0,
      sample_record: verifyData?.[0] ? {
        email: verifyData[0].email,
        auth_type: verifyData[0].auth_type,
        has_password: !!verifyData[0].app_password
      } : null,
      next_step: 'Test with: curl -u "admin:password" -X POST http://localhost:3001/api/campaigns/automation/send-emails'
    })

  } catch (error) {
    console.error('❌ Error setting Gmail password:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}