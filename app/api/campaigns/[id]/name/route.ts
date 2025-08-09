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

// PUT - Update campaign name
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
    const { name } = body

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Campaign name is required and cannot be empty" 
      }, { status: 400 })
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ 
        success: false, 
        error: "Campaign name cannot exceed 100 characters" 
      }, { status: 400 })
    }

    console.log(`📝 Updating campaign ${campaignId} name to: "${name.trim()}"`)

    // First verify the campaign belongs to the user
    const { data: existingCampaign, error: verifyError } = await supabaseServer
      .from("campaigns")
      .select("id, name")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (verifyError || !existingCampaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Check if the name is actually different
    const trimmedName = name.trim()
    if (existingCampaign.name === trimmedName) {
      return NextResponse.json({
        success: true,
        message: "Campaign name unchanged",
        data: {
          id: existingCampaign.id,
          name: existingCampaign.name,
          previousName: existingCampaign.name
        }
      })
    }

    // Update the campaign name
    const { data: updatedCampaign, error: updateError } = await supabaseServer
      .from("campaigns")
      .update({ 
        name: trimmedName,
        updated_at: new Date().toISOString()
      })
      .eq("id", campaignId)
      .eq("user_id", userId)
      .select()
      .single()

    if (updateError) {
      console.error("❌ Error updating campaign name:", updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    if (!updatedCampaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    console.log(`✅ Campaign name updated: "${existingCampaign.name}" → "${trimmedName}"`)

    // Return success response with updated campaign data
    return NextResponse.json({
      success: true,
      message: "Campaign name updated successfully",
      data: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        previousName: existingCampaign.name,
        updatedAt: updatedCampaign.updated_at
      }
    })

  } catch (error) {
    console.error("❌ Error updating campaign name:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}