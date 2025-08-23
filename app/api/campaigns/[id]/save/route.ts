import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase, supabaseServer } from "@/lib/supabase"
import { monitoredQuery } from "@/lib/performance"

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

    // Verify campaign belongs to user with performance monitoring
    const { data: campaign, error: campaignError } = await monitoredQuery(
      `Campaign verification for ${campaignId}`,
      () => supabaseServer
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .eq("user_id", userId)
        .single()
    )

    if (campaignError || !campaign) {
        return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Only fetch essential data initially - lazy load the rest when needed
    const [
      settings,
      senders
    ] = await Promise.all([
      fetchSettings(campaignId),
      fetchSenders(campaignId)
    ])

    // Fetch sequences and accounts only if needed (when tab is accessed)
    const sequences = []
    const connectedAccounts = {
      gmail: [],
      microsoft365: [],
      smtp: []
    }

    const campaignData = {
      campaign,
      sequences,
      settings,
      senders,
      connectedAccounts
    }

    return NextResponse.json({ success: true, data: campaignData })

  } catch (error) {
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

    console.log('📥 POST /api/campaigns/[id]/save received:', {
      campaignId,
      saveType,
      campaignDataKeys: campaignData ? Object.keys(campaignData) : 'campaignData is null/undefined'
    })

    if (!campaignData) {
      console.error('❌ Missing campaignData in request body')
      return NextResponse.json({ success: false, error: "Missing campaignData in request body" }, { status: 400 })
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

    if (saveType === 'all' || saveType === 'scraping') {
      await saveScrapingConfig(campaignId, campaignData.scrapingConfig)
    }

    if (saveType === 'keywords') {
      await saveCampaignKeywords(campaignId, campaignData.keywords)
    }

    if (saveType === 'all') {
      // Save basic campaign info
      await saveCampaignBasics(campaignId, campaignData)
      
      // Save connected accounts
      await saveConnectedAccounts(userId, campaignData.connectedAccounts)
    }

    return NextResponse.json({ success: true, message: "Campaign data saved successfully" })

  } catch (error) {
    console.error('❌ Error in POST /api/campaigns/[id]/save:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
}

// Helper function to save sequences
async function saveSequences(campaignId: string, sequences: any[]) {
  if (!sequences || sequences.length === 0) return

  console.log(`💾 Saving ${sequences.length} sequences for campaign ${campaignId}`)
  console.log('📝 Sequence data received:', JSON.stringify(sequences.map(s => ({ 
    id: s.id, 
    title: s.title, 
    subject: s.subject, 
    sequence: s.sequence, 
    sequenceStep: s.sequenceStep, 
    timing: s.timing 
  })), null, 2))

  // First delete existing sequences to avoid conflicts
  const { error: deleteError } = await supabaseServer
    .from("campaign_sequences")
    .delete()
    .eq("campaign_id", campaignId)

  if (deleteError) {
    console.error("❌ Error deleting existing sequences:", deleteError)
    throw new Error(`Failed to delete existing sequences: ${deleteError.message}`)
  }

  // Create unique sequence data with guaranteed unique step_numbers
  const sequenceData = sequences.map((seq: any, index: number) => ({
    campaign_id: campaignId,
    step_number: index + 1, // Use array index for guaranteed uniqueness
    subject: seq.subject || `Email ${index + 1} Subject`,
    content: seq.content || "",
    timing_days: seq.timing || (index === 0 ? 0 : seq.timing || 1),
    variants: seq.variants || 1,
    outreach_method: seq.outreach_method || seq.type || "email",
    sequence_number: seq.sequence || 1,
    sequence_step: index + 1, // Use array index for guaranteed uniqueness
    title: seq.title || `Email ${index + 1}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))

  console.log('💽 Data being inserted to database:', JSON.stringify(sequenceData, null, 2))

  // Insert new sequences
  const { data: insertedData, error: insertError } = await supabaseServer
    .from("campaign_sequences")
    .insert(sequenceData)
    .select()

  if (insertError) {
    console.error("❌ Error inserting sequences:", insertError)
    throw new Error(`Failed to save sequences: ${insertError.message}`)
  }

  console.log(`✅ Successfully saved ${sequenceData.length} sequences`)
  return insertedData
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
  try {
    if (!senderAccounts) {
      console.log('⚠️ saveSenderAccounts called with null/undefined senderAccounts')
      return
    }

  console.log(`💾 saveSenderAccounts called for campaign ${campaignId}`)
  console.log(`📋 senderAccounts parameter:`, senderAccounts)

  // First check what's currently in the campaign_senders table
  const { data: existingSenders, error: checkError } = await supabaseServer
    .from("campaign_senders")
    .select("*")
    .eq("campaign_id", campaignId)
  
  console.log('🔍 Current campaign_senders data:', existingSenders)
  if (checkError) {
    console.error('❌ Error checking existing senders:', checkError)
  }

  // If no existing records, we need to create them first
  if (!existingSenders || existingSenders.length === 0) {
    console.log('🔄 No existing records found - need to create campaign_senders records first')
    
    // Get all available sender accounts for the user to create the base records
    const { data: allSenderAccounts, error: sendersError } = await supabaseServer
      .from("sender_accounts")
      .select(`
        id,
        email,
        display_name,
        domain_id,
        domains:domain_id (
          user_id,
          status
        )
      `)
      .eq("domains.status", "verified")
    
    if (sendersError) {
      console.error('❌ Error fetching sender accounts:', sendersError)
      throw new Error(`Failed to fetch sender accounts: ${sendersError.message}`)
    }

    // Filter for user's verified domains only
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("user_id")
      .eq("id", campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new Error("Campaign not found")
    }

    const userSenderAccounts = allSenderAccounts?.filter(sender => 
      sender.domains?.user_id === campaign.user_id
    ) || []

    console.log(`🔄 Creating ${userSenderAccounts.length} campaign_senders records...`)

    if (userSenderAccounts.length > 0) {
      // Create base records for all user's sender accounts
      const baseRecords = userSenderAccounts.map(sender => ({
        campaign_id: campaignId,
        email: sender.email,
        name: sender.display_name || sender.email.split('@')[0],
        is_selected: senderAccounts.includes(sender.id),
        sender_type: 'email',
        is_active: true,
        user_id: campaign.user_id
      }))

      const { error: insertError } = await supabaseServer
        .from("campaign_senders")
        .insert(baseRecords)

      if (insertError) {
        console.error('❌ Error creating campaign_senders records:', insertError)
        throw new Error(`Failed to create sender records: ${insertError.message}`)
      }

      console.log(`✅ Successfully created ${baseRecords.length} campaign_senders records`)
    }
  } else {
    // Update existing records
    console.log('🔄 Updating existing campaign_senders records...')
    
    // Update all accounts for this campaign to mark them as not selected
    console.log('🔄 Marking all campaign senders as not selected...')
    const { error: unselectError } = await supabaseServer
      .from("campaign_senders")
      .update({ is_selected: false })
      .eq("campaign_id", campaignId)

    if (unselectError) {
      console.error('❌ Error unsetting all senders:', unselectError)
      throw new Error(`Failed to unselect all senders: ${unselectError.message}`)
    }

    if (senderAccounts.length > 0) {
      console.log(`🔄 Marking ${senderAccounts.length} accounts as selected:`, senderAccounts)
      
      // Since sender_id column doesn't exist, we need to match by email
      // First get the emails for the selected sender account IDs
      console.log(`🔍 Looking up emails for sender IDs:`, senderAccounts)
      
      const { data: selectedSenderDetails, error: senderError } = await supabaseServer
        .from("sender_accounts")
        .select("id, email")
        .in("id", senderAccounts)
      
      console.log(`🔍 Found sender details:`, selectedSenderDetails)
      
      if (senderError || !selectedSenderDetails) {
        console.error('❌ Error fetching sender details:', senderError)
        throw new Error(`Failed to fetch sender details: ${senderError?.message}`)
      }

      const selectedEmails = selectedSenderDetails.map(sender => sender.email)
      console.log(`🔄 Matching by emails:`, selectedEmails)
      console.log(`⚠️ Warning: Input ${senderAccounts.length} IDs but found ${selectedSenderDetails.length} sender accounts`)
      
      // First check which records actually exist for these emails
      const { data: existingRecords, error: checkError } = await supabaseServer
        .from("campaign_senders")
        .select("email, is_selected")
        .eq("campaign_id", campaignId)
        .in("email", selectedEmails)
      
      console.log(`🔍 Existing records for selected emails:`, existingRecords)
      
      if (checkError) {
        console.error('❌ Error checking existing records:', checkError)
      }

      // Find which emails are missing records
      const existingEmails = existingRecords?.map(record => record.email) || []
      const missingEmails = selectedEmails.filter(email => !existingEmails.includes(email))
      
      console.log(`🔍 Missing emails (need to create records):`, missingEmails)

      // Create missing records first
      if (missingEmails.length > 0) {
        // Get sender details for missing emails
        const missingSenderDetails = selectedSenderDetails.filter(sender => 
          missingEmails.includes(sender.email)
        )

        // Get campaign info for user_id
        const { data: campaign, error: campaignError } = await supabaseServer
          .from("campaigns")
          .select("user_id")
          .eq("id", campaignId)
          .single()

        if (campaignError || !campaign) {
          throw new Error("Campaign not found")
        }

        const newRecords = missingSenderDetails.map(sender => ({
          campaign_id: campaignId,
          email: sender.email,
          name: sender.email.split('@')[0], // Use 'name' not 'display_name'
          is_selected: true, // Create as selected since this is a save operation
          sender_type: 'email',
          is_active: true,
          user_id: campaign.user_id
        }))

        console.log(`🔄 Creating ${newRecords.length} missing records:`, newRecords)

        const { error: insertError } = await supabaseServer
          .from("campaign_senders")
          .insert(newRecords)

        if (insertError) {
          console.error('❌ Error creating missing records:', insertError)
          throw new Error(`Failed to create missing sender records: ${insertError.message}`)
        }

        console.log(`✅ Successfully created ${newRecords.length} missing records`)
      }
      
      // Now update existing records (only those that already existed)
      if (existingEmails.length > 0) {
        const { data: updateResult, error: updateError } = await supabaseServer
          .from("campaign_senders")
          .update({ is_selected: true })
          .eq("campaign_id", campaignId)
          .in("email", existingEmails)
          .select("email, is_selected")
        
        console.log(`🔍 Update result for existing records:`, updateResult)

        if (updateError) {
          console.error('❌ Error updating existing records:', updateError)
          throw new Error(`Failed to update existing sender selection: ${updateError.message}`)
        }
      }
      
      console.log(`✅ Successfully processed ${senderAccounts.length} sender selections (${missingEmails.length} created, ${existingEmails.length} updated)`)
    } else {
      console.log('✅ No senders to select - all have been unselected')
    }
  }
  } catch (error) {
    console.error('❌ Error in saveSenderAccounts:', error)
    throw error // Re-throw to be caught by the main POST handler
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

  if (!data || data.length === 0) {
    console.log("No sequences found for campaign:", campaignId)
    return []
  }

  console.log(`📖 Fetched ${data.length} sequences from database for campaign ${campaignId}`)
  console.log('🔍 Raw database data:', JSON.stringify(data, null, 2))

  // Transform database format back to component format
  const transformedSequences = data.map((seq) => ({
    id: seq.step_number, // Use step_number as frontend ID for consistency
    type: seq.outreach_method || "email",
    subject: seq.subject || "",
    content: seq.content || "",
    timing: seq.timing_days || (seq.step_number === 1 ? 0 : 1),
    variants: seq.variants || 1,
    sequence: seq.sequence_number || 1,
    sequenceStep: seq.sequence_step || seq.step_number,
    title: seq.title || `Email ${seq.sequence_step || seq.step_number}`,
    outreach_method: seq.outreach_method || "email",
    // Keep database metadata for debugging
    _dbId: seq.id,
    _stepNumber: seq.step_number
  }))

  console.log('🔄 Transformed sequences for frontend:', JSON.stringify(transformedSequences.map(s => ({
    id: s.id,
    title: s.title,
    subject: s.subject,
    timing: s.timing,
    sequence: s.sequence,
    sequenceStep: s.sequenceStep
  })), null, 2))

  return transformedSequences
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

// Helper function to save campaign keywords
async function saveCampaignKeywords(campaignId: string, keywords: string[]) {
  if (!keywords) {
    console.log('⚠️ saveCampaignKeywords called with null/undefined keywords')
    return
  }

  console.log(`💾 [API] Saving keywords for campaign ${campaignId}:`, keywords)

  const updateData = {
    keywords: keywords,
    updated_at: new Date().toISOString()
  }

  const { error: updateError } = await supabaseServer
    .from("campaigns")
    .update(updateData)
    .eq("id", campaignId)

  if (updateError) {
    console.error("❌ [API] Error saving campaign keywords:", updateError)
    throw new Error(`Failed to save campaign keywords: ${updateError.message}`)
  }

  console.log(`✅ [API] Successfully saved ${keywords.length} keywords for campaign ${campaignId}`)
}

// Helper function to save scraping configuration
async function saveScrapingConfig(campaignId: string, scrapingConfig: any) {
  if (!scrapingConfig) return

  console.log(`💾 Saving scraping config for campaign ${campaignId}`, scrapingConfig)

  // Update campaign with scraping configuration using actual table columns
  const updateData = {
    industry: scrapingConfig.industry || '',
    keywords: scrapingConfig.keywords || [],
    location: scrapingConfig.location || '',
    scrapping_status: scrapingConfig.scrappingStatus || 'Active', // Set to Active when scraping is started
    updated_at: new Date().toISOString()
  }

  const { error: updateError } = await supabaseServer
    .from("campaigns")
    .update(updateData)
    .eq("id", campaignId)

  if (updateError) {
    console.error("❌ Error saving scraping config:", updateError)
    throw new Error(`Failed to save scraping configuration: ${updateError.message}`)
  }

  console.log(`✅ Successfully saved scraping config for campaign ${campaignId}`)
}