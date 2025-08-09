import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("review_requests")
      .select("*")
      .eq("user_id", MOCK_USER_ID)
      .order("sent_at", { ascending: false })

    if (error) {
      console.error("Error fetching review requests for export:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: "No data to export" }, { status: 404 })
    }

    // Convert data to CSV format
    const headers = Object.keys(data[0]).join(",")
    const csvRows = data.map((row) =>
      Object.values(row)
        .map((value) => `"${value}"`)
        .join(","),
    )
    const csv = [headers, ...csvRows].join("\n")

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="review_requests_${Date.now()}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error in GET /api/export-review-requests:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
