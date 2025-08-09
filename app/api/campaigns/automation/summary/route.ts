import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client with service role key for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET endpoint to get automation summary and statistics
// Note: Automation jobs functionality disabled for n8n integration
export async function GET(request: NextRequest) {
  try {
    console.log(`📊 Generating campaign automation summary (jobs disabled)`)

    // Get active campaigns count - this still works without automation_jobs table
    const { data: activeCampaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("status", "Active")

    if (campaignsError) {
      console.error("Error fetching active campaigns:", campaignsError)
    }

    // Return summary without automation jobs data
    const summary = {
      activeCampaigns: activeCampaigns?.length || 0,
      pendingJobs: 0,
      processingJobs: 0,
      completedToday: 0,
      failedToday: 0,
      weeklyPerformance: {
        totalJobs: 0,
        emailJobs: 0,
        smsJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        successRate: 0
      },
      recentJobs: [],
      topCampaigns: [],
      lastUpdated: new Date().toISOString(),
      message: "Automation jobs disabled - using n8n for workflow automation"
    }

    return NextResponse.json({
      success: true,
      data: summary
    })

  } catch (error) {
    console.error("Error generating automation summary:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}