import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/gmail-auth'

async function refreshAccessToken(refreshToken: string, accountId: string) {
  const clientId = process.env.MICROSOFT365_CLIENT_ID
  const clientSecret = process.env.MICROSOFT365_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft 365 OAuth not configured')
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read https://graph.microsoft.com/offline_access'
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh access token')
  }

  const tokens = await response.json()

  // Update the database with new tokens
  await supabaseServer
    .from('microsoft365_accounts')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', accountId)

  return tokens.access_token
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId, to, subject, body } = await request.json()

    if (!accountId || !to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the Microsoft 365 account
    const { data: account, error: accountError } = await supabaseServer
      .from('microsoft365_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    let accessToken = account.access_token

    // Check if token is expired
    const expiresAt = new Date(account.expires_at)
    const now = new Date()
    
    if (expiresAt <= now) {
      try {
        accessToken = await refreshAccessToken(account.refresh_token, accountId)
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        return NextResponse.json({ error: 'Failed to refresh access token' }, { status: 401 })
      }
    }

    // Create email message
    const message = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: body
        },
        toRecipients: [{
          emailAddress: {
            address: to
          }
        }]
      }
    }

    // Send email via Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Microsoft Graph API error:', errorText)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully' 
    })

  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}