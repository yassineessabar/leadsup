import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client with service role key for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET endpoint to trigger "New Client" automation for all active campaigns
// Note: Automation jobs functionality disabled for n8n integration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get("testMode") === "true"

    console.log(`🎯 Processing "New Client" triggers disabled (Test Mode: ${testMode})`)

    // Return empty processing result since automation jobs are disabled
    return NextResponse.json({
      success: true,
      message: "New client automation disabled - using n8n for workflow automation",
      data: {
        processedCampaigns: 0,
        totalEnrollments: 0,
        totalJobs: 0,
        campaignResults: [],
        testMode
      }
    })

  } catch (error) {
    console.error("Error in trigger-new-clients automation:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}