import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/gmail-auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    // Check for errors or missing parameters
    if (error) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'GMAIL_AUTH_ERROR',
                error: '${error}'
              }, window.location.origin);
              window.close();
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    if (!code || state !== 'gmail_oauth') {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'GMAIL_AUTH_ERROR',
                error: 'Invalid OAuth callback parameters'
              }, window.location.origin);
              window.close();
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/gmail/oauth-callback`

    if (!clientId || !clientSecret) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'GMAIL_AUTH_ERROR',
                error: 'Google OAuth not properly configured'
              }, window.location.origin);
              window.close();
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens = await tokenResponse.json()

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info')
    }

    const userInfo = await userInfoResponse.json()

    // Get current user ID from session
    const userId = await getCurrentUserId()
    if (!userId) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'GMAIL_AUTH_ERROR',
                error: 'User not authenticated'
              }, window.location.origin);
              window.close();
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    // First check if user exists
    const { data: userData, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (userError || !userData) {
      console.error('User not found in users table:', userId)
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'GMAIL_AUTH_ERROR',
                error: 'User not found. Please try logging in again.'
              }, window.location.origin);
              window.close();
            </script>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    // Check if account already exists
    const { data: existingAccount } = await supabaseServer
      .from('gmail_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('email', userInfo.email)
      .single()

    if (existingAccount) {
      // Update existing account
      const { error: updateError } = await supabaseServer
        .from('gmail_accounts')
        .update({
          name: userInfo.name,
          profile_picture: userInfo.picture,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || existingAccount.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id)

      if (updateError) {
        console.error('Database update error:', updateError)
        
        // If profile_picture column doesn't exist, try update without it
        if (updateError.message?.includes('profile_picture')) {
          console.log('Profile picture column not found, updating without it')
          const { error: fallbackUpdateError } = await supabaseServer
            .from('gmail_accounts')
            .update({
              name: userInfo.name,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token || existingAccount.refresh_token,
              expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAccount.id)
          
          if (fallbackUpdateError) {
            console.error('Fallback update error:', fallbackUpdateError)
            return new NextResponse(`
              <html>
                <body>
                  <script>
                    window.opener.postMessage({
                      type: 'GMAIL_AUTH_ERROR',
                      error: 'Failed to update account'
                    }, window.location.origin);
                    window.close();
                  </script>
                </body>
              </html>
            `, { headers: { 'Content-Type': 'text/html' } })
          }
        } else {
          return new NextResponse(`
            <html>
              <body>
                <script>
                  window.opener.postMessage({
                    type: 'GMAIL_AUTH_ERROR',
                    error: 'Failed to update account'
                  }, window.location.origin);
                  window.close();
                </script>
              </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } })
        }
      }
    } else {
      // Insert new account
      const { error: dbError } = await supabaseServer
        .from('gmail_accounts')
        .insert({
          user_id: userId,
          email: userInfo.email,
          name: userInfo.name,
          profile_picture: userInfo.picture,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (dbError) {
        console.error('Database error:', dbError)
        
        // Check for specific errors
        if (dbError.code === '23503') {
          // Foreign key violation
          return new NextResponse(`
            <html>
              <body>
                <script>
                  window.opener.postMessage({
                    type: 'GMAIL_AUTH_ERROR',
                    error: 'Database configuration error. Please run the database migration.'
                  }, window.location.origin);
                  window.close();
                </script>
              </body>
            </html>
          `, { headers: { 'Content-Type': 'text/html' } })
        }
        
        return new NextResponse(`
          <html>
            <body>
              <script>
                window.opener.postMessage({
                  type: 'GMAIL_AUTH_ERROR',
                  error: 'Failed to save account'
                }, window.location.origin);
                window.close();
              </script>
            </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } })
      }
    }

    // Success - send message to parent window
    return new NextResponse(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'GMAIL_AUTH_SUCCESS',
              account: {
                email: '${userInfo.email}',
                name: '${userInfo.name}'
              }
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } })

  } catch (error) {
    console.error('OAuth callback error:', error)
    return new NextResponse(`
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'GMAIL_AUTH_ERROR',
              error: 'OAuth callback failed'
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } })
  }
}