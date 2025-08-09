import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === "assign_contacts_to_campaign_owner") {
      // Get the user who owns campaigns
      const { data: campaignOwner } = await supabase
        .from("campaigns")
        .select("user_id")
        .limit(1)
        .single()

      if (!campaignOwner) {
        return NextResponse.json({ success: false, error: "No campaigns found" })
      }

      const targetUserId = campaignOwner.user_id

      // Update all unassigned contacts to belong to the campaign owner
      const { data: updatedContacts, error: updateError } = await supabase
        .from("review_requests")
        .update({ user_id: targetUserId })
        .is("campaign_id", null)
        .neq("user_id", targetUserId)
        .select()

      if (updateError) {
        console.error("❌ Error updating contacts:", updateError)
        return NextResponse.json({ success: false, error: updateError.message })
      }

      return NextResponse.json({
        success: true,
        message: `Assigned ${updatedContacts?.length || 0} contacts to user ${targetUserId}`,
        data: updatedContacts
      })
    }

    return NextResponse.json({ success: false, error: "Invalid action" })

  } catch (error) {
    console.error("❌ Error in fix-user-assignment:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}