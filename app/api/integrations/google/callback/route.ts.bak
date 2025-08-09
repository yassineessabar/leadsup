import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { google } from "googleapis"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This contains the user_id
    const error = searchParams.get('error')

    if (error) {
      console.error("OAuth error:", error)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?integration_error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?integration_error=missing_code_or_state`)
    }

    const userId = state

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user profile info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()

    // Get Google My Business accounts
    const mybusiness = google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2Client })
    let businessAccounts = []

    try {
      const accountsResponse = await mybusiness.accounts.list()
      businessAccounts = accountsResponse.data.accounts || []
    } catch (businessError) {
      console.error("Error fetching business accounts:", businessError)
      // Continue without business accounts - user might not have any
    }

    // Store or update integration in database
    const integrationData = {
      user_id: userId,
      platform_name: 'google',
      integration_status: businessAccounts.length > 0 ? 'connected' : 'pending',
      business_name: businessAccounts.length > 0 ? businessAccounts[0].accountName : userInfo.data.name,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      business_id: businessAccounts.length > 0 ? businessAccounts[0].name : null,
      additional_data: {
        userInfo: {
          email: userInfo.data.email,
          name: userInfo.data.name,
          picture: userInfo.data.picture
        },
        businessAccounts: businessAccounts.map(account => ({
          name: account.name,
          accountName: account.accountName,
          type: account.type,
          state: account.state
        }))
      }
    }

    // Upsert integration record
    const { error: dbError } = await supabase
      .from("review_integrations")
      .upsert(integrationData, {
        onConflict: 'user_id,platform_name'
      })

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?integration_error=database_error`)
    }

    // Redirect back to dashboard with success
    const successParams = new URLSearchParams({
      integration_success: 'google',
      business_count: businessAccounts.length.toString()
    })

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?${successParams.toString()}`)

  } catch (error) {
    console.error("Error in Google OAuth callback:", error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?integration_error=callback_error`)
  }
}