import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { EmailTemplate } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: emailTemplate, error } = await supabase
      .from("email_templates") // Assuming a table named 'email_templates'
      .select("*")
      .eq("user_id", MOCK_USER_ID)
      .single()

    if (error) {
      console.error("Error fetching email template:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!emailTemplate) {
      return NextResponse.json({ success: false, error: "Email template not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: emailTemplate })
  } catch (error) {
    console.error("Error in GET /api/review-management/email-template:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = (await request.json()) as Partial<EmailTemplate>

    const { data, error } = await supabase
      .from("email_templates")
      .update(updates)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating email template:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Email template not found or not authorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/review-management/email-template:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
