import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase, supabaseServer } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
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
  } catch {
    return null
  }
}

// GET - Fetch analytics data for a specific campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const campaignId = (await params).id

    // First verify the campaign belongs to the user
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("id, name, type, status, created_at")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    console.log(`📊 Fetching analytics for campaign ${campaignId} (${campaign.name})`)

    // Get all review requests for this campaign
    const { data: allRequests, error: requestsError } = await supabaseServer
      .from("review_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (requestsError) {
      console.error("❌ Error fetching review requests:", requestsError)
      return NextResponse.json({ success: false, error: requestsError.message }, { status: 500 })
    }

    // Filter requests for this specific campaign
    let campaignRequests = []
    if (allRequests) {
      // Try campaign_id first if it exists
      const requestsWithCampaignId = allRequests.filter(req => 
        req.campaign_id && req.campaign_id.toString() === campaignId.toString()
      )
      
      // Fallback to content matching if no campaign_id matches found
      const requestsFromContent = allRequests.filter(req => 
        req.content && req.content.includes(`Campaign Lead: ${campaign.name}`)
      )
      
      // Use campaign_id results if found, otherwise use content matching
      campaignRequests = requestsWithCampaignId.length > 0 ? requestsWithCampaignId : requestsFromContent
    }

    console.log(`📋 Found ${campaignRequests.length} requests for campaign ${campaign.name}`)

    // Calculate analytics metrics
    const totalRequests = campaignRequests.length
    const sentRequests = campaignRequests.filter(req => req.status === 'sent').length
    const deliveredRequests = campaignRequests.filter(req => req.status === 'delivered').length
    const openedRequests = campaignRequests.filter(req => req.opened_at !== null).length
    const clickedRequests = campaignRequests.filter(req => req.clicked_at !== null).length
    const pendingRequests = campaignRequests.filter(req => req.status === 'pending').length
    const failedRequests = campaignRequests.filter(req => req.status === 'failed').length

    // Calculate rates
    const openRate = sentRequests > 0 ? Math.round((openedRequests / sentRequests) * 100) : 0
    const clickRate = sentRequests > 0 ? Math.round((clickedRequests / sentRequests) * 100) : 0
    const deliveryRate = totalRequests > 0 ? Math.round((deliveredRequests / totalRequests) * 100) : 0

    // Get campaign sequences count
    const { data: sequences, error: sequencesError } = await supabaseServer
      .from("campaign_sequences")
      .select("step_number")
      .eq("campaign_id", campaignId)

    const sequenceSteps = sequences?.length || 0

    // Calculate performance over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentRequests = campaignRequests.filter(req => 
      req.created_at && new Date(req.created_at) >= thirtyDaysAgo
    )

    // Group by date for timeline
    const timeline = {}
    recentRequests.forEach(req => {
      const date = new Date(req.created_at).toISOString().split('T')[0]
      if (!timeline[date]) {
        timeline[date] = { sent: 0, opened: 0, clicked: 0 }
      }
      if (req.status === 'sent') timeline[date].sent++
      if (req.opened_at) timeline[date].opened++
      if (req.clicked_at) timeline[date].clicked++
    })

    const analytics = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        created_at: campaign.created_at
      },
      metrics: {
        sequenceStarted: totalRequests,
        sent: sentRequests,
        delivered: deliveredRequests,
        pending: pendingRequests,
        failed: failedRequests,
        opened: openedRequests,
        clicked: clickedRequests,
        openRate: openRate,
        clickRate: clickRate,
        deliveryRate: deliveryRate,
        sequenceSteps: sequenceSteps
      },
      timeline: Object.entries(timeline).map(([date, data]) => ({
        date,
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date)),
      summary: {
        totalContacts: totalRequests,
        activeSequences: sequenceSteps,
        avgResponseTime: null, // Could be calculated from response times
        conversionRate: clickRate // Using click rate as conversion proxy
      }
    }

    console.log(`✅ Analytics compiled:`, {
      totalRequests,
      sentRequests,
      openRate: `${openRate}%`,
      clickRate: `${clickRate}%`
    })

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error("❌ Error fetching campaign analytics:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}