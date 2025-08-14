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
    
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

// GET - Fetch connected accounts for a campaign
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

    // Fetch all connected accounts in parallel
    const [gmailAccounts, microsoft365Accounts, smtpAccounts] = await Promise.all([
      fetchGmailAccounts(userId, campaignId),
      fetchMicrosoft365Accounts(userId),
      fetchSmtpAccounts(userId)
    ])

    const connectedAccounts = {
      gmail: gmailAccounts,
      microsoft365: microsoft365Accounts,
      smtp: smtpAccounts
    }

    return NextResponse.json({ success: true, data: connectedAccounts })

  } catch (error) {
    console.error("Error fetching connected accounts:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to fetch Gmail accounts from campaign_senders table for a specific campaign
async function fetchGmailAccounts(userId: string, campaignId?: string) {
  let query = supabaseServer
    .from("campaign_senders")
    .select("*")
    .eq("user_id", userId)
    .eq("sender_type", "email")
    .eq("is_active", true)

  if (campaignId) {
    query = query.eq("campaign_id", campaignId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching Gmail accounts from campaign_senders:", error)
    return []
  }

  return data || []
}

// Helper function to fetch Microsoft 365 accounts
async function fetchMicrosoft365Accounts(userId: string) {
  const { data, error } = await supabaseServer
    .from("microsoft365_accounts")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching Microsoft 365 accounts:", error)
    return []
  }

  return (data || []).map(account => ({
    ...account,
    health_score: 85,
    daily_limit: 50,
    is_active: true
  }))
}

// Helper function to fetch SMTP accounts
async function fetchSmtpAccounts(userId: string) {
  const { data, error } = await supabaseServer
    .from("smtp_accounts")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching SMTP accounts:", error)
    return []
  }

  return (data || []).map(account => ({
    ...account,
    health_score: 75,
    daily_limit: 50,
    is_active: true
  }))
}