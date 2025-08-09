import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    // Get user from session using the same pattern as /api/auth/me
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Find session in Supabase
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    // Deactivate Shopify integration
    const { error } = await supabase
      .from('review_integrations')
      .update({
        integration_status: 'disconnected',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user_id)
      .eq('platform_name', 'shopify')

    if (error) {
      console.error('Error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to disconnect Shopify' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Shopify integration disconnected successfully'
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}