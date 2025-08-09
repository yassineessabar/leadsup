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

    // 1. Get current user data
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (fetchError) {
      console.error("❌ Error fetching user:", fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    // 2. Try to update with test data
    const testUpdateData = {
      company: `Test Company ${Date.now()}`,
      store_type: `Test Category ${Date.now()}`,
      updated_at: new Date().toISOString()
    }

    const { data: updateResult, error: updateError } = await supabase
      .from("users")
      .update(testUpdateData)
      .eq("id", userId)
      .select()
      .single()

    if (updateError) {
      console.error("❌ Error updating user:", updateError)
      return NextResponse.json({
        success: false,
        error: updateError.message,
        details: updateError
      }, { status: 500 })
    }

    // 3. Verify the update by fetching again
    const { data: verifyUser, error: verifyError } = await supabase
      .from("users")
      .select("id, email, company, store_type, updated_at")
      .eq("id", userId)
      .single()

    if (verifyError) {
      console.error("❌ Error verifying update:", verifyError)
    } else {
    }

    return NextResponse.json({
      success: true,
      before: currentUser,
      updateData: testUpdateData,
      after: updateResult,
      verified: verifyUser
    })

  } catch (error) {
    console.error("❌ Debug error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}