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
  } catch {
    return null
  }
}

// POST - Save Gmail account directly to campaign_senders table
export async function POST(
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
    const { email, name, profile_picture, access_token, refresh_token, expires_at } = body

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Check if Gmail account already exists for this campaign
    const { data: existingAccount } = await supabaseServer
      .from("campaign_senders")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)
      .eq("email", email)
      .single()

    if (existingAccount) {
      // Update existing account
      const { error: updateError } = await supabaseServer
        .from("campaign_senders")
        .update({
          name,
          profile_picture,
          access_token,
          refresh_token,
          expires_at,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingAccount.id)

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: "Gmail account updated successfully", id: existingAccount.id })
    } else {
      // Create new Gmail account in campaign_senders
      const { data: newAccount, error: insertError } = await supabaseServer
        .from("campaign_senders")
        .insert({
          campaign_id: campaignId,
          user_id: userId,
          email,
          name,
          profile_picture,
          access_token,
          refresh_token,
          expires_at,
          sender_type: 'email',
          health_score: 75,
          daily_limit: 50,
          warmup_status: 'inactive',
          is_active: true,
          is_selected: false
        })
        .select("id")
        .single()

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: "Gmail account added successfully", id: newAccount.id })
    }

  } catch (error) {
    console.error("❌ Error saving Gmail account:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// GET - Fetch Gmail accounts for this campaign
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

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Fetch Gmail accounts for this campaign
    const { data: accounts, error: fetchError } = await supabaseServer
      .from("campaign_senders")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)
      .eq("sender_type", "email")
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: accounts || [] })

  } catch (error) {
    console.error("❌ Error fetching Gmail accounts:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete Gmail account from campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const campaignId = (await params).id
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ success: false, error: "Account ID required" }, { status: 400 })
    }

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Delete the Gmail account
    const { error: deleteError } = await supabaseServer
      .from("campaign_senders")
      .delete()
      .eq("id", accountId)
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)

    if (deleteError) {
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Gmail account deleted successfully" })

  } catch (error) {
    console.error("❌ Error deleting Gmail account:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}