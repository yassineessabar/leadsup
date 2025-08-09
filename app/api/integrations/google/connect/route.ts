import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
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

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { business } = body

    if (!business || !business.name) {
      return NextResponse.json({
        success: false,
        error: "Business information is required"
      }, { status: 400 })
    }

    // Create integration record for Google connection
    const integrationData = {
      user_id: userId,
      platform_name: 'google',
      integration_status: 'connected',
      business_name: business.name,
      business_id: business.place_id,
      additional_data: {
        selectedBusiness: {
          place_id: business.place_id,
          name: business.name,
          formatted_address: business.formatted_address || "No address provided",
          rating: business.rating,
          user_ratings_total: business.user_ratings_total,
          types: business.types || [],
          connection_type: 'public_search'
        }
      }
    }

    // Upsert integration record
    const { error: dbError } = await supabase
      .from("review_integrations")
      .upsert(integrationData, {
        onConflict: 'user_id,platform_name'
      })

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({
        success: false,
        error: "Failed to save integration"
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Google business connected successfully",
      business: business
    })

  } catch (error) {
    console.error("Error in Google connect:", error)
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

    // Delete the Google integration
    const { error } = await supabase
      .from("review_integrations")
      .delete()
      .eq("user_id", userId)
      .eq("platform_name", "google")

    if (error) {
      console.error("Error deleting Google integration:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Google integration disconnected successfully"
    })

  } catch (error) {
    console.error("Error in DELETE Google connect:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}