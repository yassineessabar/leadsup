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

// GET - Fetch comprehensive campaign data
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
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Fetch all campaign-related data
    const [
      sequences,
      settings,
      senders,
      scrapingSettings,
      gmailAccounts,
      microsoft365Accounts,
      smtpAccounts
    ] = await Promise.all([
      fetchSequences(campaignId),
      fetchSettings(campaignId),
      fetchSenders(campaignId),
      fetchScrapingSettings(campaignId),
      fetchGmailAccounts(userId, campaignId), // Pass campaign ID to get campaign-specific accounts
      fetchMicrosoft365Accounts(userId),
      fetchSmtpAccounts(userId)
    ])

    const campaignData = {
      campaign,
      sequences,
      settings,
      senders,
      scrapingSettings,
      connectedAccounts: {
        gmail: gmailAccounts,
        microsoft365: microsoft365Accounts,
        smtp: smtpAccounts
      }
    }

    return NextResponse.json({ success: true, data: campaignData })

  } catch (error) {
    console.error("❌ Error fetching campaign data:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// POST - Save comprehensive campaign data
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
    const { campaignData, saveType = 'all' } = body

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

    // Save different types of data based on saveType
    if (saveType === 'all' || saveType === 'sequences') {
      await saveSequences(campaignId, campaignData.sequences)
    }

    if (saveType === 'all' || saveType === 'settings') {
      await saveSettings(campaignId, campaignData.settings)
    }

    if (saveType === 'all' || saveType === 'senders') {
      await saveSenderAccounts(campaignId, campaignData.senderAccounts)
    }

    if (saveType === 'all') {
      // Save basic campaign info
      await saveCampaignBasics(campaignId, campaignData)
      
      // Save connected accounts
      await saveConnectedAccounts(userId, campaignData.connectedAccounts)
      
      // Save scraping settings
      await saveScrapingSettings(campaignId, campaignData.scraping)
    }

    return NextResponse.json({ success: true, message: "Campaign data saved successfully" })

  } catch (error) {
    console.error("❌ Error saving campaign data:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to save sequences
async function saveSequences(campaignId: string, sequences: any[]) {
  if (!sequences || sequences.length === 0) return

  // Delete existing sequences
  await supabaseServer
    .from("campaign_sequences")
    .delete()
    .eq("campaign_id", campaignId)

  // Insert new sequences
  const sequenceData = sequences.map((seq: any, index: number) => ({
    campaign_id: campaignId,
    step_number: index + 1,
    subject: seq.subject || null,
    content: seq.content || "",
    timing_days: seq.timing || 1,
    variants: seq.variants || 1,
    outreach_method: seq.outreach_method || "email",
    sequence_number: seq.sequence || 1,
    sequence_step: seq.sequenceStep || 1,
    title: seq.title || `Email ${index + 1}`
  }))

  const { error: insertError } = await supabaseServer
    .from("campaign_sequences")
    .insert(sequenceData)

  if (insertError) {
    throw new Error(`Failed to save sequences: ${insertError.message}`)
  }
}

// Helper function to save settings
async function saveSettings(campaignId: string, settings: any) {
  if (!settings) return

  // Update or insert campaign settings
  const settingsData = {
    campaign_id: campaignId,
    daily_contacts_limit: settings.dailyContactsLimit || 35,
    daily_sequence_limit: settings.dailySequenceLimit || 100,
    active_days: settings.activeDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    sending_start_time: settings.sendingStartTime || '08:00 AM',
    sending_end_time: settings.sendingEndTime || '05:00 PM',
    signature_data: settings.signature || {},
    updated_at: new Date().toISOString()
  }

  // Try to update existing settings first
  const { data: existing } = await supabaseServer
    .from("campaign_settings")
    .select("id")
    .eq("campaign_id", campaignId)
    .single()

  if (existing) {
    const { error: updateError } = await supabaseServer
      .from("campaign_settings")
      .update(settingsData)
      .eq("campaign_id", campaignId)

    if (updateError) {
      throw new Error(`Failed to update settings: ${updateError.message}`)
    }
  } else {
    const { error: insertError } = await supabaseServer
      .from("campaign_settings")
      .insert(settingsData)

    if (insertError) {
      throw new Error(`Failed to create settings: ${insertError.message}`)
    }
  }
}

// Helper function to save sender accounts (now stores account IDs as selected senders)
async function saveSenderAccounts(campaignId: string, senderAccounts: string[]) {
  if (!senderAccounts) return

  // Update all accounts for this campaign to mark them as not selected
  await supabaseServer
    .from("campaign_senders")
    .update({ is_selected: false })
    .eq("campaign_id", campaignId)

  if (senderAccounts.length > 0) {
    // Mark selected accounts as selected
    const { error: updateError } = await supabaseServer
      .from("campaign_senders")
      .update({ is_selected: true })
      .eq("campaign_id", campaignId)
      .in("id", senderAccounts)

    if (updateError) {
      throw new Error(`Failed to save sender selection: ${updateError.message}`)
    }
  }
}

// Helper function to save campaign basics
async function saveCampaignBasics(campaignId: string, campaignData: any) {
  const updateData = {
    name: campaignData.name,
    status: campaignData.status,
    updated_at: new Date().toISOString()
  }

  const { error: updateError } = await supabaseServer
    .from("campaigns")
    .update(updateData)
    .eq("id", campaignId)

  if (updateError) {
    throw new Error(`Failed to update campaign: ${updateError.message}`)
  }
}

// Helper function to save connected accounts
async function saveConnectedAccounts(userId: string, connectedAccounts: any) {
  // This is handled separately by individual account connection flows
  // We could store account preferences here if needed
}

// Helper function to save scraping settings
async function saveScrapingSettings(campaignId: string, scrapingSettings: any) {
  if (!scrapingSettings) return

  const scrapingData = {
    campaign_id: campaignId,
    is_active: scrapingSettings.isActive || false,
    daily_limit: scrapingSettings.dailyLimit || 100,
    industry: scrapingSettings.industry || '',
    keyword: scrapingSettings.keyword || '',
    location: scrapingSettings.location || '',
    updated_at: new Date().toISOString()
  }

  // Try to update existing scraping settings first
  const { data: existing } = await supabaseServer
    .from("campaign_scraping_settings")
    .select("id")
    .eq("campaign_id", campaignId)
    .single()

  if (existing) {
    const { error: updateError } = await supabaseServer
      .from("campaign_scraping_settings")
      .update(scrapingData)
      .eq("campaign_id", campaignId)

    if (updateError) {
      throw new Error(`Failed to update scraping settings: ${updateError.message}`)
    }
  } else {
    const { error: insertError } = await supabaseServer
      .from("campaign_scraping_settings")
      .insert(scrapingData)

    if (insertError) {
      throw new Error(`Failed to create scraping settings: ${insertError.message}`)
    }
  }
}

// ============================================
// FETCH HELPER FUNCTIONS
// ============================================

// Helper function to fetch sequences
async function fetchSequences(campaignId: string) {
  const { data, error } = await supabaseServer
    .from("campaign_sequences")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("step_number", { ascending: true })

  if (error) {
    console.error("Error fetching sequences:", error)
    return []
  }

  // Transform database format back to component format
  return data.map((seq, index) => ({
    id: index + 1,
    subject: seq.subject || "",
    content: seq.content || "",
    timing: seq.timing_days || 1,
    variants: seq.variants || 1,
    sequence: seq.sequence_number || 1,
    sequenceStep: seq.sequence_step || 1,
    title: seq.title || `Email ${index + 1}`,
    outreach_method: seq.outreach_method || "email"
  }))
}

// Helper function to fetch settings
async function fetchSettings(campaignId: string) {
  const { data, error } = await supabaseServer
    .from("campaign_settings")
    .select("*")
    .eq("campaign_id", campaignId)
    .single()

  if (error || !data) {
    // Return defaults if no settings found
    return {
      dailyContactsLimit: 35,
      dailySequenceLimit: 100,
      activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      sendingStartTime: '08:00 AM',
      sendingEndTime: '05:00 PM',
      signature: {
        firstName: 'Loop',
        lastName: 'Review',
        companyName: 'LeadsUp',
        companyWebsite: 'https://www.leadsup.com',
        emailSignature: '<br/><br/>Best regards,<br/><strong>Loop Review</strong><br/>LeadsUp<br/><a href="https://www.leadsup.com" target="_blank">https://www.leadsup.com</a>'
      }
    }
  }

  return {
    dailyContactsLimit: data.daily_contacts_limit,
    dailySequenceLimit: data.daily_sequence_limit,
    activeDays: data.active_days,
    sendingStartTime: data.sending_start_time,
    sendingEndTime: data.sending_end_time,
    signature: data.signature_data || {}
  }
}

// Helper function to fetch sender accounts
async function fetchSenders(campaignId: string) {
  const { data, error } = await supabaseServer
    .from("campaign_senders")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("is_selected", true)

  if (error) {
    console.error("Error fetching senders:", error)
    return []
  }

  return data.map(sender => sender.id)
}

// Helper function to fetch scraping settings
async function fetchScrapingSettings(campaignId: string) {
  const { data, error } = await supabaseServer
    .from("campaign_scraping_settings")
    .select("*")
    .eq("campaign_id", campaignId)
    .single()

  if (error || !data) {
    return {
      isActive: false,
      dailyLimit: 100,
      industry: '',
      keyword: '',
      location: ''
    }
  }

  return {
    isActive: data.is_active,
    dailyLimit: data.daily_limit,
    industry: data.industry,
    keyword: data.keyword,
    location: data.location
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

  // If campaign ID is provided, filter by campaign
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

  // Transform to match expected format
  return (data || []).map(account => ({
    ...account,
    health_score: 85, // Default value for Microsoft365
    daily_limit: 50, // Default value
    is_active: true // Assume active if it exists
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

  // Transform to match expected format
  return (data || []).map(account => ({
    ...account,
    health_score: 75, // Default value for SMTP
    daily_limit: 50, // Default value
    is_active: true // Assume active if it exists
  }))
}