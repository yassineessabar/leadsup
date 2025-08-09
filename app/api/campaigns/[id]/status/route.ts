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

// PUT - Update campaign status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const campaignId = (await params).id
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ["Draft", "Active", "Paused", "Completed"]
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid status. Must be one of: Draft, Active, Paused, Completed" 
      }, { status: 400 })
    }

    console.log(`🔄 Updating campaign ${campaignId} status to: ${status}`)

    // First verify the campaign belongs to the user
    const { data: existingCampaign, error: verifyError } = await supabaseServer
      .from("campaigns")
      .select("id, name, status")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (verifyError || !existingCampaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Update the campaign status
    const { data: updatedCampaign, error: updateError } = await supabaseServer
      .from("campaigns")
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq("id", campaignId)
      .eq("user_id", userId)
      .select()
      .single()

    if (updateError) {
      console.error("❌ Error updating campaign status:", updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    if (!updatedCampaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    console.log(`✅ Campaign "${existingCampaign.name}" status updated: ${existingCampaign.status} → ${status}`)

    // Return success response with updated campaign data
    return NextResponse.json({
      success: true,
      message: `Campaign status updated to ${status}`,
      data: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        status: updatedCampaign.status,
        previousStatus: existingCampaign.status,
        updatedAt: updatedCampaign.updated_at
      }
    })

  } catch (error) {
    console.error("❌ Error updating campaign status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}