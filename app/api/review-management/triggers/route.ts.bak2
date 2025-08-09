import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { TriggerSettings } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: triggerSettings, error } = await supabase
      .from("trigger_settings") // Assuming a table named 'trigger_settings'
      .select("*")
      .eq("user_id", MOCK_USER_ID)
      .single()

    if (error) {
      console.error("Error fetching trigger settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!triggerSettings) {
      return NextResponse.json({ success: false, error: "Trigger settings not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: triggerSettings })
  } catch (error) {
    console.error("Error in GET /api/review-management/triggers:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = (await request.json()) as Partial<TriggerSettings>

    const { data, error } = await supabase
      .from("trigger_settings")
      .update(updates)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating trigger settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Trigger settings not found or not authorized" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/review-management/triggers:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
