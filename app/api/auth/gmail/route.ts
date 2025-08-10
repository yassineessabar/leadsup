import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
)

// GET - Start Gmail OAuth flow
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const senderEmail = searchParams.get('email')
  const campaignId = searchParams.get('campaign_id')

  if (!senderEmail) {
    return NextResponse.json(
      { success: false, error: 'Email parameter required' },
      { status: 400 }
    )
  }

  console.log(`🔐 Starting Gmail OAuth for: ${senderEmail}`)

  // Generate OAuth URL
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/userinfo.email'
  ]

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: JSON.stringify({ 
      email: senderEmail,
      campaign_id: campaignId,
      timestamp: Date.now()
    })
  })

  return NextResponse.json({
    success: true,
    auth_url: authUrl,
    instructions: [
      "1. Click the authorization URL",
      "2. Sign in with your Gmail account", 
      "3. Grant email sending permissions",
      "4. You'll be redirected back automatically"
    ]
  })
}

// POST - Manual token setup (for advanced users)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, refresh_token, access_token, campaign_id } = body

    if (!email || !refresh_token) {
      return NextResponse.json(
        { success: false, error: 'Email and refresh_token required' },
        { status: 400 }
      )
    }

    console.log(`🔐 Setting up OAuth tokens for: ${email}`)

    // Test the tokens by getting user info
    oauth2Client.setCredentials({
      refresh_token: refresh_token,
      access_token: access_token
    })

    try {
      const { token } = await oauth2Client.getAccessToken()
      console.log(`✅ OAuth tokens valid for ${email}`)

      // Update sender with OAuth credentials
      const { error: updateError } = await supabaseServer
        .from('campaign_senders')
        .update({
          auth_type: 'oauth',
          refresh_token: refresh_token,
          access_token: token,
          token_expires_at: new Date(Date.now() + 3600000), // 1 hour
          updated_at: new Date().toISOString()
        })
        .eq('email', email)

      if (updateError) {
        console.error('❌ Database update error:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to save credentials' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `OAuth configured for ${email}`,
        auth_type: 'oauth',
        expires_in: 3600
      })

    } catch (tokenError) {
      console.error('❌ Invalid OAuth tokens:', tokenError)
      return NextResponse.json(
        { success: false, error: 'Invalid OAuth tokens' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Error in Gmail OAuth setup:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}