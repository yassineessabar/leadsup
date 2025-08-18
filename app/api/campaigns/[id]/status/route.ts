import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSupabaseServerClient } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await getSupabaseServerClient()
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
    
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('❌ Error parsing request body:', error)
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 })
    }
    
    const { status } = body || {}

    // Validate status
    const validStatuses = ["Draft", "Active", "Paused", "Completed", "Warming"]
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid status. Must be one of: Draft, Active, Paused, Completed, Warming" 
      }, { status: 400 })
    }

    console.log(`🔄 Updating campaign ${campaignId} status to: ${status}`)

    // First verify the campaign belongs to the user
    const { data: existingCampaign, error: verifyError } = await getSupabaseServerClient()
      .from("campaigns")
      .select("id, name, status")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (verifyError || !existingCampaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Update the campaign status
    const { data: updatedCampaign, error: updateError } = await getSupabaseServerClient()
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

    // If campaign is being launched (set to Active or Warming), trigger n8n automation setup
    if ((status === 'Active' || status === 'Warming') && existingCampaign.status !== 'Active' && existingCampaign.status !== 'Warming') {
      await triggerCampaignAutomation(campaignId, updatedCampaign.name, status === 'Warming')
    }

    // Handle scheduled emails based on status changes
    await handleScheduledEmailsForStatusChange(campaignId, status, existingCampaign.status)

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
async function triggerCampaignAutomation(campaignId: string, campaignName: string, isWarmup: boolean = false) {
  try {
    if (isWarmup) {
      console.log(`🔥 Triggering warmup automation for campaign: ${campaignName}`)
    } else {
      console.log(`🚀 Triggering n8n automation for campaign: ${campaignName}`)
    }
    
    // Initialize contacts for this campaign with their sequence schedules
    // For warmup mode, this might initialize with different timing/volume limits
    await initializeCampaignSequences(campaignId, isWarmup)
    
    // Optional: Trigger immediate processing (if you want instant start)
    // You can uncomment this to trigger n8n immediately instead of waiting for the cron
    // await triggerN8nWebhook(campaignId)
    
    console.log(`✅ Campaign automation ${isWarmup ? 'warmup' : ''} initialized for: ${campaignName}`)
  } catch (error) {
    console.error('❌ Error triggering campaign automation:', error)
  }
}

// Helper function to initialize contact sequences when campaign launches
async function initializeCampaignSequences(campaignId: string, isWarmup: boolean = false) {
  try {
    // Get all contacts for this campaign
    const { data: contacts } = await getSupabaseServerClient()
      .from('contacts')
      .select('id, email, first_name, last_name')
      .eq('campaign_id', campaignId)

    if (!contacts || contacts.length === 0) {
      console.log('No contacts found for campaign')
      return
    }

    // Get first sequence step for this campaign
    const { data: firstSequence } = await getSupabaseServerClient()
      .from('campaign_sequences')
      .select('id, timing_days')
      .eq('campaign_id', campaignId)
      .eq('step_number', 1)
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

    // Insert contact sequences (only if table exists)
    try {
      const { error: insertError } = await getSupabaseServerClient()
        .from('contact_sequences')
        .insert(contactSequences)

      if (insertError) {
        console.error('Error initializing contact sequences:', insertError)
        throw insertError
      }
      
      console.log(`✅ Initialized sequences for ${contacts.length} contacts`)
    } catch (error) {
      console.log('ℹ️ Contact sequences table not available - skipping initialization')
    }
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

// Handle scheduled emails when campaign status changes
async function handleScheduledEmailsForStatusChange(campaignId: string, newStatus: string, previousStatus: string) {
  try {
    console.log(`📧 Handling scheduled emails for campaign ${campaignId}: ${previousStatus} → ${newStatus}`)

    // If campaign is being paused, mark pending emails as paused and update contact statuses
    if (newStatus === 'Paused' && previousStatus === 'Active') {
      try {
        // Pause scheduled emails
        const { error } = await getSupabaseServerClient()
          .from('scheduled_emails')
          .update({ status: 'paused' })
          .eq('campaign_id', campaignId)
          .eq('status', 'pending')

        if (error && error.code !== 'PGRST205') {
          console.error('Error pausing scheduled emails:', error)
        } else if (!error) {
          console.log('✅ Paused all pending scheduled emails')
        }
      } catch (error) {
        console.log('ℹ️ Scheduled emails table not found - skipping pause operation')
      }

      // Update contact statuses to show they are paused (except completed/replied contacts)
      try {
        const { data: pausedContacts, error: contactsError } = await getSupabaseServerClient()
          .from('contacts')
          .update({ 
            email_status: 'Paused',
            updated_at: new Date().toISOString()
          })
          .eq('campaign_id', campaignId)
          .not('email_status', 'in', '(Completed,Replied,Unsubscribed,Bounced)')
          .select('id, email, first_name, last_name')

        if (contactsError) {
          console.error('Error updating contact statuses to paused:', contactsError)
        } else {
          console.log(`✅ Updated ${pausedContacts?.length || 0} contacts to Paused status`)
        }
      } catch (error) {
        console.error('Error updating contact statuses:', error)
      }
    }

    // If campaign is transitioning from Warming to Active, log the transition
    if (newStatus === 'Active' && previousStatus === 'Warming') {
      console.log('✅ Campaign warmup completed - transitioning to Active status')
    }

    // If campaign is being resumed, reschedule upcoming emails with updated timing and restore contact statuses
    if (newStatus === 'Active' && previousStatus === 'Paused') {
      console.log('🔄 Campaign resumed - rescheduling upcoming emails with updated timing')
      
      try {
        // First, mark paused emails back to pending
        const { error: unpauseError } = await getSupabaseServerClient()
          .from('scheduled_emails')
          .update({ status: 'pending' })
          .eq('campaign_id', campaignId)
          .eq('status', 'paused')

        if (unpauseError && unpauseError.code !== 'PGRST205') {
          console.error('Error unpausing scheduled emails:', unpauseError)
        } else if (!unpauseError) {
          console.log('✅ Unpaused scheduled emails')
        }

        // Then reschedule all upcoming emails (not sent ones)
        const rescheduleResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/campaigns/${campaignId}/reschedule-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (rescheduleResponse.ok) {
          const result = await rescheduleResponse.json()
          console.log(`✅ Rescheduled ${result.rescheduled_count || 0} upcoming emails with updated timing`)
        } else {
          const errorText = await rescheduleResponse.text()
          console.error('❌ Failed to reschedule emails:', rescheduleResponse.status, errorText)
        }
      } catch (error) {
        console.log('ℹ️ Email rescheduling not available - scheduled_emails table missing')
      }

      // Restore contact statuses from Paused back to their active state
      try {
        const { data: resumedContacts, error: contactsError } = await getSupabaseServerClient()
          .from('contacts')
          .update({ 
            email_status: 'Valid', // Resume to Valid status for active contacts
            updated_at: new Date().toISOString()
          })
          .eq('campaign_id', campaignId)
          .eq('email_status', 'Paused')
          .select('id, email, first_name, last_name')

        if (contactsError) {
          console.error('Error restoring contact statuses from paused:', contactsError)
        } else {
          console.log(`✅ Restored ${resumedContacts?.length || 0} contacts from Paused to Valid status`)
        }
      } catch (error) {
        console.error('Error restoring contact statuses:', error)
      }
    }

    // If campaign is completed, cancel all pending/paused emails
    if (newStatus === 'Completed') {
      try {
        const { error } = await getSupabaseServerClient()
          .from('scheduled_emails')
          .update({ status: 'cancelled' })
          .eq('campaign_id', campaignId)
          .in('status', ['pending', 'paused'])

        if (error && error.code !== 'PGRST205') {
          console.error('Error cancelling scheduled emails:', error)
        } else if (!error) {
          console.log('✅ Cancelled all pending/paused scheduled emails')
        }
      } catch (error) {
        console.log('ℹ️ Scheduled emails table not found - skipping cancel operation')
      }
    }

  } catch (error) {
    console.error('❌ Error handling scheduled emails for status change:', error)
  }
}