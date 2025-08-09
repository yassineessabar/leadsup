import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Use Google Discovery API to check if Gmail API is enabled
    const projectId = '529005365476' // Your Google Cloud project ID
    
    // Check Gmail API availability using a simple fetch to Google's APIs
    const response = await fetch(
      `https://gmail.googleapis.com/$discovery/rest?version=v1&key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (response.ok) {
      // If we can access the Gmail API discovery document, the API is enabled
      return NextResponse.json({ 
        enabled: true,
        message: 'Gmail API is enabled and available'
      })
    } else if (response.status === 403) {
      // 403 typically means the API is disabled
      const errorData = await response.text()
      
      if (errorData.includes('Gmail API has not been used') || 
          errorData.includes('disabled')) {
        return NextResponse.json({ 
          enabled: false,
          message: 'Gmail API is not enabled for this project'
        })
      }
    }

    // Alternative method: Try to create a Gmail client and make a simple call
    try {
      const { google } = await import('googleapis')
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/gmail/oauth-callback`
      )

      // Create Gmail client
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      
      // Try a simple API call that doesn't require authentication
      await gmail.users.getProfile({ userId: 'me' })
      
      // If no error about API being disabled, it's enabled
      return NextResponse.json({ 
        enabled: true,
        message: 'Gmail API is enabled'
      })
      
    } catch (error: any) {
      console.log('Gmail API check error:', error.message)
      
      // Check for specific API disabled errors
      if (error.message?.includes('Gmail API has not been used') || 
          error.message?.includes('disabled') ||
          (error.code === 403 && error.message?.includes('project'))) {
        return NextResponse.json({ 
          enabled: false,
          message: 'Gmail API is not enabled for this project'
        })
      }
      
      // Authentication errors (401) mean API is enabled but not authenticated
      if (error.code === 401 || error.message?.includes('unauthorized') || error.message?.includes('authentication')) {
        return NextResponse.json({ 
          enabled: true,
          message: 'Gmail API is enabled (authentication required)'
        })
      }
      
      // For other errors, assume API might be disabled
      return NextResponse.json({ 
        enabled: false,
        message: 'Unable to access Gmail API - likely not enabled'
      })
    }
    
  } catch (error: any) {
    console.error('Error checking Gmail API status:', error)
    return NextResponse.json({ 
      enabled: false,
      message: 'Error checking Gmail API status',
      error: error.message
    }, { status: 500 })
  }
}