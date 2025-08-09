import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    console.log(`🔍 Debug: Checking contacts for user ${userId}`)

    // Get all review requests for this user
    const { data: allContacts, error: contactsError } = await supabase
      .from("review_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (contactsError) {
      console.error("❌ Error fetching contacts:", contactsError)
      return NextResponse.json({ success: false, error: contactsError.message }, { status: 500 })
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const recentContacts = allContacts?.filter(contact => 
      new Date(contact.created_at) > sevenDaysAgo
    ) || []

    const unassignedContacts = allContacts?.filter(contact => 
      !contact.campaign_id
    ) || []

    const recentUnassignedContacts = allContacts?.filter(contact => 
      !contact.campaign_id && new Date(contact.created_at) > sevenDaysAgo
    ) || []

    // Get campaigns for this user
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", userId)

    return NextResponse.json({
      success: true,
      data: {
        userId,
        totalContacts: allContacts?.length || 0,
        recentContacts: recentContacts.length,
        unassignedContacts: unassignedContacts.length,
        recentUnassignedContacts: recentUnassignedContacts.length,
        sevenDaysAgo: sevenDaysAgo.toISOString(),
        campaigns: campaigns?.length || 0,
        sampleContacts: allContacts?.slice(0, 5).map(contact => ({
          id: contact.id,
          contact_name: contact.contact_name,
          contact_email: contact.contact_email,
          campaign_id: contact.campaign_id,
          created_at: contact.created_at,
          request_type: contact.request_type
        })),
        sampleCampaigns: campaigns?.slice(0, 3).map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          trigger_type: campaign.trigger_type
        }))
      }
    })

  } catch (error) {
    console.error("❌ Error in debug-contacts:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}