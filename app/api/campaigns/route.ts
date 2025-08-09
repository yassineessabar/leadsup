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
  } catch (err) {
    console.error("Error in getUserIdFromSession:", err)
    return null
  }
}

// GET - Fetch all campaigns for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Fetch campaigns without related data for better performance
    const { data: campaigns, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (campaignError) {
      console.error("❌ Error fetching campaigns:", campaignError)
      return NextResponse.json({ success: false, error: campaignError.message }, { status: 500 })
    }

    // Format the data for frontend consumption (without sequences/schedules for performance)
    const formattedCampaigns = campaigns?.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      trigger: campaign.trigger_type,
      status: campaign.status,
      progress: campaign.status === "Active" ? Math.floor(Math.random() * 100) : null, // TODO: Calculate real progress
      sent: campaign.status === "Active" ? Math.floor(Math.random() * 500) : null, // TODO: Get real metrics
      click: campaign.status === "Active" ? Math.floor(Math.random() * 50) : null, // TODO: Get real metrics
      replied: campaign.status === "Active" ? Math.floor(Math.random() * 25) : null, // TODO: Get real metrics
      opportunities: campaign.status === "Active" ? `${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}%` : null, // TODO: Get real metrics
      sequences: [], // Load separately when needed
      schedules: [], // Load separately when needed
      created_at: campaign.created_at,
      updated_at: campaign.updated_at
    })) || []

    return NextResponse.json({
      success: true,
      data: formattedCampaigns
    })
  } catch (error) {
    console.error("❌ Error fetching campaign data:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, trigger } = body

    // Create the campaign (using frontend format as database expects it)
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .insert({
        user_id: userId,
        name: name,
        type: type,
        trigger_type: trigger, // Use trigger as-is from frontend
        status: "Draft"
      })
      .select()
      .single()

    if (campaignError) {
      console.error("❌ Error creating campaign:", campaignError)
      console.error("❌ Full error details:", JSON.stringify(campaignError, null, 2))
      return NextResponse.json({ 
        success: false, 
        error: campaignError.message,
        details: "Please run the database constraint fix script: scripts/remove-trigger-constraint.sql"
      }, { status: 500 })
    }

    // Create default sequences for the campaign
    const defaultSequences = type === "SMS" ? [
      {
        campaign_id: campaign.id,
        step_number: 1,
        subject: null,
        content: "Hi {{firstName}}! Thanks for choosing {{companyName}}. We'd love your feedback! Reply with a quick review or click here: bit.ly/review-link",
        timing_days: 1,
        variants: 1
      }
    ] : [
      {
        campaign_id: campaign.id,
        step_number: 1,
        subject: "Welcome to Loop Review!",
        content: "Hi {{firstName}},\n\nWelcome to Loop Review! We're excited to help you manage your online reputation.\n\nBest regards,\nThe Loop Team",
        timing_days: 1,
        variants: 1
      },
      {
        campaign_id: campaign.id,
        step_number: 2,
        subject: "Follow up - How are you finding Loop Review?",
        content: "Hi {{firstName}},\n\nHow has your experience been with Loop Review so far? We'd love to hear your feedback!\n\nLet us know if you have any questions.\n\nBest regards,\nThe Loop Team",
        timing_days: 3,
        variants: 1
      }
    ]

    const { data: sequences, error: sequenceError } = await supabaseServer
      .from("campaign_sequences")
      .insert(defaultSequences)
      .select()

    if (sequenceError) {
      console.error("❌ Error creating sequences:", sequenceError)
      // Don't fail campaign creation if sequences fail, we can add them later
    }

    // Create default schedule
    const { data: schedule, error: scheduleError } = await supabaseServer
      .from("campaign_schedules")
      .insert({
        campaign_id: campaign.id,
        name: "New schedule",
        is_active: true,
        from_time: "9:00 AM",
        to_time: "6:00 PM",
        timezone: "eastern",
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      })
      .select()
      .single()

    if (scheduleError) {
      console.error("❌ Error creating schedule:", scheduleError)
      // Don't fail campaign creation if schedule fails
    }

    // Return the created campaign with sequences and schedules
    const campaignWithData = {
      ...campaign,
      sequences: sequences || [],
      schedules: schedule ? [schedule] : []
    }

    return NextResponse.json({ success: true, data: campaignWithData })

  } catch (error) {
    console.error("❌ Error creating campaign:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Trigger automation for existing customers when templates are updated
 */
async function triggerAutomationForExistingCustomers(
  userId: string,
  templateType: 'email' | 'sms',
  initialTrigger: string,
  initialWaitDays: number
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Get recent reviews for this user (last 30 days) that don't have pending automation jobs
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentReviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("id, customer_id, customer_name, customer_email, rating, created_at")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50) // Limit to 50 most recent reviews

    if (reviewsError) {
      console.error("Error fetching recent reviews:", reviewsError)
      return
    }

    if (!recentReviews || recentReviews.length === 0) {
      return
    }


    let scheduledCount = 0

    for (const review of recentReviews) {
      try {
        // Check if there's already a pending automation job for this review and template type
        const { data: existingJob } = await supabase
          .from("automation_jobs")
          .select("id")
          .eq("user_id", userId)
          .eq("review_id", review.id)
          .eq("template_type", templateType)
          .eq("status", "pending")
          .single()

        if (existingJob) {
          continue
        }

        // Schedule new automation for this review
        const schedulerResponse = await fetch(baseUrl + '/api/automation/scheduler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewId: review.id
          })
        })

        if (schedulerResponse.ok) {
          const result = await schedulerResponse.json()
          if (result.success && result.data.processedJobs > 0) {
            scheduledCount++
            }
        } else {
          console.error('Failed to schedule automation for review ' + review.id + ':', await schedulerResponse.text())
        }

      } catch (reviewError) {
        console.error('Error processing review ' + review.id + ':', reviewError)
        continue
      }
    }

    // If initial_trigger is immediate, also process the jobs immediately
    if (initialTrigger === 'immediate' && scheduledCount > 0) {
      const processResponse = await fetch(baseUrl + '/api/automation/scheduler?action=process_pending&testMode=false')

      if (processResponse.ok) {
        const processResult = await processResponse.json()
      } else {
        console.error('❌ Failed to process immediate automation jobs:', await processResponse.text())
      }
    }

  } catch (error) {
    console.error(`❌ Error triggering automation for existing customers:`, error)
  }
}

// DELETE - Delete a campaign
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("id")

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "Campaign ID is required" }, { status: 400 })
    }

    // First verify the campaign belongs to the user
    const { data: campaign, error: campaignCheckError } = await supabaseServer
      .from("campaigns")
      .select("id, name")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignCheckError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found or access denied" }, { status: 404 })
    }

    // Delete related sequences first
    const { error: sequencesError } = await supabaseServer
      .from("campaign_sequences")
      .delete()
      .eq("campaign_id", campaignId)

    if (sequencesError) {
      console.error("❌ Error deleting campaign sequences:", sequencesError)
      // Continue with deletion even if sequences fail to delete
    }

    // Delete related schedules
    const { error: schedulesError } = await supabaseServer
      .from("campaign_schedules")
      .delete()
      .eq("campaign_id", campaignId)

    if (schedulesError) {
      console.error("❌ Error deleting campaign schedules:", schedulesError)
      // Continue with deletion even if schedules fail to delete
    }

    // Finally delete the campaign
    const { error: campaignError } = await supabaseServer
      .from("campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("user_id", userId)

    if (campaignError) {
      console.error("❌ Error deleting campaign:", campaignError)
      return NextResponse.json({ success: false, error: campaignError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Campaign "${campaign.name}" has been deleted successfully` 
    })

  } catch (error) {
    console.error("❌ Error deleting campaign:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}