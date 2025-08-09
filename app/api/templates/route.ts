import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { TemplateSetting } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    let dbQuery = supabase.from("template_settings").select("*").eq("user_id", MOCK_USER_ID)

    if (type) {
      dbQuery = dbQuery.eq("type", type)
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error("Error fetching template settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in GET /api/templates:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, updates } = (await request.json()) as { id: string; updates: Partial<TemplateSetting> }

    if (!id || !updates) {
      return NextResponse.json({ success: false, error: "Template ID and updates are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("template_settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating template setting:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Template setting not found or not authorized" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/templates:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const newSetting = (await request.json()) as Omit<TemplateSetting, "id" | "user_id" | "created_at" | "updated_at">

    if (!newSetting.type || !newSetting.content) {
      return NextResponse.json({ success: false, error: "Type and content are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("template_settings")
      .insert({ ...newSetting, user_id: MOCK_USER_ID })
      .select()
      .single()

    if (error) {
      console.error("Error inserting template setting:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/templates:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
