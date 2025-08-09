import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { Workflow } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: workflows, error } = await supabase
      .from("automation_workflows") // Assuming a table named 'automation_workflows'
      .select("*")
      .eq("user_id", MOCK_USER_ID)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching workflows:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: workflows })
  } catch (error) {
    console.error("Error in GET /api/review-management/workflows:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const newWorkflow = (await request.json()) as Omit<
      Workflow,
      "id" | "user_id" | "created_at" | "sent_count" | "opened_count" | "clicked_count"
    >

    const { data, error } = await supabase
      .from("automation_workflows")
      .insert({
        ...newWorkflow,
        user_id: MOCK_USER_ID,
        created_at: new Date().toISOString(),
        sent_count: 0,
        opened_count: 0,
        clicked_count: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating workflow:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in POST /api/review-management/workflows:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
