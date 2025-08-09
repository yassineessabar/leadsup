import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { Integration } from "@/types/db"

const MOCK_USER_ID = "1"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const updates = (await request.json()) as Partial<Integration>

    const { data, error } = await supabase
      .from("integrations")
      .update(updates)
      .eq("id", id)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating integration:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Integration not found or not authorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/integrations/[id]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
