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
    const { subscription_type = "pro", subscription_status = "active" } = body

    // Update user subscription manually
    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_type,
        subscription_status,
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('❌ Error updating subscription:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("❌ Error in test subscription update:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}