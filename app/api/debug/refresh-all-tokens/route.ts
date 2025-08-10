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

// POST - Refresh all OAuth tokens
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Debug API\"' } }
    )
  }

  try {
    console.log('🔄 Refreshing all OAuth tokens...')

    // Get all senders with refresh tokens
    const { data: senders, error: fetchError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        id,
        email,
        refresh_token,
        access_token,
        token_expires_at
      `)
      .not('refresh_token', 'is', null)
      .eq('is_active', true)

    if (fetchError) {
      console.error('❌ Error fetching senders:', fetchError)
      return NextResponse.json({
        success: false,
        error: fetchError.message
      })
    }

    const results = {
      refreshed: 0,
      failed: 0,
      errors: [] as any[]
    }

    for (const sender of senders || []) {
      try {
        console.log(`🔄 Refreshing token for ${sender.email}...`)

        // Try to refresh the token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: sender.refresh_token,
            grant_type: 'refresh_token'
          })
        })

        const refreshData = await refreshResponse.json()

        if (!refreshResponse.ok) {
          console.error(`❌ Failed to refresh ${sender.email}:`, refreshData)
          results.failed++
          results.errors.push({
            email: sender.email,
            error: refreshData.error || 'Token refresh failed'
          })
          continue
        }

        // Update the database with new token
        const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        
        const { error: updateError } = await supabaseServer
          .from('campaign_senders')
          .update({
            access_token: refreshData.access_token,
            token_expires_at: newExpiresAt,
            // Keep existing refresh_token unless we get a new one
            ...(refreshData.refresh_token ? { refresh_token: refreshData.refresh_token } : {}),
            updated_at: new Date().toISOString()
          })
          .eq('id', sender.id)

        if (updateError) {
          console.error(`❌ Failed to update ${sender.email}:`, updateError)
          results.failed++
          results.errors.push({
            email: sender.email,
            error: updateError.message
          })
          continue
        }

        console.log(`✅ Refreshed token for ${sender.email}`)
        results.refreshed++

      } catch (error) {
        console.error(`❌ Error refreshing ${sender.email}:`, error)
        results.failed++
        results.errors.push({
          email: sender.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`🎯 Token refresh complete: ${results.refreshed} refreshed, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      message: 'OAuth token refresh completed',
      summary: {
        total_senders: senders?.length || 0,
        refreshed: results.refreshed,
        failed: results.failed
      },
      errors: results.errors,
      next_steps: [
        '✅ OAuth tokens refreshed with latest scopes',
        results.refreshed > 0 ? 
          '🚀 Try sending emails now' :
          '⚠️ No tokens were refreshed - may need re-authentication',
        '',
        'Test command:',
        'curl -u "admin:password" -X POST http://localhost:3000/api/campaigns/automation/send-emails'
      ]
    })

  } catch (error) {
    console.error('❌ Error refreshing tokens:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}