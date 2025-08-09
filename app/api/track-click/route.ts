import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Rate limiting helper
const rateLimitMap = new Map()

function isRateLimited(ip: string, customerId: string): boolean {
  const key = `${ip}-${customerId}`
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 10 // Max 10 clicks per minute per IP+customer combo

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return false
  }

  const limit = rateLimitMap.get(key)
  if (now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return false
  }

  if (limit.count >= maxRequests) {
    return true
  }

  limit.count++
  return false
}

function getClientIP(request: NextRequest): string {
  // Check for the real IP in various headers (for proxies, load balancers)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customer_id,
      page,
      user_agent,
      referrer,
      session_id,
      event_type = 'page_visit',
      star_rating,
      redirect_platform,
      redirect_url,
      review_completed,
      additional_data
    } = body

    // customer_id is now optional - we'll generate a session ID for anonymous visits

    // For star_selection events, validate star rating
    if (event_type === 'star_selection' && (!star_rating || star_rating < 1 || star_rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'star_rating must be between 1 and 5 for star_selection events' },
        { status: 400 }
      )
    }

    // For platform_redirect events, validate redirect data
    if (event_type === 'platform_redirect' && (!redirect_platform || !redirect_url)) {
      console.error('Platform redirect validation failed:', {
        event_type,
        redirect_platform: redirect_platform || 'MISSING',
        redirect_url: redirect_url || 'MISSING',
        body
      })
      return NextResponse.json(
        { success: false, error: 'redirect_platform and redirect_url are required for platform_redirect events' },
        { status: 400 }
      )
    }

    // Validate customer_id format if provided (prevent injection)
    if (customer_id && (!/^[a-zA-Z0-9_-]+$/.test(customer_id) || customer_id.length > 100)) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer_id format' },
        { status: 400 }
      )
    }

    // Generate a unique session ID for anonymous visits if no customer_id
    const finalCustomerId = customer_id || `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // Get client IP
    const ip_address = getClientIP(request)

    // Rate limiting
    if (isRateLimited(ip_address, finalCustomerId)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Debug additional_data
    // Sanitize inputs
    const sanitizedData = {
      customer_id: finalCustomerId.substring(0, 100),
      page: page ? page.substring(0, 500) : `/event/${event_type}`,
      user_agent: user_agent ? user_agent.substring(0, 1000) : null,
      referrer: referrer ? referrer.substring(0, 500) : null,
      session_id: session_id ? session_id.substring(0, 100) : null,
      ip_address,
      timestamp: new Date().toISOString(),
      event_type: event_type.substring(0, 50),
      star_rating: star_rating || null,
      redirect_platform: redirect_platform ? redirect_platform.substring(0, 100) : null,
      redirect_url: redirect_url ? redirect_url.substring(0, 1000) : null,
      review_completed: review_completed || false,
      additional_data: additional_data ? JSON.stringify(additional_data) : null
    }

    // Insert into database (graceful degradation if table doesn't exist)
    let data = null
    try {
      const result = await supabase
        .from('click_tracking')
        .insert(sanitizedData)
        .select()

      if (result.error) {
        console.error('Click tracking database error (continuing anyway):', result.error)
        // Continue without failing - tracking is optional
        data = [{ id: `fallback_${Date.now()}`, timestamp: sanitizedData.timestamp }]
      } else {
        data = result.data
      }
    } catch (dbError) {
      console.error('Click tracking table may not exist (continuing anyway):', dbError)
      // Continue without failing - tracking is optional
      data = [{ id: `fallback_${Date.now()}`, timestamp: sanitizedData.timestamp }]
    }

    // After saving click tracking, call reviews API for star_selection and platform_redirect events
    let reviewResult = null
    if (event_type === 'star_selection' || event_type === 'platform_redirect') {
      try {
        // Call the reviews API via fetch to save the review
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const reviewResponse = await fetch(`${baseUrl}/api/reviews/from-tracking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: finalCustomerId,
            event_type,
            star_rating: sanitizedData.star_rating,
            redirect_platform: sanitizedData.redirect_platform,
            page: sanitizedData.page,
            available_platforms: additional_data?.available_platforms
          })
        })
        if (reviewResponse.ok) {
          reviewResult = await reviewResponse.json()
          } else {
          const errorText = await reviewResponse.text()
          console.error('✗ Failed to save review from tracking:', errorText)
        }
      } catch (reviewError) {
        console.error('✗ Error calling reviews API from tracking:', reviewError)
        // Don't fail the click tracking if review save fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data[0]?.id,
        tracked_at: data[0]?.timestamp,
        review_saved: reviewResult?.success || false,
        review_action: reviewResult?.data?.action,
        customer_type: reviewResult?.data?.customer_type
      }
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve click data for a specific customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customer_id = searchParams.get('customer_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!customer_id) {
      return NextResponse.json(
        { success: false, error: 'customer_id is required' },
        { status: 400 }
      )
    }

    // Validate customer_id format
    if (!/^[a-zA-Z0-9_-]+$/.test(customer_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer_id format' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('click_tracking')
      .select('*')
      .eq('customer_id', customer_id)
      .order('timestamp', { ascending: false })
      .limit(Math.min(limit, 1000)) // Max 1000 records

    if (error) {
      console.error('Error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve tracking data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total_clicks: data?.length || 0
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}