import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = request.headers.get('x-client-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (clientIP) {
    return clientIP
  }

  return request.ip || 'unknown'
}

function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customer_id = searchParams.get('cid') || searchParams.get('customer_id')
    const redirectUrl = searchParams.get('url') || searchParams.get('redirect')
    const campaign = searchParams.get('campaign')
    const source = searchParams.get('source')

    // Validate required parameters
    if (!customer_id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID (cid) is required' },
        { status: 400 }
      )
    }

    if (!redirectUrl) {
      return NextResponse.json(
        { success: false, error: 'Redirect URL is required' },
        { status: 400 }
      )
    }

    // Validate customer_id format
    if (!/^[a-zA-Z0-9_-]+$/.test(customer_id) || customer_id.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer_id format' },
        { status: 400 }
      )
    }

    // Validate redirect URL (security check)
    try {
      const url = new URL(redirectUrl)
      // Optional: Add whitelist of allowed domains
      const allowedDomains = process.env.ALLOWED_REDIRECT_DOMAINS?.split(',') || []

      if (allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some(domain =>
          url.hostname === domain || url.hostname.endsWith('.' + domain)
        )

        if (!isAllowed) {
          return NextResponse.json(
            { success: false, error: 'Redirect URL not allowed' },
            { status: 400 }
          )
        }
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid redirect URL' },
        { status: 400 }
      )
    }

    // Get tracking data
    const ip_address = getClientIP(request)
    const user_agent = request.headers.get('user-agent') || ''
    const referrer = request.headers.get('referer') || ''
    const session_id = generateSessionId()

    // Track the click in background (don't wait for it)
    const trackingData = {
      customer_id: customer_id.substring(0, 100),
      page: `/redirect?${searchParams.toString()}`,
      user_agent: user_agent.substring(0, 1000),
      referrer: referrer.substring(0, 500),
      session_id,
      ip_address,
      timestamp: new Date().toISOString()
    }

    // Insert tracking data (async, don't block redirect)
    supabase
      .from('click_tracking')
      .insert(trackingData)
      .then(({ error }) => {
        if (error) {
          console.error('Error:', error)
        } else {
        }
      })
      .catch(error => {
        console.error('Error:', error)
      })

    // Create the final redirect URL with tracking parameters
    const finalUrl = new URL(redirectUrl)
    finalUrl.searchParams.set('cid', customer_id)
    if (campaign) finalUrl.searchParams.set('campaign', campaign)
    if (source) finalUrl.searchParams.set('source', source)
    finalUrl.searchParams.set('tracked', '1')

    // Redirect the user
    return NextResponse.redirect(finalUrl.toString(), 302)

  } catch (error) {
    console.error('Error:', error)

    // If there's an error, still try to redirect if we have a URL
    const { searchParams } = new URL(request.url)
    const redirectUrl = searchParams.get('url') || searchParams.get('redirect')

    if (redirectUrl) {
      try {
        return NextResponse.redirect(redirectUrl, 302)
      } catch (redirectError) {
        console.error('Redirect error:', redirectError)
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint for programmatic redirects
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_id, redirect_url, campaign, source, track_only } = body

    // Validate required fields
    if (!customer_id || !redirect_url) {
      return NextResponse.json(
        { success: false, error: 'customer_id and redirect_url are required' },
        { status: 400 }
      )
    }

    // Validate customer_id format
    if (!/^[a-zA-Z0-9_-]+$/.test(customer_id) || customer_id.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer_id format' },
        { status: 400 }
      )
    }

    // Get tracking data
    const ip_address = getClientIP(request)
    const user_agent = request.headers.get('user-agent') || ''
    const referrer = request.headers.get('referer') || ''
    const session_id = generateSessionId()

    // Track the click
    const trackingData = {
      customer_id: customer_id.substring(0, 100),
      page: track_only ? 'API-tracked' : `/redirect-api`,
      user_agent: user_agent.substring(0, 1000),
      referrer: referrer.substring(0, 500),
      session_id,
      ip_address,
      timestamp: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('click_tracking')
      .insert(trackingData)
      .select()

    if (error) {
      console.error('Error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save tracking data' },
        { status: 500 }
      )
    }

    // If track_only is true, just return the tracking result
    if (track_only) {
      return NextResponse.json({
        success: true,
        data: {
          id: data[0]?.id,
          tracked_at: data[0]?.timestamp
        }
      })
    }

    // Create the redirect URL with tracking parameters
    const finalUrl = new URL(redirect_url)
    finalUrl.searchParams.set('cid', customer_id)
    if (campaign) finalUrl.searchParams.set('campaign', campaign)
    if (source) finalUrl.searchParams.set('source', source)
    finalUrl.searchParams.set('tracked', '1')

    return NextResponse.json({
      success: true,
      redirect_url: finalUrl.toString(),
      tracking_id: data[0]?.id
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}