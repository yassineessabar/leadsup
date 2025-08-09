import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (sessionToken) {
      // Delete session from database
      const { error } = await supabase.from("user_sessions").delete().eq("session_token", sessionToken)

      if (error) {
        console.error("❌ Error deleting session from DB:", error.message)
        // Continue to clear cookie even if DB delete fails
      }
    }

    // Clear session cookie
    cookieStore.delete("session")

    return NextResponse.json({ success: true, message: "Logged out successfully" })
  } catch (error) {
    console.error("❌ Logout error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
