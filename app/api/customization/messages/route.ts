import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { MessageSettings } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: messageSettings, error } = await supabase
      .from("customization_settings") // Assuming customization_settings table holds message settings
      .select("user_id, rating_page_content, redirect_text, notification_text, skip_redirect")
      .eq("user_id", MOCK_USER_ID)
      .single()

    if (error) {
      console.error("Error fetching message settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!messageSettings) {
      return NextResponse.json({ success: false, error: "Message settings not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: messageSettings })
  } catch (error) {
    console.error("Error in GET /api/customization/messages:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = (await request.json()) as Partial<MessageSettings>

    const { data, error } = await supabase
      .from("customization_settings")
      .update(updates)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating message settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Message settings not found or not authorized" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/customization/messages:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
