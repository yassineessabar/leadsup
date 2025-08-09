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
    const { displayName, bio, profileImage } = body

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (displayName && displayName.trim().length > 0) {
      updateData.company = displayName.trim()
    }

    if (bio && bio.trim().length > 0) {
      updateData.bio = bio.trim()
    }

    if (profileImage && profileImage.trim().length > 0) {
      updateData.profile_picture_url = profileImage.trim()
    }

    // Update user record with company profile data
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      console.error("❌ Error saving company profile:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("❌ Error in save-company-profile API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}