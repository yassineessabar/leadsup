import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { accountId, to, subject, body } = await request.json()
    
    console.log('Test email request:', { accountId, to, subject })
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }
    
    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      )
    }
    
    if (!subject || !body) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      )
    }

    // Get Gmail account details
    const { data: account, error: accountError } = await supabaseServer
      .from('gmail_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (accountError) {
      console.error('Error fetching Gmail account:', accountError)
      return NextResponse.json(
        { error: `Failed to fetch Gmail account: ${accountError.message}` },
        { status: 500 }
      )
    }
    
    if (!account) {
      console.error('Gmail account not found for ID:', accountId)
      return NextResponse.json(
        { error: 'Gmail account not found' },
        { status: 404 }
      )
    }
    
    console.log('Gmail account found:', { email: account.email, hasRefreshToken: !!account.refresh_token })

    // Check if token needs refresh
    let accessToken = account.access_token
    const tokenExpired = new Date(account.expires_at) <= new Date()

    if (tokenExpired && account.refresh_token) {
      // Refresh the access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (tokenResponse.ok) {
        const newTokens = await tokenResponse.json()
        accessToken = newTokens.access_token

        // Update tokens in database
        await supabaseServer
          .from('gmail_accounts')
          .update({
            access_token: accessToken,
            expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', accountId)
      } else {
        return NextResponse.json(
          { error: 'Failed to refresh access token' },
          { status: 401 }
        )
      }
    }

    // Create email content
    const emailContent = [
      `From: ${account.email}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      body
    ].join('\r\n')

    // Send email via Gmail API
    console.log('Sending email via Gmail API...')
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      })
    })

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text()
      console.error('Gmail API error:', {
        status: gmailResponse.status,
        statusText: gmailResponse.statusText,
        error: errorText
      })
      
      // Parse error for better messaging
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          return NextResponse.json(
            { error: `Gmail API Error: ${errorJson.error.message}` },
            { status: gmailResponse.status }
          )
        }
      } catch (e) {
        // If not JSON, return raw error
      }
      
      return NextResponse.json(
        { error: `Failed to send email via Gmail (${gmailResponse.status})` },
        { status: 500 }
      )
    }

    const result = await gmailResponse.json()
    
    return NextResponse.json({ 
      success: true, 
      messageId: result.id 
    })

  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}