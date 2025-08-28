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

// DELETE - Remove selected contacts from campaign (doesn't delete from leads table)
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

    // Get the contact IDs from the request body
    const body = await request.json()
    const { contactIds } = body

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Contact IDs are required" },
        { status: 400 }
      )
    }

    console.log(`🗑️ Removing ${contactIds.length} contacts from campaign ${campaignId}`)

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

    // Remove campaign association from selected contacts in contacts table
    // This sets campaign_id to null, keeping the contacts in the database
    const { error: updateError, count } = await supabaseServer
      .from("contacts")
      .update({ 
        campaign_id: null,
        email_status: 'Valid' // Reset email status to Valid (default state)
      })
      .eq("campaign_id", campaignId)
      .in("id", contactIds)

    if (updateError) {
      console.error("Error removing contacts from campaign:", updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to remove contacts from campaign" 
        },
        { status: 500 }
      )
    }

    // Also remove related data from other tables for these specific contacts
    // Remove from contact_sequence_status
    await supabaseServer
      .from("contact_sequence_status")
      .delete()
      .eq("campaign_id", campaignId)
      .in("contact_id", contactIds)

    // Get contact emails to clean up email tracking
    const { data: contactEmails } = await supabaseServer
      .from("contacts")
      .select("email")
      .in("id", contactIds)

    if (contactEmails && contactEmails.length > 0) {
      const emails = contactEmails.map(c => c.email)
      
      // Remove from email_tracking where campaign_id and email match
      await supabaseServer
        .from("email_tracking")
        .update({ campaign_id: null })
        .eq("campaign_id", campaignId)
        .in("email", emails)

      // Remove from inbox_messages where campaign_id and contact_email match
      await supabaseServer
        .from("inbox_messages")
        .update({ campaign_id: null })
        .eq("campaign_id", campaignId)
        .in("contact_email", emails)

      // Remove from inbox_threads where campaign_id and contact_email match
      await supabaseServer
        .from("inbox_threads")
        .update({ campaign_id: null })
        .eq("campaign_id", campaignId)
        .in("contact_email", emails)
    }

    console.log(`✅ Successfully removed ${count} contacts from campaign ${campaign.name}`)

    return NextResponse.json({
      success: true,
      removed: count || 0,
      message: `Successfully removed ${count || 0} contacts from campaign`
    })

  } catch (error) {
    console.error("Error in remove-selected contacts API:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}