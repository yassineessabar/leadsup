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
    const { selectedPlatforms } = body

    // Validate input
    if (!selectedPlatforms || !Array.isArray(selectedPlatforms)) {
      return NextResponse.json({ success: false, error: "Selected platforms must be an array" }, { status: 400 })
    }

    // Update user record with selected platforms
    const { data, error } = await supabase
      .from("users")
      .update({
        selected_platforms: selectedPlatforms,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      console.error("❌ Error saving selected platforms:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("❌ Error in save-platforms API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}