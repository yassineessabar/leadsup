import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { SecuritySettings } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: securitySettings, error } = await supabase
      .from("security_settings") // Assuming a table named 'security_settings'
      .select("*")
      .eq("user_id", MOCK_USER_ID)
      .single()

    if (error) {
      console.error("Error fetching security settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!securitySettings) {
      return NextResponse.json({ success: false, error: "Security settings not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: securitySettings })
  } catch (error) {
    console.error("Error in GET /api/account/security:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = (await request.json()) as Partial<SecuritySettings>

    const { data, error } = await supabase
      .from("security_settings")
      .update(updates)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating security settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Security settings not found or not authorized" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/account/security:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
