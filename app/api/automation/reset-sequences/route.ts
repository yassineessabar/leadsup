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

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { campaignId } = await request.json()

    // Get user's campaigns first to ensure we only reset their contacts
    const { data: userCampaigns, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('id')
      .eq('user_id', userId)

    if (campaignError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch user campaigns' 
      }, { status: 500 })
    }

    const userCampaignIds = userCampaigns?.map(c => c.id) || []

    if (userCampaignIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No campaigns found for user',
        resetCount: 0,
        runId: crypto.randomUUID()
      })
    }

    // Additional safety check for campaign ID
    if (campaignId && !userCampaignIds.includes(campaignId)) {
      return NextResponse.json({
        success: false,
        error: 'Campaign not found or access denied'
      }, { status: 403 })
    }

    // Get contacts count before reset
    let contactsQuery = supabaseServer
      .from('contacts')
      .select('*', { count: 'exact', head: true })

    if (campaignId) {
      contactsQuery = contactsQuery.eq('campaign_id', campaignId)
    } else {
      contactsQuery = contactsQuery.in('campaign_id', userCampaignIds)
    }

    const { count: totalContacts } = await contactsQuery

    // Prepare update data - only update fields that exist
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Get a sample contact to check what columns exist
    const { data: sampleContact } = await supabaseServer
      .from('contacts')
      .select('*')
      .limit(1)
      .single()

    if (sampleContact) {
      // Only update fields that exist in the table
      if ('current_sequence_step' in sampleContact) {
        updateData.current_sequence_step = 0
      }
      
      if ('last_contacted_at' in sampleContact) {
        updateData.last_contacted_at = null
      }
      
      
      if ('tags' in sampleContact) {
        updateData.tags = ['new'] // Reset to new contact
      }
      
      if ('email_sent_count' in sampleContact) {
        updateData.email_sent_count = 0
      }
    }

    // Reset contacts to sequence 0
    let resetQuery = supabaseServer
      .from('contacts')
      .update(updateData)

    if (campaignId) {
      // Reset contacts for specific campaign
      resetQuery = resetQuery.eq('campaign_id', campaignId)
    } else {
      // Reset contacts for all user's campaigns
      resetQuery = resetQuery.in('campaign_id', userCampaignIds)
    }

    const { error } = await resetQuery

    if (error) {
      console.error('Error resetting sequences:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    // Log the reset action
    const runId = crypto.randomUUID()
    await supabaseServer
      .from('automation_logs')
      .insert({
        run_id: runId,
        campaign_id: campaignId || null,
        log_type: 'sequence_reset',
        status: 'success',
        message: `🔄 Sequence Reset: All contacts reset to sequence 0 (${totalContacts || 0} contacts affected)`,
        details: {
          contactsReset: totalContacts || 0,
          resetBy: userId,
          resetAt: new Date().toISOString(),
          scope: campaignId ? 'single_campaign' : 'all_campaigns',
          campaignId: campaignId || null,
          fieldsUpdated: Object.keys(updateData).filter(key => key !== 'updated_at')
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: campaignId 
        ? `Successfully reset ${totalContacts || 0} contacts in campaign to sequence 0`
        : `Successfully reset ${totalContacts || 0} contacts across all campaigns to sequence 0`,
      resetCount: totalContacts || 0,
      runId,
      scope: campaignId ? 'single_campaign' : 'all_campaigns'
    })

  } catch (error) {
    console.error('Error in POST /api/automation/reset-sequences:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
}