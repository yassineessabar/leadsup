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

    // Get all customers for this user
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (customersError) {
      console.error("Error fetching customers:", customersError)
      return NextResponse.json(
        { success: false, error: "Failed to fetch customers" },
        { status: 500 }
      )
    }

    // Get all reviews for this user
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (reviewsError) {
      console.error("Error fetching reviews:", reviewsError)
      return NextResponse.json(
        { success: false, error: "Failed to fetch reviews" },
        { status: 500 }
      )
    }

    // Get click tracking data for all customers
    const customerIds = customers.map(c => c.id)
    const { data: clickData, error: clickError } = await supabase
      .from("click_tracking")
      .select("*")
      .in("customer_id", customerIds)
      .order("timestamp", { ascending: false })

    if (clickError) {
      console.error("Error fetching click data:", clickError)
    }

    // Process the data to create a combined view
    const combinedData = customers.map(customer => {
      // Get customer's click events
      const customerClicks = clickData?.filter(click => click.customer_id === customer.id) || []

      // Get page visits
      const pageVisits = customerClicks.filter(c => c.event_type === 'page_visit')
      const lastPageVisit = pageVisits[0]?.timestamp || null
      const totalPageVisits = pageVisits.length

      // Get star selections
      const starSelections = customerClicks.filter(c => c.event_type === 'star_selection')
      const lastStarRating = starSelections[0]?.star_rating || null
      const lastStarSelection = starSelections[0]?.timestamp || null

      // Get platform redirects
      const platformRedirects = customerClicks.filter(c => c.event_type === 'platform_redirect')
      const redirectPlatforms = [...new Set(platformRedirects.map(p => p.redirect_platform))]
      const lastPlatformRedirect = platformRedirects[0]

      // Get reviews from this customer
      const customerReviews = reviews.filter(review =>
        review.customer_email === customer.email ||
        review.customer_name === customer.name
      )

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        type: customer.type,
        status: customer.status,
        created_at: customer.created_at,

        // Activity data
        activity: {
          totalPageVisits,
          lastPageVisit,
          lastStarRating,
          lastStarSelection,
          redirectPlatforms,
          lastPlatformRedirect: lastPlatformRedirect ? {
            platform: lastPlatformRedirect.redirect_platform,
            timestamp: lastPlatformRedirect.timestamp
          } : null,
          hasActivity: customerClicks.length > 0
        },

        // Reviews data
        reviews: customerReviews.map(review => ({
          id: review.id,
          platform: review.platform,
          rating: review.rating,
          text: review.text,
          created_at: review.created_at,
          replied: review.replied || false
        })),
        totalReviews: customerReviews.length
      }
    })

    // Sort by most recent activity
    combinedData.sort((a, b) => {
      const aTime = a.activity.lastPageVisit || a.created_at
      const bTime = b.activity.lastPageVisit || b.created_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    return NextResponse.json({
      success: true,
      data: combinedData
    })

  } catch (error) {
    console.error("Error in GET /api/reviews-with-activity:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}