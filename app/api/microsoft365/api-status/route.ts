import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // For Microsoft 365, we don't need to check API enablement like Gmail
    // The Microsoft Graph API is automatically available for any Microsoft 365 account
    // We just check if the environment variables are configured
    const clientId = process.env.MICROSOFT365_CLIENT_ID
    const clientSecret = process.env.MICROSOFT365_CLIENT_SECRET

    const enabled = !!(clientId && clientSecret)

    return NextResponse.json({ 
      enabled,
      message: enabled 
        ? 'Microsoft 365 OAuth is configured and ready' 
        : 'Microsoft 365 OAuth environment variables not configured'
    })
  } catch (error) {
    console.error('Error checking Microsoft 365 API status:', error)
    return NextResponse.json({ 
      enabled: false,
      message: 'Error checking Microsoft 365 API status'
    }, { status: 500 })
  }
}