import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      return null
    }

    return data.user_id
  } catch (error) {
    console.error("Error in getUserIdFromSession:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get date range from query params (default to last 30 days)
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get("days") || "30")
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // First get the user's review link to filter click tracking
    const { data: reviewLinkData } = await supabase
      .from("review_link")
      .select("review_url")
      .eq("user_id", userId)
      .single()

    const reviewLinkId = reviewLinkData?.review_url?.split('/').pop()

    // Fetch all data in parallel for performance
    const [
      customersResult,
      reviewRequestsResult,
      clickTrackingResult,
      reviewsResult,
      reviewLinkResult
    ] = await Promise.all([
      // Get all customers
      supabase
        .from("customers")
        .select("*")
        .eq("user_id", userId),

      // Get review requests
      supabase
        .from("review_requests")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString()),

      // Get click tracking data
      supabase
        .from("click_tracking")
        .select("*")
        .gte("timestamp", startDate.toISOString()),

      // Get reviews
      supabase
        .from("reviews")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString()),

      // Get review link settings
      supabase
        .from("review_links")
        .select("enabled_platforms")
        .eq("user_id", userId)
        .single()
    ])

    const customers = customersResult.data || []
    const reviewRequests = reviewRequestsResult.data || []
    const allClickData = clickTrackingResult.data || []
    const reviews = reviewsResult.data || []
    const enabledPlatforms = reviewLinkResult.data?.enabled_platforms || []

    // Filter click data to include:
    // 1. Visits from this user's customers
    // 2. Anonymous visits to this user's review link
    const customerIds = customers.map(c => c.id)
    const clickData = allClickData.filter(click => {
      // Include if it's from a known customer
      if (customerIds.includes(click.customer_id)) {
        return true
      }

      // Include if it's an anonymous visit to this user's review link
      if (reviewLinkId && click.customer_id?.startsWith('anon_') &&
          click.page?.includes(`/r/${reviewLinkId}`)) {
        return true
      }

      return false
    })

    // Calculate statistics
    const stats = {
      // Customer Stats
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.status === 'active').length,

      // Request Stats
      totalRequestsSent: reviewRequests.length,
      emailsSent: reviewRequests.filter(r => r.type === 'email').length,
      smsSent: reviewRequests.filter(r => r.type === 'sms').length,

      // Engagement Stats
      uniquePageVisitors: new Set(clickData.filter(c => c.event_type === 'page_visit').map(c => c.customer_id)).size,
      totalPageVisits: clickData.filter(c => c.event_type === 'page_visit').length,

      // Anonymous vs Customer breakdown
      anonymousVisits: clickData.filter(c => c.event_type === 'page_visit' && c.customer_id?.startsWith('anon_')).length,
      customerVisits: clickData.filter(c => c.event_type === 'page_visit' && !c.customer_id?.startsWith('anon_')).length,

      // Rating Stats
      customersWhoRated: new Set(clickData.filter(c => c.event_type === 'star_selection').map(c => c.customer_id)).size,
      starSelections: clickData.filter(c => c.event_type === 'star_selection'),
      averageRating: calculateAverageRating(clickData.filter(c => c.event_type === 'star_selection')),
      ratingDistribution: getRatingDistribution(clickData.filter(c => c.event_type === 'star_selection')),

      // Platform Click Stats
      platformClicks: clickData.filter(c => c.event_type === 'platform_redirect'),
      platformClicksByType: getPlatformClicksByType(clickData.filter(c => c.event_type === 'platform_redirect')),
      customersWhoClickedPlatform: new Set(clickData.filter(c => c.event_type === 'platform_redirect').map(c => c.customer_id)).size,
      totalPlatformClicks: clickData.filter(c => c.event_type === 'platform_redirect').length,
      anonymousPlatformClicks: clickData.filter(c => c.event_type === 'platform_redirect' && c.customer_id?.startsWith('anon_')).length,

      // Review Stats
      totalReviews: reviews.length,
      reviewsByPlatform: getReviewsByPlatform(reviews),
      repliedReviews: reviews.filter(r => r.replied || r.status === 'replied').length,

      // Conversion Funnel
      conversionFunnel: {
        sent: reviewRequests.length,
        opened: new Set(clickData.filter(c => c.event_type === 'page_visit').map(c => c.customer_id)).size,
        rated: new Set(clickData.filter(c => c.event_type === 'star_selection').map(c => c.customer_id)).size,
        clickedPlatform: new Set(clickData.filter(c => c.event_type === 'platform_redirect').map(c => c.customer_id)).size,
        leftReview: new Set(reviews.map(r => r.customer_email)).size
      },

      // Time-based stats for charts
      dailyStats: getDailyStats(clickData, reviewRequests, reviews, days),

      // Internal vs External
      internalFeedback: clickData.filter(c => c.event_type === 'star_selection' && c.star_rating && c.star_rating <= 3).length,
      externalRedirects: clickData.filter(c => c.event_type === 'star_selection' && c.star_rating && c.star_rating >= 4).length,

      // Enabled platforms
      enabledPlatforms,

      // Response rates
      responseRate: reviewRequests.length > 0
        ? ((new Set(clickData.filter(c => c.event_type === 'page_visit').map(c => c.customer_id)).size / reviewRequests.length) * 100).toFixed(1)
        : 0,
      ratingRate: reviewRequests.length > 0
        ? ((new Set(clickData.filter(c => c.event_type === 'star_selection').map(c => c.customer_id)).size / reviewRequests.length) * 100).toFixed(1)
        : 0,
      reviewRate: reviewRequests.length > 0
        ? ((new Set(reviews.map(r => r.customer_email)).size / reviewRequests.length) * 100).toFixed(1)
        : 0
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error("Error in GET /api/dashboard-stats:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

function calculateAverageRating(starSelections: any[]): number {
  if (starSelections.length === 0) return 0
  const sum = starSelections.reduce((acc, curr) => acc + (curr.star_rating || 0), 0)
  return parseFloat((sum / starSelections.length).toFixed(1))
}

function getRatingDistribution(starSelections: any[]): Record<string, number> {
  const distribution: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0
  }

  starSelections.forEach(selection => {
    if (selection.star_rating) {
      distribution[selection.star_rating.toString()]++
    }
  })

  return distribution
}

function getPlatformClicksByType(platformClicks: any[]): Record<string, number> {
  const clicks: Record<string, number> = {}

  platformClicks.forEach(click => {
    const platform = click.redirect_platform || 'unknown'
    clicks[platform] = (clicks[platform] || 0) + 1
  })

  return clicks
}

function getReviewsByPlatform(reviews: any[]): Record<string, number> {
  const reviewCount: Record<string, number> = {}

  reviews.forEach(review => {
    const platform = review.platform || 'unknown'
    reviewCount[platform] = (reviewCount[platform] || 0) + 1
  })

  return reviewCount
}

function getDailyStats(clickData: any[], requests: any[], reviews: any[], days: number): any[] {
  const dailyData: any[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const dayRequests = requests.filter(r => {
      const reqDate = new Date(r.created_at)
      return reqDate >= date && reqDate < nextDate
    })

    const dayClicks = clickData.filter(c => {
      const clickDate = new Date(c.timestamp)
      return clickDate >= date && clickDate < nextDate
    })

    const dayReviews = reviews.filter(r => {
      const revDate = new Date(r.created_at)
      return revDate >= date && revDate < nextDate
    })

    dailyData.push({
      date: date.toISOString().split('T')[0],
      requests: dayRequests.length,
      visits: dayClicks.filter(c => c.event_type === 'page_visit').length,
      ratings: dayClicks.filter(c => c.event_type === 'star_selection').length,
      platformClicks: dayClicks.filter(c => c.event_type === 'platform_redirect').length,
      reviews: dayReviews.length
    })
  }

  return dailyData
}