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

// Helper function to save sender accounts
async function saveSenderAccounts(campaignId: string, senderAccounts: string[]) {
  if (!senderAccounts) return

  // Delete existing sender associations
  await supabaseServer
    .from("campaign_senders")
    .delete()
    .eq("campaign_id", campaignId)

  if (senderAccounts.length > 0) {
    // Insert new sender associations
    const senderData = senderAccounts.map(accountId => ({
      campaign_id: campaignId,
      sender_account_id: accountId,
      created_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabaseServer
      .from("campaign_senders")
      .insert(senderData)

    if (insertError) {
      throw new Error(`Failed to save sender accounts: ${insertError.message}`)
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