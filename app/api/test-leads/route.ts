import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      return null
    }

    return data.user_id
  } catch (error) {
    return null
  }
}

// GET - Test endpoint to check leads data
export async function GET(request: NextRequest) {
  try {
    let userId = await getUserIdFromSession()
    
    // If no session, use the user ID that owns campaigns for testing
    if (!userId) {
      // Find the user who owns campaigns
      const { data: campaignOwner } = await supabase
        .from("campaigns")
        .select("user_id")
        .limit(1)
        .single()
      
      userId = campaignOwner?.user_id || "1" // fallback to user "1"
      console.log(`🔍 No session found, using campaign owner user ID: ${userId}`)
    }

    // Check all review_requests for this user
    const { data: allRequests, error: allError } = await supabase
      .from("review_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)

    // Check campaigns for this user
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id, name, type, status, user_id")
      .eq("user_id", userId)
    
    // Also check all campaigns to see who owns them
    const { data: allCampaigns, error: allCampaignsError } = await supabase
      .from("campaigns")
      .select("id, name, type, status, user_id")
      .limit(10)
    
    console.log(`🔍 Found ${allCampaigns?.length || 0} total campaigns in database`)
    if (allCampaignsError) {
      console.error("❌ Error fetching all campaigns:", allCampaignsError)
    }

    // Check if campaign_id column exists by trying to select it
    let campaignIdExists = false
    try {
      await supabase
        .from("review_requests")
        .select("campaign_id")
        .limit(1)
      campaignIdExists = true
    } catch (error) {
      campaignIdExists = false
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        campaign_id_column_exists: campaignIdExists,
        total_review_requests: allRequests?.length || 0,
        recent_requests: allRequests?.map(req => ({
          id: req.id,
          contact_name: req.contact_name,
          request_type: req.request_type,
          content: req.content?.substring(0, 100) + "...",
          campaign_id: req.campaign_id || "null",
          created_at: req.created_at
        })) || [],
        campaigns: campaigns?.map(camp => ({
          id: camp.id,
          name: camp.name,
          type: camp.type,
          status: camp.status,
          user_id: camp.user_id
        })) || [],
        all_campaigns: allCampaigns?.map(camp => ({
          id: camp.id,
          name: camp.name,
          user_id: camp.user_id
        })) || []
      }
    })

  } catch (error) {
    console.error("Error in test leads endpoint:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 })
  }
}