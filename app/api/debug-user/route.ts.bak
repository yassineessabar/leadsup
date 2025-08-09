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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Get current user data
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id, subscription_type, subscription_status, stripe_subscription_id, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ Error fetching user:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("❌ Error in debug user:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}