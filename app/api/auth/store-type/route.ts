import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeType } = body

    if (!storeType) {
      return NextResponse.json({ success: false, error: "Store type is required" }, { status: 400 })
    }

    const cookieStore = cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: "No active session found" }, { status: 401 })
    }

    // Get user ID from session
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (sessionError || !session) {
      console.error("❌ Error fetching session for store type update:", sessionError?.message)
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 })
    }

    const userId = session.user_id

    // Update the user's store_type
    const { error: updateError } = await supabase.from("users").update({ store_type: storeType }).eq("id", userId)

    if (updateError) {
      console.error("❌ Error updating store type:", updateError.message)
      return NextResponse.json({ success: false, error: "Failed to update store type" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Store type updated successfully" })
  } catch (error) {
    console.error("❌ Store type update error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
