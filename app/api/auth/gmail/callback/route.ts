import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
)

// GET - Handle Gmail OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.log('❌ Gmail OAuth error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/senders?error=oauth_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/senders?error=missing_params`)
  }

  try {
    // Parse state to get email and campaign info
    const stateData = JSON.parse(state)
    const { email, campaign_id } = stateData

    console.log(`🔐 Processing Gmail OAuth callback for: ${email}`)

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.refresh_token || !tokens.access_token) {
      console.log('❌ Missing tokens in OAuth response')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/senders?error=missing_tokens`)
    }

    // Verify the authenticated email matches
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()
    
    if (userInfo.data.email !== email) {
      console.log(`❌ Email mismatch: expected ${email}, got ${userInfo.data.email}`)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/senders?error=email_mismatch`)
    }

    // Save OAuth credentials to database
    const { error: updateError } = await supabaseServer
      .from('campaign_senders')
      .update({
        auth_type: 'oauth',
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000),
        updated_at: new Date().toISOString()
      })
      .eq('email', email)

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/senders?error=save_failed`)
    }

    console.log(`✅ Gmail OAuth setup complete for: ${email}`)

    // Redirect back to settings with success message
    const redirectUrl = campaign_id 
      ? `${process.env.NEXTAUTH_URL}/campaigns/${campaign_id}/senders?success=oauth_complete&email=${encodeURIComponent(email)}`
      : `${process.env.NEXTAUTH_URL}/settings/senders?success=oauth_complete&email=${encodeURIComponent(email)}`

    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('❌ Gmail OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/senders?error=oauth_failed`)
  }
}