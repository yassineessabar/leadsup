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

  // Enrich with health scores from sender_accounts table
  const enrichedData = []
  for (const account of data || []) {
    let enrichedAccount = { ...account }
    
    // Try to fetch health score from sender_accounts table
    try {
      const { data: senderAccount } = await supabaseServer
        .from("sender_accounts")
        .select("health_score, warmup_status")
        .eq("email", account.email)
        .eq("user_id", userId)
        .single()
      
      if (senderAccount) {
        enrichedAccount.health_score = senderAccount.health_score || 75
        enrichedAccount.warmup_status = senderAccount.warmup_status || 'inactive'
      } else {
        // If no sender_account record, calculate health score
        try {
          console.log(`🔄 Calculating health score for new account: ${account.email}`)
          // This is a fallback - in practice, sender accounts should be created first
          enrichedAccount.health_score = 75 // Safe default for new accounts
          enrichedAccount.warmup_status = 'inactive'
          
          // Note: We could trigger health score calculation here, but that would slow down the API response
          // Better to handle this asynchronously or ensure sender_accounts are created properly
        } catch (err) {
          console.log(`Error calculating health score for ${account.email}:`, err)
          enrichedAccount.health_score = 75
          enrichedAccount.warmup_status = 'inactive'
        }
      }
    } catch (err) {
      console.log(`No sender_account record found for ${account.email}, using defaults`)
      enrichedAccount.health_score = 75
      enrichedAccount.warmup_status = 'inactive'
    }
    
    enrichedData.push(enrichedAccount)
  }

  return enrichedData
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

  // Enrich with health scores from sender_accounts table
  const enrichedData = []
  for (const account of data || []) {
    let enrichedAccount = { 
      ...account,
      daily_limit: 50,
      is_active: true
    }
    
    // Try to fetch health score from sender_accounts table
    try {
      const { data: senderAccount } = await supabaseServer
        .from("sender_accounts")
        .select("health_score, warmup_status")
        .eq("email", account.email)
        .eq("user_id", userId)
        .single()
      
      if (senderAccount) {
        enrichedAccount.health_score = senderAccount.health_score || 75
        enrichedAccount.warmup_status = senderAccount.warmup_status || 'inactive'
      } else {
        enrichedAccount.health_score = 75
        enrichedAccount.warmup_status = 'inactive'
      }
    } catch (err) {
      console.log(`No sender_account record found for ${account.email}, using defaults`)
      enrichedAccount.health_score = 85
      enrichedAccount.warmup_status = 'inactive'
    }
    
    enrichedData.push(enrichedAccount)
  }

  return enrichedData
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

  // Enrich with health scores from sender_accounts table
  const enrichedData = []
  for (const account of data || []) {
    let enrichedAccount = { 
      ...account,
      daily_limit: 50,
      is_active: true
    }
    
    // Try to fetch health score from sender_accounts table
    try {
      const { data: senderAccount } = await supabaseServer
        .from("sender_accounts")
        .select("health_score, warmup_status")
        .eq("email", account.email)
        .eq("user_id", userId)
        .single()
      
      if (senderAccount) {
        enrichedAccount.health_score = senderAccount.health_score || 75
        enrichedAccount.warmup_status = senderAccount.warmup_status || 'inactive'
      } else {
        enrichedAccount.health_score = 75
        enrichedAccount.warmup_status = 'inactive'
      }
    } catch (err) {
      console.log(`No sender_account record found for ${account.email}, using defaults`)
      enrichedAccount.health_score = 75
      enrichedAccount.warmup_status = 'inactive'
    }
    
    enrichedData.push(enrichedAccount)
  }

  return enrichedData
}