import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"

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
  } catch (err) {
    console.error("Error in getUserIdFromSession:", err)
    return null
  }
}

// DELETE - Completely remove all contacts from campaign and delete them from database
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    const { id: campaignId } = await params

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required" },
        { status: 400 }
      )
    }

    console.log(`🗑️ Deleting all contacts from campaign ${campaignId}`)

    // First, verify the campaign belongs to the user
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("id, name")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      console.error("Campaign not found or access denied:", campaignError)
      return NextResponse.json(
        { success: false, error: "Campaign not found or access denied" },
        { status: 404 }
      )
    }

    // Get count of contacts to be removed (for logging)
    const { count: contactCount } = await supabaseServer
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)

    // Completely delete all contacts from the contacts table
    const { error: deleteError } = await supabaseServer
      .from("contacts")
      .delete()
      .eq("campaign_id", campaignId)

    if (deleteError) {
      console.error("Error deleting contacts from campaign:", deleteError)
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to delete contacts from campaign" 
        },
        { status: 500 }
      )
    }

    // Also remove any related data from other tables
    // Remove from contact_sequence_status
    await supabaseServer
      .from("contact_sequence_status")
      .delete()
      .eq("campaign_id", campaignId)

    // Remove from email_tracking where campaign_id matches
    await supabaseServer
      .from("email_tracking")
      .delete()
      .eq("campaign_id", campaignId)

    // Remove from inbox_messages where campaign_id matches
    await supabaseServer
      .from("inbox_messages")
      .delete()
      .eq("campaign_id", campaignId)

    // Remove from inbox_threads where campaign_id matches
    await supabaseServer
      .from("inbox_threads")
      .delete()
      .eq("campaign_id", campaignId)

    console.log(`✅ Successfully deleted ${contactCount} contacts from campaign ${campaign.name}`)

    return NextResponse.json({
      success: true,
      deleted: contactCount || 0,
      message: `Successfully deleted ${contactCount || 0} contacts from campaign and database`
    })

  } catch (error) {
    console.error("Error in remove-all contacts API:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}