import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

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

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "Google Maps API key not configured"
      }, { status: 500 })
    }

    // Get user's connected Google integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("review_integrations")
      .select("business_id, business_name, additional_data")
      .eq("user_id", userId)
      .eq("platform_name", "google")
      .eq("integration_status", "connected")
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({
        success: false,
        error: "No connected Google integration found"
      }, { status: 404 })
    }

    const placeId = integration.business_id
    if (!placeId) {
      return NextResponse.json({
        success: false,
        error: "No Google Place ID found for integration"
      }, { status: 400 })
    }

    // Fetch place details including reviews, sorted by newest first
    const placesUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,reviews,rating,user_ratings_total&reviews_sort=newest&key=${apiKey}`

    const response = await fetch(placesUrl)
    const data = await response.json()

    if (data.status === "OK") {
      const place = data.result
      const reviews = place.reviews || []

      // Sort reviews by time (newest first) to ensure we get the most recent ones
      const sortedReviews = reviews.sort((a: any, b: any) => b.time - a.time)

      // Transform Google reviews to match our Review interface
      const transformedReviews = sortedReviews.map((review: any, index: number) => {
        const baseReview = {
          // Don't include ID - let the database auto-generate UUID
          customer_name: review.author_name || "Anonymous",
          customer_email: "", // Google doesn't provide email
          rating: review.rating,
          title: "", // Google reviews don't have separate titles
          comment: review.text || "",
          platform: "Google",
          status: "published", // Google reviews are always published
          response: null, // We don't have responses yet
          helpful_count: 0,
          verified: true, // Google reviews are verified
          created_at: new Date(review.time * 1000).toISOString(), // Convert timestamp
        }

        // Only add fields if they might exist in the table
        try {
          return {
            ...baseReview,
            updated_at: new Date(review.time * 1000).toISOString(),
            user_id: userId,
            google_review_id: review.time.toString(), // Use timestamp as unique identifier
            author_url: review.author_url || null,
            profile_photo_url: review.profile_photo_url || null
          }
        } catch {
          // Fallback to basic review if extended fields fail
          return baseReview
        }
      })

      // Force database insertion attempt for debugging

      // Show the dates of the first few reviews to verify we're getting newest first
      if (transformedReviews.length > 0) {
        transformedReviews.slice(0, 3).forEach((review, i) => {
        })
      }

      // Store reviews in database for caching and management
      if (transformedReviews.length > 0) {
        try {

          // First, delete existing Google reviews for this user to avoid duplicates
          const { error: deleteError } = await supabaseAdmin
            .from("reviews")
            .delete()
            .eq("user_id", userId)
            .eq("platform", "Google")

          if (deleteError) {
            } else {
          }

          // Insert new reviews

          const { data: insertedData, error: insertError } = await supabaseAdmin
            .from("reviews")
            .insert(transformedReviews)
            .select()

          if (insertError) {
            console.error("Error inserting reviews:", insertError)
            throw insertError
          } else {
          }
        } catch (dbError) {
          console.error("Database error details:", dbError)
          console.error("Failed to cache reviews in database. Reviews will still be returned from API.")
          // Continue anyway, return the reviews from API
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          place_name: place.name,
          overall_rating: place.rating,
          total_ratings: place.user_ratings_total,
          reviews: transformedReviews
        },
        debug_info: {
          reviews_count: transformedReviews.length,
          user_id: userId,
          database_insertion_attempted: transformedReviews.length > 0
        }
      })
    } else {
      console.error("Google Places API error:", data.status, data.error_message)
      return NextResponse.json({
        success: false,
        error: data.error_message || "Failed to fetch place reviews"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error fetching Google Places reviews:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}