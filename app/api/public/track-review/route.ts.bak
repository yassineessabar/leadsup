import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      reviewUrlId,
      customerId,
      rating,
      platform
    } = body

    // Validate required fields
    if (!reviewUrlId || !rating) {
      console.error("Missing required fields")
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get review link data by URL pattern
    const { data: reviewLink, error: reviewLinkError } = await supabase
      .from("review_link")
      .select(`
        *,
        users (
          id,
          company
        )
      `)
      .like("review_url", `%/r/${reviewUrlId}`)
      .single()

    if (reviewLinkError || !reviewLink) {
      return NextResponse.json(
        { success: false, error: "Review link not found" },
        { status: 404 }
      )
    }

    // Save positive review to database
    const reviewData = {
      user_id: reviewLink.user_id,
      customer_name: customerId ? "Customer" : "Anonymous Visitor",
      customer_email: "",
      rating: rating,
      comment: `Gave ${rating} stars and was redirected to ${platform}`,
      platform: "internal",
      status: "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: savedReview, error: saveError } = await supabase
      .from("reviews")
      .insert(reviewData)
      .select()
      .single()

    if (saveError) {
      console.error("Error saving positive review:", saveError)
      return NextResponse.json({
        success: false,
        error: saveError.message,
        details: saveError
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: savedReview?.id,
        message: "Review tracked successfully"
      }
    })

  } catch (error) {
    console.error("Error in POST /api/public/track-review:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}