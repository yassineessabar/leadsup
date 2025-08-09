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

    // Get all integrations for the user
    const { data: integrations, error } = await supabaseAdmin
      .from("review_integrations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching integrations:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: integrations || [] })

  } catch (error) {
    console.error("Error in GET /api/integrations:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { platform, business_name, business_id, additional_data } = body

    if (!platform || !business_name) {
      return NextResponse.json({
        success: false,
        error: "Platform and business name are required"
      }, { status: 400 })
    }

    // Insert or update the integration (upsert)
    const { data: integration, error } = await supabaseAdmin
      .from("review_integrations")
      .upsert({
        user_id: userId,
        platform_name: platform,
        integration_status: "connected",
        business_name: business_name,
        business_id: business_id,
        additional_data: additional_data || null
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving integration:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Integration connected successfully",
      data: integration
    })

  } catch (error) {
    console.error("Error in POST /api/integrations:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    if (!platform) {
      return NextResponse.json({
        success: false,
        error: "Platform parameter is required"
      }, { status: 400 })
    }

    let deletedCustomers: any[] = []
    let deletedReviews: any[] = []

    // For Shopify, also delete associated customers
    if (platform === 'shopify') {
      const { error: customersError, data: deletedCustomersData } = await supabaseAdmin
        .from("customers")
        .delete()
        .eq("user_id", userId)
        .not("shopify_customer_id", "is", null)
        .select()

      if (customersError) {
        console.error("Error deleting Shopify customers:", customersError)
        // Continue even if customer deletion fails
      } else {
        deletedCustomers = deletedCustomersData || []
      }
    }

    // Delete all reviews associated with this platform for this user
    const { error: reviewsError, data: deletedReviewsData } = await supabaseAdmin
      .from("reviews")
      .delete()
      .eq("user_id", userId)
      .eq("platform", platform.charAt(0).toUpperCase() + platform.slice(1)) // Capitalize platform name (e.g., "google" -> "Google")
      .select()

    if (reviewsError) {
      console.error("Error deleting reviews:", reviewsError)
      // Continue with integration deletion even if review deletion fails
    } else {
      deletedReviews = deletedReviewsData || []
    }

    // Then delete the integration
    const { error: integrationError } = await supabaseAdmin
      .from("review_integrations")
      .delete()
      .eq("user_id", userId)
      .eq("platform_name", platform)

    if (integrationError) {
      console.error("Error deleting integration:", integrationError)
      return NextResponse.json({ success: false, error: integrationError.message }, { status: 500 })
    }

    const reviewCount = deletedReviews?.length || 0
    const customerCount = deletedCustomers?.length || 0

    return NextResponse.json({
      success: true,
      message: "Integration disconnected successfully",
      details: {
        integration_deleted: true,
        reviews_deleted: reviewCount,
        customers_deleted: customerCount,
        message: `Removed ${platform} integration${reviewCount > 0 ? `, ${reviewCount} associated reviews` : ''}${customerCount > 0 ? `, and ${customerCount} associated customers` : ''}`
      }
    })

  } catch (error) {
    console.error("Error in DELETE /api/integrations:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
