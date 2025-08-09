import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      return null
    }

    return data.user_id
  } catch (error) {
    return null
  }
}

// POST - Auto-enroll contact in campaigns based on request type
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { customer_name, customer_email, customer_phone, request_type } = body

    if (!customer_name || !request_type) {
      return NextResponse.json({ 
        success: false, 
        error: "Customer name and request type are required" 
      }, { status: 400 })
    }

    // Find active campaigns that match the request type
    const campaignType = request_type.toLowerCase() === "email" ? "Email" : "SMS"
    
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id, name, type, trigger_type")
      .eq("user_id", userId)
      .eq("type", campaignType)
      .eq("status", "Active")
      .eq("trigger_type", "new_client") // Only auto-enroll in "new client" campaigns

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fetch campaigns" 
      }, { status: 500 })
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No active ${campaignType} campaigns with "new_client" trigger found`,
        enrollments: []
      })
    }

    // Enroll contact in each matching campaign
    const enrollmentPromises = campaigns.map(async (campaign) => {
      try {
        // Check if contact is already in this campaign (prevent duplicates)
        let existingLead, checkError
        
        try {
          // First try with campaign_id column
          const result = await supabase
            .from("review_requests")
            .select("id")
            .eq("user_id", userId)
            .eq("campaign_id", campaign.id)
            .eq("contact_name", customer_name)
            .eq("contact_email", request_type === "email" ? customer_email : null)
            .eq("contact_phone", request_type === "sms" ? customer_phone : null)
            .eq("request_type", request_type)
            .single()
          
          existingLead = result.data
          checkError = result.error
        } catch (error) {
          // Fallback to content matching if campaign_id column doesn't exist
          const result = await supabase
            .from("review_requests")
            .select("id")
            .eq("user_id", userId)
            .eq("contact_name", customer_name)
            .eq("contact_email", request_type === "email" ? customer_email : null)
            .eq("contact_phone", request_type === "sms" ? customer_phone : null)
            .eq("request_type", request_type)
            .like("content", `%Campaign Lead: ${campaign.name}%`)
            .single()
          
          existingLead = result.data
          checkError = result.error
        }

        if (existingLead) {
          return {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: "already_enrolled"
          }
        }

        // Get a sample review_link_id to satisfy the constraint
        // In practice, this would be set when the campaign actually sends
        const { data: sampleLink, error: linkError } = await supabase
          .from("review_requests")
          .select("review_link_id")
          .eq("user_id", userId)
          .not("review_link_id", "is", null)
          .limit(1)
          .single()

        const reviewLinkId = sampleLink?.review_link_id
        if (!reviewLinkId) {
          return {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: "failed",
            error: "No review link available for this user"
          }
        }

        // Add contact to campaign leads
        let newLead, enrollError
        
        try {
          // First try with campaign_id column
          const result = await supabase
            .from("review_requests")
            .insert({
              user_id: userId,
              review_link_id: reviewLinkId, // Use existing review link
              contact_name: customer_name,
              contact_phone: request_type === "sms" ? customer_phone : null,
              contact_email: request_type === "email" ? customer_email : null,
              request_type: request_type,
              content: `Campaign Lead: ${campaign.name} - ${customer_name}`,
              subject_line: `Campaign Lead: ${campaign.name}`,
              status: "pending", // Pending until campaign sends
              campaign_id: campaign.id, // Link to specific campaign
              created_at: new Date().toISOString(),
            })
            .select()
            .single()
          
          newLead = result.data
          enrollError = result.error
        } catch (error) {
          // Fallback without campaign_id if column doesn't exist
          const result = await supabase
            .from("review_requests")
            .insert({
              user_id: userId,
              review_link_id: reviewLinkId, // Use existing review link
              contact_name: customer_name,
              contact_phone: request_type === "sms" ? customer_phone : null,
              contact_email: request_type === "email" ? customer_email : null,
              request_type: request_type,
              content: `Campaign Lead: ${campaign.name} - ${customer_name}`,
              subject_line: `Campaign Lead: ${campaign.name}`,
              status: "pending", // Pending until campaign sends
              created_at: new Date().toISOString(),
            })
            .select()
            .single()
          
          newLead = result.data
          enrollError = result.error
        }

        if (enrollError) {
          console.error(`Error enrolling in campaign ${campaign.name}:`, enrollError)
          return {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: "failed",
            error: enrollError.message
          }
        }

        return {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: "enrolled",
          lead_id: newLead.id
        }

      } catch (error) {
        console.error(`Error processing campaign ${campaign.name}:`, error)
        return {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: "failed",
          error: error.message
        }
      }
    })

    const enrollmentResults = await Promise.all(enrollmentPromises)
    const successfulEnrollments = enrollmentResults.filter(r => r.status === "enrolled")

    console.log(`🎯 Auto-enrolled ${customer_name} in ${successfulEnrollments.length}/${campaigns.length} ${campaignType} campaigns`)

    return NextResponse.json({
      success: true,
      message: `Contact enrolled in ${successfulEnrollments.length} campaign(s)`,
      enrollments: enrollmentResults,
      contact: {
        name: customer_name,
        email: customer_email,
        phone: customer_phone,
        method: request_type
      }
    })

  } catch (error) {
    console.error("Error in campaign enrollment:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}