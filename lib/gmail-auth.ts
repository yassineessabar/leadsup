import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    // Find session in Supabase using server client (bypasses RLS)
    const { data: session, error: sessionError } = await supabaseServer
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()

    if (sessionError || !session) {
      return null
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Clean up expired session
      await supabaseServer.from("user_sessions").delete().eq("session_token", sessionToken)
      return null
    }

    return session.user_id
  } catch (error) {
    console.error("Error getting current user ID:", error)
    return null
  }
}