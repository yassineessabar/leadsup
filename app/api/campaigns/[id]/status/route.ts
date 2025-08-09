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

    // If campaign is being launched (set to Active), trigger n8n automation setup
    if (status === 'Active' && existingCampaign.status !== 'Active') {
      await triggerCampaignAutomation(campaignId, updatedCampaign.name)
    }

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

// Helper function to trigger n8n automation when campaign is launched
async function triggerCampaignAutomation(campaignId: string, campaignName: string) {
  try {
    console.log(`🚀 Triggering n8n automation for campaign: ${campaignName}`)
    
    // Initialize contacts for this campaign with their sequence schedules
    await initializeCampaignSequences(campaignId)
    
    // Optional: Trigger immediate processing (if you want instant start)
    // You can uncomment this to trigger n8n immediately instead of waiting for the cron
    // await triggerN8nWebhook(campaignId)
    
    console.log(`✅ Campaign automation initialized for: ${campaignName}`)
  } catch (error) {
    console.error('❌ Error triggering campaign automation:', error)
  }
}

// Helper function to initialize contact sequences when campaign launches
async function initializeCampaignSequences(campaignId: string) {
  try {
    // Get all contacts for this campaign
    const { data: contacts } = await supabaseServer
      .from('contacts')
      .select('id, email, firstName, lastName')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')

    if (!contacts || contacts.length === 0) {
      console.log('No active contacts found for campaign')
      return
    }

    // Get first sequence step for this campaign
    const { data: firstSequence } = await supabaseServer
      .from('campaign_sequences')
      .select('id, timing_days')
      .eq('campaign_id', campaignId)
      .eq('sequence_number', 1)
      .eq('sequence_step', 1)
      .single()

    if (!firstSequence) {
      console.log('No first sequence found for campaign')
      return
    }

    // Schedule first email for each contact
    const contactSequences = contacts.map(contact => {
      const scheduledFor = new Date()
      // Add timing delay (or send immediately if timing is 0)
      if (firstSequence.timing_days > 0) {
        scheduledFor.setDate(scheduledFor.getDate() + firstSequence.timing_days)
      }

      return {
        contact_id: contact.id,
        sequence_id: firstSequence.id,
        status: 'pending',
        scheduled_for: scheduledFor.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    // Insert contact sequences
    const { error: insertError } = await supabaseServer
      .from('contact_sequences')
      .insert(contactSequences)

    if (insertError) {
      console.error('Error initializing contact sequences:', insertError)
      throw insertError
    }

    console.log(`✅ Initialized sequences for ${contacts.length} contacts`)
  } catch (error) {
    console.error('Error in initializeCampaignSequences:', error)
    throw error
  }
}

// Optional: Function to trigger n8n webhook immediately
async function triggerN8nWebhook(campaignId: string) {
  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
    if (!n8nWebhookUrl) {
      console.log('N8N_WEBHOOK_URL not configured, skipping immediate trigger')
      return
    }

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaignId,
        trigger: 'campaign_launched',
        timestamp: new Date().toISOString()
      })
    })

    if (response.ok) {
      console.log('✅ Successfully triggered n8n webhook')
    } else {
      console.error('❌ Failed to trigger n8n webhook:', response.statusText)
    }
  } catch (error) {
    console.error('❌ Error triggering n8n webhook:', error)
  }
}