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

// POST - Create advanced campaign with AI data
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const {
      formData,
      selectedICP,
      selectedPersona,
      selectedPainPoint,
      selectedOutreachStrategy,
      completedSteps
    } = body

    // Create the main campaign
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .insert({
        user_id: userId,
        name: formData.campaignName || formData.companyName || "AI Generated Campaign",
        type: "Email", // Default to Email for advanced campaigns
        trigger_type: "New Client",
        status: "Draft"
      })
      .select()
      .single()

    if (campaignError) {
      console.error("❌ Error creating campaign:", campaignError)
      return NextResponse.json({ 
        success: false, 
        error: campaignError.message 
      }, { status: 500 })
    }

    // Store the advanced campaign data
    const { data: advancedData, error: advancedError } = await supabaseServer
      .from("advanced_campaign_data")
      .insert({
        campaign_id: campaign.id,
        company_data: JSON.stringify({
          campaignName: formData.campaignName,
          companyName: formData.companyName,
          website: formData.website,
          noWebsite: formData.noWebsite,
          language: formData.language,
          keywords: formData.keywords,
          mainActivity: formData.mainActivity,
          location: formData.location
        }),
        icp_data: JSON.stringify(selectedICP),
        persona_data: JSON.stringify(selectedPersona),
        pain_point_data: JSON.stringify(selectedPainPoint),
        outreach_strategy: selectedOutreachStrategy,
        completed_steps: JSON.stringify(completedSteps)
      })
      .select()
      .single()

    if (advancedError) {
      console.error("❌ Error storing advanced campaign data:", advancedError)
      // Don't fail campaign creation if advanced data fails
    }

    // Create sequences based on outreach strategy
    const sequences = generateSequencesForStrategy(selectedOutreachStrategy, campaign.id)
    
    if (sequences.length > 0) {
      const { data: sequenceData, error: sequenceError } = await supabaseServer
        .from("campaign_sequences")
        .insert(sequences)
        .select()

      if (sequenceError) {
        console.error("❌ Error creating sequences:", sequenceError)
        // Don't fail campaign creation if sequences fail
      }
    }

    // Create default schedule
    const { data: schedule, error: scheduleError } = await supabaseServer
      .from("campaign_schedules")
      .insert({
        campaign_id: campaign.id,
        name: "AI Generated Schedule",
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
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...campaign,
        advanced_data: advancedData,
        sequences: sequences || [],
        schedules: schedule ? [schedule] : []
      }
    })

  } catch (error) {
    console.error("❌ Error creating advanced campaign:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

function generateSequencesForStrategy(strategy: string, campaignId: string) {
  switch (strategy) {
    case "email":
      return [
        {
          campaign_id: campaignId,
          step_number: 1,
          subject: "Collaborate?",
          content: `Hi {{firstName}},

I hope this email finds you well. I came across your work at {{company}} and was impressed by your approach to {{industry}}.

I'd love to explore how we can collaborate and potentially help you overcome some of the challenges you might be facing with {{painPoint}}.

Would you be open to a brief conversation this week?

Best regards,
{{senderName}}`,
          timing_days: 0,
          variants: 1,
          outreach_method: "email"
        },
        {
          campaign_id: campaignId,
          step_number: 2,
          subject: "Following up - {{company}}",
          content: `Hi {{firstName}},

I wanted to follow up on my previous email about potential collaboration opportunities.

I understand you're probably busy, but I believe our solution could significantly help with {{painPoint}} that many companies like {{company}} face.

Would you have 10 minutes for a quick call this week?

Best regards,
{{senderName}}`,
          timing_days: 2,
          variants: 1,
          outreach_method: "email"
        },
        {
          campaign_id: campaignId,
          step_number: 3,
          subject: "Last attempt - {{company}}",
          content: `Hi {{firstName}},

This will be my final email regarding our potential collaboration.

I understand timing might not be right, but I wanted to leave you with some resources that might be helpful for addressing {{painPoint}}.

If you change your mind, feel free to reach out anytime.

Best regards,
{{senderName}}`,
          timing_days: 3,
          variants: 1,
          outreach_method: "email"
        }
      ]
    
    case "email-linkedin":
      return [
        {
          campaign_id: campaignId,
          step_number: 1,
          subject: "Collaborate?",
          content: `Hi {{firstName}},

I hope this email finds you well. I came across your work at {{company}} and was impressed by your approach to {{industry}}.

I'd love to explore how we can collaborate and potentially help you overcome some of the challenges you might be facing with {{painPoint}}.

Would you be open to a brief conversation this week?

Best regards,
{{senderName}}`,
          timing_days: 0,
          variants: 1,
          outreach_method: "email"
        },
        {
          campaign_id: campaignId,
          step_number: 2,
          subject: "Connection Request",
          content: `Hi {{firstName}},

I came across your profile and was impressed by your work at {{company}}. I'd love to connect and share some insights that could help with {{painPoint}}.

Looking forward to connecting!

Best regards,
{{senderName}}`,
          timing_days: 2,
          variants: 1,
          outreach_method: "linkedin"
        }
      ]
    
    case "email-linkedin-phone":
      return [
        {
          campaign_id: campaignId,
          step_number: 1,
          subject: "Collaborate?",
          content: `Hi {{firstName}},

I hope this email finds you well. I came across your work at {{company}} and was impressed by your approach to {{industry}}.

I'd love to explore how we can collaborate and potentially help you overcome some of the challenges you might be facing with {{painPoint}}.

Would you be open to a brief conversation this week?

Best regards,
{{senderName}}`,
          timing_days: 0,
          variants: 1,
          outreach_method: "email"
        },
        {
          campaign_id: campaignId,
          step_number: 2,
          subject: "Follow-up Connection",
          content: `Hi {{firstName}},

I sent you an email recently about collaborating with {{company}}. I'd love to connect here on LinkedIn and continue our conversation.

Let me know if you're interested in discussing {{painPoint}} solutions.

Best regards,
{{senderName}}`,
          timing_days: 2,
          variants: 1,
          outreach_method: "linkedin"
        },
        {
          campaign_id: campaignId,
          step_number: 3,
          subject: "Phone Follow-up",
          content: `Hi {{firstName}},

I wanted to follow up on my email and LinkedIn message about helping {{company}} with {{painPoint}}.

I'll give you a call to discuss how we can collaborate and provide value to your business.

Talk to you soon!

{{senderName}}`,
          timing_days: 4,
          variants: 1,
          outreach_method: "phone"
        }
      ]
    
    default:
      return []
  }
}