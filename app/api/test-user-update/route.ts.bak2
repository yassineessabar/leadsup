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

    // Try a simple update
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update({
        company: "Test Company " + Date.now(),
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single()

    if (userError) {
      console.error("❌ Test: Error updating user:", userError)
      return NextResponse.json({
        success: false,
        error: userError.message,
        details: userError
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: userData })

  } catch (error) {
    console.error("❌ Test: Unexpected error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}