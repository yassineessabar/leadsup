import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import type { Review } from "@/types/db"

// Create service role client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseAdmin
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rating = searchParams.get("rating")
    const platform = searchParams.get("platform")
    const query = searchParams.get("query")
    const includeIntegrations = searchParams.get("include_integrations") !== "false"

    // Fetch reviews from database first without joins to debug
    let dbQuery = supabaseAdmin
      .from("reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (rating && rating !== "all") {
      dbQuery = dbQuery.eq("rating", Number.parseInt(rating))
    }
    if (platform && platform !== "all") {
      dbQuery = dbQuery.ilike("platform", `%${platform}%`)
    }
    if (query) {
      dbQuery = dbQuery.or(`customer_name.ilike.%${query}%,comment.ilike.%${query}%,title.ilike.%${query}%`)
    }

    const { data: existingReviews, error } = await dbQuery

    if (error) {
      console.error("Error fetching reviews:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (existingReviews?.length) {
      }

    // Get unique customer IDs from reviews to fetch customer data
    const customerIds = [...new Set(
      (existingReviews || [])
        .map(review => review.customer_id)
        .filter(id => id && !id.includes('anon'))
    )]

    // Fetch customer data if we have customer IDs
    let customersData: any[] = []
    if (customerIds.length > 0) {
      const { data: customers, error: customersError } = await supabaseAdmin
        .from("customers")
        .select("id, name, email, phone")
        .in("id", customerIds)
        .eq("user_id", userId)

      if (!customersError && customers) {
        customersData = customers
        } else {
        console.error('❌ Error fetching customers:', customersError)
      }
    }

    // Create a lookup map for customers
    const customerLookup = customersData.reduce((acc, customer) => {
      acc[customer.id] = customer
      return acc
    }, {} as any)

    // Process reviews to use customer data when available
    let allReviews = (existingReviews || []).map(review => {
      const linkedCustomer = review.customer_id ? customerLookup[review.customer_id] : null

      return {
        ...review,
        // Use customer data if available, otherwise use stored customer_name/customer_email
        customer_name: linkedCustomer?.name || review.customer_name,
        customer_email: linkedCustomer?.email || review.customer_email,
        // Add a flag to indicate if this is linked to a real customer
        is_linked_customer: !!linkedCustomer
      }
    })

    // If include_integrations is true, also fetch from connected integrations
    if (includeIntegrations) {
      try {
        // Check for connected Google integration
        const { data: googleIntegration } = await supabaseAdmin
          .from("review_integrations")
          .select("business_id, integration_status")
          .eq("user_id", userId)
          .eq("platform_name", "google")
          .eq("integration_status", "connected")
          .single()

        if (googleIntegration && googleIntegration.business_id) {
          // Fetch Google reviews
          const googleResponse = await fetch(`${request.nextUrl.origin}/api/google-places/reviews`)
          if (googleResponse.ok) {
            const googleData = await googleResponse.json()
            if (googleData.success && googleData.data.reviews) {
              // Filter out reviews that already exist in database to avoid duplicates
              const existingGoogleIds = existingReviews
                .filter(r => r.platform === "Google")
                .map(r => r.google_review_id)

              const newGoogleReviews = googleData.data.reviews.filter((review: any) =>
                !existingGoogleIds.includes(review.google_review_id)
              )

              allReviews = [...allReviews, ...newGoogleReviews]
            }
          }
        }
      } catch (integrationError) {
        // Continue with existing reviews only
      }
    }

    // Apply filters to combined results
    if (rating && rating !== "all") {
      allReviews = allReviews.filter(review => review.rating === Number.parseInt(rating))
    }
    if (platform && platform !== "all") {
      allReviews = allReviews.filter(review =>
        review.platform.toLowerCase().includes(platform.toLowerCase())
      )
    }
    if (query) {
      const lowerQuery = query.toLowerCase()
      allReviews = allReviews.filter(review =>
        review.customer_name.toLowerCase().includes(lowerQuery) ||
        review.comment.toLowerCase().includes(lowerQuery) ||
        (review.title && review.title.toLowerCase().includes(lowerQuery))
      )
    }

    // Sort by created_at descending
    allReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ success: true, data: allReviews })
  } catch (error) {
    console.error("Error in GET /api/reviews:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { id, updates } = (await request.json()) as { id: string; updates: Partial<Review> }

    if (!id || !updates) {
      return NextResponse.json({ success: false, error: "Review ID and updates are required" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId) // Ensure user owns the review
      .select()
      .single()

    if (error) {
      console.error("Error updating review:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Review not found or not authorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/reviews:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { id } = (await request.json()) as { id: string }

    if (!id) {
      return NextResponse.json({ success: false, error: "Review ID is required" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("reviews")
      .delete()
      .eq("id", id)
      .eq("user_id", userId) // Ensure user owns the review

    if (error) {
      console.error("Error deleting review:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Review deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/reviews:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
