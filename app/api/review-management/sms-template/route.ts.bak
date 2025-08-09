import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { SMSTemplate } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: smsTemplate, error } = await supabase
      .from("sms_templates") // Assuming a table named 'sms_templates'
      .select("*")
      .eq("user_id", MOCK_USER_ID)
      .single()

    if (error) {
      console.error("Error fetching SMS template:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!smsTemplate) {
      return NextResponse.json({ success: false, error: "SMS template not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: smsTemplate })
  } catch (error) {
    console.error("Error in GET /api/review-management/sms-template:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = (await request.json()) as Partial<SMSTemplate>

    const { data, error } = await supabase
      .from("sms_templates")
      .update(updates)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating SMS template:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "SMS template not found or not authorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/review-management/sms-template:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
