import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { AutomationSettings } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: automationSettings, error } = await supabase
      .from("automation_settings") // Assuming a table named 'automation_settings'
      .select("*")
      .eq("user_id", MOCK_USER_ID)
      .single()

    if (error) {
      console.error("Error fetching automation settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!automationSettings) {
      return NextResponse.json({ success: false, error: "Automation settings not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: automationSettings })
  } catch (error) {
    console.error("Error in GET /api/review-management/automation:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = (await request.json()) as Partial<AutomationSettings>

    const { data, error } = await supabase
      .from("automation_settings")
      .update(updates)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating automation settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Automation settings not found or not authorized" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/review-management/automation:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
