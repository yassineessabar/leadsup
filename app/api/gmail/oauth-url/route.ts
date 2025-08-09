import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get environment variables for Google OAuth
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/gmail/oauth-callback`
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID environment variable.' },
        { status: 500 }
      )
    }

    // Build OAuth URL with required scopes
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: 'gmail_oauth' // Add state for security
    })}`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating OAuth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 }
    )
  }
}