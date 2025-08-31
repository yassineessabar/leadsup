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

interface CampaignFormData {
  campaignName: string
  companyName: string
  website: string
  noWebsite: boolean
  language: string
  keywords: string[]
  mainActivity: string
  location: string
  industry: string
  productService?: string
  goals?: string
  targetAudience?: string
  campaignId?: number // For editing existing campaigns
}

// POST - Create or update campaign with AI asset generation
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const formData: CampaignFormData = await request.json()

    console.log('✅ Creating campaign:', formData.campaignName)
    console.log('📊 Campaign fields:', {
      company_name: formData.companyName,
      website: formData.website,
      location: formData.location,
      industry: formData.industry,
      goals: formData.goals,
      keywords_count: formData.keywords?.length || 0
    })

    // Validate required fields
    if (!formData.campaignName?.trim()) {
      return NextResponse.json({ success: false, error: "Campaign name is required" }, { status: 400 })
    }

    if (!formData.companyName?.trim()) {
      return NextResponse.json({ success: false, error: "Company name is required" }, { status: 400 })
    }


    let campaign
    let isUpdating = false

    // Create complete campaign data with all available fields
    const campaignData: any = {
      user_id: userId,
      name: formData.campaignName.trim(),
      type: "Email",
      trigger_type: "Manual",
      status: "Draft",
      company_name: formData.companyName.trim(),
      website: formData.website?.trim() || null,
      no_website: formData.noWebsite || false,
      language: formData.language?.trim() || 'English',
      keywords: formData.keywords || [],
      main_activity: formData.mainActivity?.trim() || null,
      location: formData.location?.trim() || null,
      industry: formData.industry?.trim() || null,
      product_service: formData.productService?.trim() || null,
      goals: formData.goals?.trim() || null,
      target_audience: formData.targetAudience?.trim() || null,
    }

    if (formData.campaignId) {
      // Update existing campaign
      isUpdating = true
      
      const updateData = { ...campaignData, updated_at: new Date().toISOString() }
      delete updateData.user_id // Don't update user_id
      
      const { data: updatedCampaign, error: updateError } = await supabaseServer
        .from("campaigns")
        .update(updateData)
        .eq("id", formData.campaignId)
        .eq("user_id", userId)
        .select()
        .single()

      if (updateError) {
        console.error("❌ Error updating campaign:", updateError)
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }
      
      campaign = updatedCampaign
    } else {
      // Create new campaign with all fields
      const { data: newCampaign, error: createError } = await supabaseServer
        .from("campaigns")
        .insert(campaignData)
        .select()
        .single()

      if (createError) {
        console.error("❌ Error creating campaign:", createError)
        return NextResponse.json({ success: false, error: createError.message }, { status: 500 })
      }
      
      campaign = newCampaign
      
      // Create default campaign settings with signature for new campaigns
      if (!isUpdating) {
        const defaultSignature = `<br/><br/>Best regards,<br/><strong>${formData.companyName.trim()}</strong><br/><br/><a href="${formData.website?.trim() || ''}" target="_blank">${formData.website?.trim() || ''}</a>`
        
        const defaultSettings = {
          campaign_id: campaign.id,
          dailyContactsLimit: 35,
          dailySequenceLimit: 100,
          activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          sendingStartTime: '08:00 AM',
          sendingEndTime: '05:00 PM',
          signature: {
            firstName: '',
            lastName: '',
            companyName: formData.companyName.trim(),
            companyWebsite: formData.website?.trim() || '',
            emailSignature: defaultSignature
          }
        }
        
        try {
          const { error: settingsError } = await supabaseServer
            .from("campaign_settings")
            .insert(defaultSettings)
            .select()
          
          if (settingsError) {
            console.error("❌ Error creating campaign settings:", settingsError)
          } else {
            console.log("✅ Campaign settings created with signature")
          }
        } catch (settingsErr) {
          console.error("❌ Failed to create campaign settings:", settingsErr)
        }
      }
    }

    console.log("✅ Campaign created successfully:", campaign.name)

    return NextResponse.json({ 
      success: true, 
      data: {
        campaign: campaign
      }
    })

  } catch (error) {
    console.error("❌ Error in campaign create/update:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}