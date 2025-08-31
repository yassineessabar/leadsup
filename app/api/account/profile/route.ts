import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase, supabaseServer } from "@/lib/supabase"
import type { UserProfile } from "@/types/db"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value


    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()


    if (error || !session) {
      return null
    }

    return session.user_id
  } catch (err) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { data: userProfile, error } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, phone_number, profile_picture_url, position, company")
      .eq("id", userId)
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!userProfile) {
      return NextResponse.json({ success: false, error: "User profile not found" }, { status: 404 })
    }

    // Map database fields to frontend expected fields
    const mappedProfile = {
      id: userProfile.id,
      first_name: userProfile.first_name || "",
      last_name: userProfile.last_name || "",
      email: userProfile.email || "",
      phone: userProfile.phone_number || "",
      company: userProfile.company || "",
      position: userProfile.position || "",
      address: "", // Not available in current schema
      city: "", // Not available in current schema
      postal_code: "", // Not available in current schema
      country: "", // Not available in current schema
      timezone: "UTC", // Not available in current schema
      language: "en", // Not available in current schema
      bio: "", // Not in database schema
      avatar_url: userProfile.profile_picture_url || "/placeholder.svg?height=80&width=80",
    }

    return NextResponse.json({ success: true, data: mappedProfile })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const updates = (await request.json()) as Partial<UserProfile>

    // Map frontend fields back to database fields (only fields that exist in schema)
    const dbUpdates: any = {}
    if (updates.first_name !== undefined) dbUpdates.first_name = updates.first_name
    if (updates.last_name !== undefined) dbUpdates.last_name = updates.last_name
    if (updates.email !== undefined) dbUpdates.email = updates.email
    if (updates.phone !== undefined) dbUpdates.phone_number = updates.phone
    if (updates.company !== undefined) dbUpdates.company = updates.company
    if (updates.position !== undefined) dbUpdates.position = updates.position
    if (updates.avatar_url !== undefined) dbUpdates.profile_picture_url = updates.avatar_url
    // Note: address, city, postal_code, country, timezone, language not available in current schema

    const { data, error } = await supabase
      .from("users")
      .update(dbUpdates)
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "User profile not found or not authorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
