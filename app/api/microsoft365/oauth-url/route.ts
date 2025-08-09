import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get environment variables for Microsoft 365 OAuth
    const clientId = process.env.MICROSOFT365_CLIENT_ID
    const redirectUri = process.env.MICROSOFT365_REDIRECT_URI || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/microsoft365/oauth-callback`
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Microsoft 365 OAuth not configured. Please set MICROSOFT365_CLIENT_ID environment variable.' },
        { status: 500 }
      )
    }

    // Build OAuth URL with required scopes
    const scopes = [
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/offline_access'
    ]

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      response_mode: 'query',
      prompt: 'consent',
      state: 'microsoft365_oauth' // Add state for security
    })}`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating Microsoft 365 OAuth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 }
    )
  }
}