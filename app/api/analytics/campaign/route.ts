import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { SendGridAnalyticsService } from "@/lib/sendgrid-analytics"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()
    
    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    return null
  }
}

// GET - Fetch campaign analytics metrics
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "Campaign ID is required" }, { status: 400 })
    }

    // Build date range if provided
    let dateRange: { start: Date; end: Date } | undefined
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    }

    // First, get the selected senders for this campaign
    const { data: campaignSenders, error: sendersError } = await supabase
      .from('campaign_senders')
      .select('email, sender_id')
      .eq('campaign_id', campaignId)
    
    if (sendersError) {
      console.error("❌ Error fetching campaign senders:", sendersError)
    }
    
    const selectedSenderEmails = campaignSenders?.map(s => s.email).filter(Boolean) || []
    console.log(`📧 Campaign ${campaignId} selected senders:`, selectedSenderEmails)

    // Get campaign metrics (filtered by selected senders)
    const metrics = await SendGridAnalyticsService.getCampaignMetrics({
      campaignId,
      userId,
      dateRange,
      selectedSenderEmails
    })

    // Get time series data for charts (filtered by selected senders)
    const timeSeries = await SendGridAnalyticsService.getCampaignMetricsTimeSeries({
      campaignId,
      userId,
      dateRange,
      granularity: 'day',
      selectedSenderEmails
    })

    // Get email tracking details (filtered by selected senders)
    const emailTracking = await SendGridAnalyticsService.getEmailTrackingDetails(
      campaignId,
      userId,
      { limit: 100, selectedSenderEmails }
    )

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        timeSeries,
        emailTracking: emailTracking.data,
        totalEmails: emailTracking.total
      }
    })

  } catch (error) {
    console.error("❌ Error fetching campaign analytics:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}