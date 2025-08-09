import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { google } from "googleapis"

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

    // Get user's connected Google integration with OAuth tokens
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("review_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("platform_name", "google")
      .eq("integration_status", "connected")
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({
        success: false,
        error: "No connected Google OAuth integration found. Please connect via OAuth first."
      }, { status: 404 })
    }

    // Check if we have OAuth tokens
    if (!integration.access_token || !integration.refresh_token) {
      return NextResponse.json({
        success: false,
        error: "OAuth tokens not found. Please reconnect your Google account."
      }, { status: 401 })
    }

    // Set up OAuth client with tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`
    )

    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token
    })

    // Check if token is expired and refresh if needed
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken()
      oauth2Client.setCredentials(credentials)

      // Update tokens in database
      await supabaseAdmin
        .from("review_integrations")
        .update({
          access_token: credentials.access_token,
          token_expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null
        })
        .eq("id", integration.id)
    }

    // Get business accounts from additional_data
    const businessAccounts = integration.additional_data?.businessAccounts || []

    if (businessAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No Google Business accounts found. Please ensure you have a Google Business Profile."
      }, { status: 404 })
    }

    // Use the first business account
    const accountName = businessAccounts[0].name

    // Initialize Google My Business API
    const mybusiness = google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2Client })

    // First, get the locations for this account
    const locationsResponse = await mybusiness.accounts.locations.list({
      parent: accountName,
      pageSize: 100
    })

    const locations = locationsResponse.data.locations || []

    if (locations.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No locations found for this Google Business account."
      }, { status: 404 })
    }

    // Get reviews for the first location (or you could get for all locations)
    const locationName = locations[0].name

    // Use the reviews API
    const mybusinessreviews = google.mybusiness({ version: 'v4', auth: oauth2Client })

    let allReviews = []
    let nextPageToken = null
    let pageCount = 0
    const maxPages = 50 // Safety limit

    do {
      try {

        const reviewsResponse = await mybusinessreviews.accounts.locations.reviews.list({
          parent: locationName,
          pageSize: 50, // Maximum allowed by API
          pageToken: nextPageToken || undefined
        })

        const reviews = reviewsResponse.data.reviews || []
        allReviews = allReviews.concat(reviews)

        nextPageToken = reviewsResponse.data.nextPageToken
        pageCount++

      } catch (reviewError) {
        console.error("Error fetching reviews page:", reviewError)
        break
      }
    } while (nextPageToken && pageCount < maxPages)

    // Transform Google My Business reviews to match our Review interface
    const transformedReviews = allReviews.map((review: any) => ({
      customer_name: review.reviewer?.displayName || "Anonymous",
      customer_email: "", // GMB doesn't provide email
      rating: review.starRating === "FIVE" ? 5 :
              review.starRating === "FOUR" ? 4 :
              review.starRating === "THREE" ? 3 :
              review.starRating === "TWO" ? 2 :
              review.starRating === "ONE" ? 1 : 0,
      title: "", // GMB reviews don't have separate titles
      comment: review.comment || "",
      platform: "Google",
      status: "published",
      response: review.reviewReply?.comment || null,
      helpful_count: 0,
      verified: true,
      created_at: review.createTime || new Date().toISOString(),
      updated_at: review.updateTime || review.createTime || new Date().toISOString(),
      user_id: userId,
      google_review_id: review.reviewId,
      author_url: review.reviewer?.profilePhotoUrl || null,
      profile_photo_url: review.reviewer?.profilePhotoUrl || null
    }))

    // Store reviews in database
    if (transformedReviews.length > 0) {
      try {

        // First, delete existing Google reviews for this user
        const { error: deleteError } = await supabaseAdmin
          .from("reviews")
          .delete()
          .eq("user_id", userId)
          .eq("platform", "Google")

        if (deleteError) {
          }

        // Insert new reviews in batches
        const batchSize = 100
        for (let i = 0; i < transformedReviews.length; i += batchSize) {
          const batch = transformedReviews.slice(i, i + batchSize)

          const { error: insertError } = await supabaseAdmin
            .from("reviews")
            .insert(batch)
            .select()

          if (insertError) {
            console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError)
          } else {
          }
        }

      } catch (dbError) {
        console.error("Database error:", dbError)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        location_name: locations[0].locationName || locations[0].name,
        total_reviews: allReviews.length,
        reviews: transformedReviews,
        message: `Successfully fetched ALL ${allReviews.length} reviews using Google OAuth!`
      }
    })

  } catch (error) {
    console.error("Error fetching Google My Business reviews:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch reviews",
      details: error.response?.data || error
    }, { status: 500 })
  }
}