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

// POST - Add authentication columns and set up essabar.yassine with App Password
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🔧 Adding authentication columns to campaign_senders...')

    // First, check current table structure
    const { data: currentSenders, error: selectError } = await supabaseServer
      .from('campaign_senders')
      .select('email, name, is_active')
      .limit(5)

    if (selectError) {
      console.error('❌ Error reading current senders:', selectError)
      return NextResponse.json({
        success: false,
        error: 'Could not read current senders table'
      })
    }

    console.log(`✅ Found ${currentSenders?.length || 0} existing senders`)

    // Try to add authentication columns (this might fail if columns already exist)
    try {
      // Use raw SQL to add columns if they don't exist
      const { error: sqlError } = await supabaseServer.rpc('add_auth_columns_if_not_exist')
      
      if (sqlError && !sqlError.message?.includes('already exists')) {
        console.log('📝 Using direct update approach since RPC failed')
      }
    } catch (e) {
      console.log('📝 RPC not available, continuing with direct approach...')
    }

    // Set up essabar.yassine@gmail.com with default auth method
    const { error: updateError } = await supabaseServer
      .from('campaign_senders')
      .update({
        auth_type: 'app_password',
        // Note: User will need to add their actual Gmail App Password
        app_password: 'REPLACE_WITH_GMAIL_APP_PASSWORD'
      })
      .eq('email', 'essabar.yassine@gmail.com')

    if (updateError) {
      console.error('❌ Error updating essabar.yassine:', updateError)
      
      // If column doesn't exist, provide SQL command
      if (updateError.message?.includes('column') && updateError.message?.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'Authentication columns need to be added to database',
          sql_command: `
-- Run this SQL in Supabase dashboard:
ALTER TABLE campaign_senders 
ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) DEFAULT 'app_password',
ADD COLUMN IF NOT EXISTS app_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Then update with Gmail App Password:
UPDATE campaign_senders 
SET auth_type = 'app_password',
    app_password = 'your-16-character-gmail-app-password'
WHERE email = 'essabar.yassine@gmail.com';
          `
        })
      }
      
      return NextResponse.json({
        success: false,
        error: updateError.message
      })
    }

    // Verify the update worked
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

    console.log('✅ Successfully updated sender authentication')

    return NextResponse.json({
      success: true,
      message: 'Authentication setup initialized',
      updated_sender: verifyData?.[0] || null,
      next_steps: [
        '1. Get Gmail App Password for essabar.yassine@gmail.com:',
        '   - Gmail → Settings → Security → 2-Step Verification → App passwords',
        '   - Create password for "Mail"',
        '   - Copy the 16-character password',
        '',
        '2. Update the password in database:',
        '   UPDATE campaign_senders SET app_password = \'YOUR_16_CHAR_PASSWORD\'',
        '   WHERE email = \'essabar.yassine@gmail.com\';',
        '',
        '3. Test email sending:',
        '   curl -u "admin:password" -X POST http://localhost:3001/api/campaigns/automation/send-emails'
      ]
    })

  } catch (error) {
    console.error('❌ Error setting up authentication:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}