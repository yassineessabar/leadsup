import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { Workflow } from "@/types/db"

const MOCK_USER_ID = "1"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const updates = (await request.json()) as Partial<Workflow>

    const { data, error } = await supabase
      .from("automation_workflows")
      .update(updates)
      .eq("id", id)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating workflow:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Workflow not found or not authorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/review-management/workflows/[id]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const { error } = await supabase.from("automation_workflows").delete().eq("id", id).eq("user_id", MOCK_USER_ID)

    if (error) {
      console.error("Error deleting workflow:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Workflow deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/review-management/workflows/[id]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
