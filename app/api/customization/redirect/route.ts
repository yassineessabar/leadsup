import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { RedirectSettings } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: redirectSettings, error } = await supabase
      .from("customization_settings") // Assuming customization_settings table holds redirect settings
      .select("user_id, base_url, custom_id, full_url")
      .eq("user_id", MOCK_USER_ID)
      .single()

    if (error) {
      console.error("Error fetching redirect settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!redirectSettings) {
      return NextResponse.json({ success: false, error: "Redirect settings not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: redirectSettings })
  } catch (error) {
    console.error("Error in GET /api/customization/redirect:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = (await request.json()) as Partial<RedirectSettings>

    const { data, error } = await supabase
      .from("customization_settings")
      .update(updates)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating redirect settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Redirect settings not found or not authorized" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/customization/redirect:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
