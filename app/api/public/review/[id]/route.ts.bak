import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Simple in-memory cache for review data (5 minute TTL)
const reviewCache = new Map<string, { data: any; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Export function to invalidate cache - can be called from other routes
export function invalidateReviewCache(reviewId?: string) {
  if (reviewId) {
    const cacheKey = `review_${reviewId}`
    reviewCache.delete(cacheKey)
    } else {
    reviewCache.clear()
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: reviewId } = await params

    if (!reviewId) {
      return NextResponse.json({ success: false, error: "Review ID is required" }, { status: 400 })
    }

    // Check for cache bypass parameter
    const url = new URL(request.url)
    const bypassCache = url.searchParams.has('t') || url.searchParams.has('bypass_cache')

    // Check cache first (unless bypassing)
    const cacheKey = `review_${reviewId}`
    const cached = reviewCache.get(cacheKey)
    if (!bypassCache && cached && cached.expires > Date.now()) {
      const response = NextResponse.json({ success: true, data: cached.data })
      response.headers.set('X-Cache', 'HIT')
      // Reduced cache headers for cached responses too
      response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300')
      return response
    }

    // Optimized query - select only needed fields and add caching
    const { data: reviewLink, error } = await supabase
      .from("review_link")
      .select(`
        company_name,
        company_logo_url,
        primary_color,
        secondary_color,
        rating_page_content,
        redirect_message,
        internal_notification_message,
        video_upload_message,
        google_review_link,
        trustpilot_review_link,
        facebook_review_link,
        enabled_platforms,
        background_color,
        text_color,
        button_text_color,
        button_style,
        font,
        links,
        header_settings,
        initial_view_settings,
        negative_settings,
        video_upload_settings,
        success_settings,
        users!inner (
          profile_picture_url,
          bio,
          subscription_type,
          subscription_status,
          selected_platforms
        )
      `)
      .like("review_url", `%/r/${reviewId}`)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching review link:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!reviewLink) {
      return NextResponse.json({ success: false, error: "Review link not found" }, { status: 404 })
    }

    // Determine if branding should be shown based on subscription
    const userSubscription = reviewLink.users
    const shouldShowBranding = !userSubscription?.subscription_type ||
                              userSubscription.subscription_type === 'free' ||
                              userSubscription.subscription_status !== 'active'

    // Debug: Log the raw links data
    // Prepare response data
    const responseData = {
      company_name: reviewLink.company_name,
      company_logo_url: reviewLink.company_logo_url,
      profile_picture_url: reviewLink.users?.profile_picture_url || null,
      bio: reviewLink.users?.bio || null,
      primary_color: reviewLink.primary_color,
      secondary_color: reviewLink.secondary_color,
      show_powered_by: shouldShowBranding,
      rating_page_content: reviewLink.rating_page_content,
      redirect_message: reviewLink.redirect_message,
      internal_notification_message: reviewLink.internal_notification_message,
      video_upload_message: reviewLink.video_upload_message,
      google_review_link: reviewLink.google_review_link,
      trustpilot_review_link: reviewLink.trustpilot_review_link,
      facebook_review_link: reviewLink.facebook_review_link,
      shopify_review_link: null, // Temporarily set to null until DB field is added
      enabled_platforms: reviewLink.enabled_platforms,
      selected_platforms: reviewLink.users?.selected_platforms || [],
      background_color: reviewLink.background_color || "#F0F8FF",
      text_color: reviewLink.text_color || "#1F2937",
      button_text_color: reviewLink.button_text_color || "#FFFFFF",
      button_style: reviewLink.button_style || "rounded-full",
      font: reviewLink.font || "gothic-a1",
      links: reviewLink.links || [],
      header_settings: reviewLink.header_settings || { header: "Great to hear!", text: "Thank you for your feedback! Please click the button below to leave a review." },
      initial_view_settings: reviewLink.initial_view_settings || { header: "How was your experience at {{companyName}}?", text: "We'd love to hear about your experience with our service." },
      negative_settings: reviewLink.negative_settings || { header: "We're sorry to hear that.", text: "Please tell us how we can improve:" },
      video_upload_settings: reviewLink.video_upload_settings || { header: "Share your experience!", text: "Record a short video testimonial to help others learn about our service." },
      success_settings: reviewLink.success_settings || { header: "Thank you!", text: "Your feedback has been submitted successfully. We appreciate you taking the time to share your experience." },
    }

    // Cache the response data
    reviewCache.set(cacheKey, {
      data: responseData,
      expires: Date.now() + CACHE_TTL
    })

    // Cleanup old cache entries periodically
    if (reviewCache.size > 100) {
      const now = Date.now()
      for (const [key, value] of reviewCache.entries()) {
        if (value.expires < now) {
          reviewCache.delete(key)
        }
      }
    }

    // Return response with appropriate caching headers
    const response = NextResponse.json({ success: true, data: responseData })
    response.headers.set('X-Cache', bypassCache ? 'BYPASS' : 'MISS')

    if (bypassCache) {
      // No caching for bypass requests
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
    } else {
      // Reduced caching for normal requests
      response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300')
      response.headers.set('CDN-Cache-Control', 'public, max-age=120')
    }
    response.headers.set('Vary', 'Accept-Encoding')

    return response
  } catch (error) {
    console.error("Error in GET /api/public/review/[id]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}