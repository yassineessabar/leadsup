import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { BrandingSettings } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: brandingSettings, error } = await supabase
      .from("customization_settings") // Assuming customization_settings table holds branding
      .select("user_id, company_logo_url, sms_sender_name, email_sender_name, title_color")
      .eq("user_id", MOCK_USER_ID)
      .single()

    if (error) {
      console.error("Error fetching branding settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!brandingSettings) {
      return NextResponse.json({ success: false, error: "Branding settings not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: brandingSettings })
  } catch (error) {
    console.error("Error in GET /api/customization/branding:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = (await request.json()) as Partial<BrandingSettings>

    const { data, error } = await supabase
      .from("customization_settings")
      .update(updates)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating branding settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Branding settings not found or not authorized" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/customization/branding:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
