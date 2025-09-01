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

// DELETE - Remove all contacts from campaign (but keep them in database)
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

    // Set campaign_id to null to detach contacts from campaign (keep them in database)
    const { error: detachError, count } = await supabaseServer
      .from("contacts")
      .update({ 
        campaign_id: null,
        email_status: 'Valid' // Reset email status to Valid (default state)
      })
      .eq("campaign_id", campaignId)

    if (detachError) {
      console.error("Error detaching contacts from campaign:", detachError)
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to detach contacts from campaign" 
        },
        { status: 500 }
      )
    }

    // Clean up related data from other tables (set campaign_id to null, don't delete records)
    // Remove from contact_sequence_status
    await supabaseServer
      .from("contact_sequence_status")
      .delete()
      .eq("campaign_id", campaignId)

    // Set campaign_id to null in email_tracking
    await supabaseServer
      .from("email_tracking")
      .update({ campaign_id: null })
      .eq("campaign_id", campaignId)

    // Set campaign_id to null in inbox_messages  
    await supabaseServer
      .from("inbox_messages")
      .update({ campaign_id: null })
      .eq("campaign_id", campaignId)

    // Set campaign_id to null in inbox_threads
    await supabaseServer
      .from("inbox_threads")
      .update({ campaign_id: null })
      .eq("campaign_id", campaignId)

    console.log(`✅ Successfully detached ${count} contacts from campaign ${campaign.name}`)

    return NextResponse.json({
      success: true,
      detached: count || 0,
      message: `Successfully detached ${count || 0} contacts from campaign`
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