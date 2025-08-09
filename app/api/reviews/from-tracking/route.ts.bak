import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create service role client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customer_id,
      event_type,
      star_rating,
      redirect_platform,
      page,
      available_platforms
    } = body

    // Validate required fields
    if (!customer_id || !event_type) {
      console.error('❌ Missing required fields:', { customer_id, event_type })
      return NextResponse.json(
        { success: false, error: "Missing customer_id or event_type" },
        { status: 400 }
      )
    }

    // Extract review URL ID from page path, removing query parameters
    const pathPart = page?.split('/r/')[1]
    const reviewUrlId = pathPart?.split('?')[0] // Remove query parameters
    if (!reviewUrlId) {
      console.error('❌ Could not extract review URL ID from page:', page)
      return NextResponse.json(
        { success: false, error: "Invalid review URL" },
        { status: 400 }
      )
    }

    // Get review link and user data
    const { data: reviewLink, error: reviewLinkError } = await supabaseAdmin
      .from("review_link")
      .select(`
        *,
        users (
          id,
          company,
          notification_email,
          email
        )
      `)
      .like("review_url", `%/r/${reviewUrlId}`)
      .single()

    if (reviewLinkError || !reviewLink) {
      console.error('❌ Review link not found:', reviewLinkError?.message)
      return NextResponse.json(
        { success: false, error: "Review link not found" },
        { status: 404 }
      )
    }

    let customerName = "Anonymous Visitor"
    let customerEmail = "noreply@anonymous.com"
    let isAnonymous = true

    // Check if customer_id contains "anon" to determine if anonymous
    if (!customer_id.includes("anon")) {
      // Get real customer data
      const { data: customer, error: customerError } = await supabaseAdmin
        .from("customers")
        .select("name, email, phone")
        .eq("id", customer_id)
        .eq("user_id", reviewLink.user_id)
        .single()

      if (!customerError && customer) {
        customerName = customer.name || customerName
        customerEmail = customer.email || customerEmail
        isAnonymous = false
        `)
      } else {
        }
    } else {
      }

    // Determine what to save based on event type
    let reviewData: any = {
      user_id: reviewLink.user_id,
      customer_id: customer_id,
      customer_name: customerName,
      customer_email: customerEmail,
      platform: "internal",
      status: "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (event_type === "star_selection" && star_rating) {
      // For star selection, try to use the first available platform or default to internal
      let platformToUse = "internal"
      let platformsToCheck = []

      // First try to use the available_platforms from the request
      if (available_platforms && Array.isArray(available_platforms) && available_platforms.length > 0) {
        platformsToCheck = available_platforms
        } else {
        // Fallback: check the review link's enabled platforms and URLs
        if (reviewLink.enabled_platforms && Array.isArray(reviewLink.enabled_platforms)) {
          // Check which platforms are enabled (even if URLs are empty, we'll use the platform name)
          if (reviewLink.enabled_platforms.includes('Google')) {
            platformsToCheck.push('google')
            if (!reviewLink.google_review_link) {
              }
          }
          if (reviewLink.enabled_platforms.includes('Trustpilot')) {
            platformsToCheck.push('trustpilot')
            if (!reviewLink.trustpilot_review_link) {
              }
          }
          if (reviewLink.enabled_platforms.includes('Facebook')) {
            platformsToCheck.push('facebook')
            if (!reviewLink.facebook_review_link) {
              }
          }
          }
      }

      if (platformsToCheck.length > 0) {
        // Use the first available platform (prioritize Google, then others)
        const preferredOrder = ['google', 'trustpilot', 'facebook']
        platformToUse = preferredOrder.find(p => platformsToCheck.includes(p)) || platformsToCheck[0]
      }

      reviewData = {
        ...reviewData,
        rating: star_rating,
        comment: `Customer selected ${star_rating} star${star_rating !== 1 ? 's' : ''}`,
        platform: platformToUse
      }
      } else if (event_type === "platform_redirect" && redirect_platform) {
      // For platform redirect, get the most recent star rating for this customer
      const { data: recentRating } = await supabaseAdmin
        .from("click_tracking")
        .select("star_rating")
        .eq("customer_id", customer_id)
        .eq("event_type", "star_selection")
        .not("star_rating", "is", null)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single()

      const rating = star_rating || recentRating?.star_rating

      if (rating) {
        reviewData = {
          ...reviewData,
          rating: rating,
          comment: `Customer gave ${rating} star${rating !== 1 ? 's' : ''} and was redirected to ${redirect_platform}`,
          platform: redirect_platform // Use the actual platform they're going to
        }
        } else {
        return NextResponse.json({
          success: true,
          message: "Event tracked but no rating found to create review"
        })
      }

    } else {
      // Don't save if we don't have enough information
      return NextResponse.json({
        success: true,
        message: "Event tracked but no review data to save"
      })
    }

    // Check if we already have a review for this customer and review link
    // For platform redirects, look for any existing review regardless of platform to update it
    const { data: existingReview } = await supabaseAdmin
      .from("reviews")
      .select("id, platform")
      .eq("user_id", reviewLink.user_id)
      .eq("customer_id", customer_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (existingReview) {
      // Update existing review
      const { data: updatedReview, error: updateError } = await supabaseAdmin
        .from("reviews")
        .update({
          rating: reviewData.rating,
          comment: reviewData.comment,
          platform: reviewData.platform,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingReview.id)
        .select()
        .single()

      if (updateError) {
        console.error("❌ Error updating review:", updateError)
        return NextResponse.json(
          { success: false, error: "Failed to update review" },
          { status: 500 }
        )
      }

      // Schedule automation workflows for the updated review
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const schedulerResponse = await fetch(`${baseUrl}/api/automation/scheduler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewId: updatedReview.id
          })
        })

        if (schedulerResponse.ok) {
          const schedulerResult = await schedulerResponse.json()
          } else {
          console.error('❌ Failed to schedule automation for updated review:', await schedulerResponse.text())
        }
      } catch (automationError) {
        console.error('❌ Error scheduling automation for updated review:', automationError)
        // Don't fail the review update if automation fails
      }

      return NextResponse.json({
        success: true,
        data: {
          id: updatedReview.id,
          action: "updated",
          customer_type: isAnonymous ? "anonymous" : "known"
        }
      })
    } else {
      // Create new review
      const { data: savedReview, error: saveError } = await supabaseAdmin
        .from("reviews")
        .insert(reviewData)
        .select()
        .single()

      if (saveError) {
        console.error("❌ Error saving review:", saveError)
        return NextResponse.json(
          { success: false, error: "Failed to save review" },
          { status: 500 }
        )
      }

      // Schedule automation workflows for the new review
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const schedulerResponse = await fetch(`${baseUrl}/api/automation/scheduler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewId: savedReview.id
          })
        })

        if (schedulerResponse.ok) {
          const schedulerResult = await schedulerResponse.json()
          } else {
          console.error('❌ Failed to schedule automation:', await schedulerResponse.text())
        }
      } catch (automationError) {
        console.error('❌ Error scheduling automation:', automationError)
        // Don't fail the review creation if automation fails
      }

      return NextResponse.json({
        success: true,
        data: {
          id: savedReview.id,
          action: "created",
          customer_type: isAnonymous ? "anonymous" : "known"
        }
      })
    }

  } catch (error) {
    console.error("Error in POST /api/reviews/from-tracking:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}