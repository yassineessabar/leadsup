import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client with service role key for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET endpoint to process all pending campaign sequence jobs
// Note: Automation jobs functionality disabled for n8n integration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get("testMode") === "true"

    console.log(`⏰ Processing pending campaign sequence jobs disabled (Test Mode: ${testMode})`)

    // Return empty processing result since automation jobs are disabled
    return NextResponse.json({
      success: true,
      message: "Automation jobs processing disabled - using n8n for workflow automation",
      data: {
        processedJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        results: [],
        testMode
      }
    })

  } catch (error) {
    console.error("Error in process-pending automation:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}