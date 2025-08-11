import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"
import OpenAI from 'openai'

// Initialize OpenAI client with error handling
// Check for both OPENAI_API_KEY and OPENAI environment variables
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI
const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
}) : null

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

    // Debug: Log the data received from frontend
    console.log('🔍 [Regular API] Keywords received:', formData.keywords)
    console.log('🔍 [Regular API] Location received:', formData.location)  
    console.log('🔍 [Regular API] Industry received:', formData.industry)

    // Validate required fields
    if (!formData.campaignName?.trim()) {
      return NextResponse.json({ success: false, error: "Campaign name is required" }, { status: 400 })
    }

    if (!formData.companyName?.trim()) {
      return NextResponse.json({ success: false, error: "Company name is required" }, { status: 400 })
    }

    if (!formData.mainActivity?.trim()) {
      return NextResponse.json({ success: false, error: "Main activity description is required" }, { status: 400 })
    }

    let campaign
    let isUpdating = false

    // Create campaign data with only existing columns
    const campaignData: any = {
      name: formData.campaignName.trim(),
      type: "Email", // Default to email sequence (matching existing pattern)
      trigger_type: "Manual", // Default trigger type (required field)
      status: "Draft"
    }

    // Try to add additional fields if they exist in the schema
    const additionalFields = {
      company_name: formData.companyName.trim(),
      website: formData.website?.trim() || null,
      no_website: formData.noWebsite || false,
      language: formData.language?.trim() || 'English',
      keywords: formData.keywords || [],
      main_activity: formData.mainActivity.trim(),
      location: formData.location?.trim() || null,
      industry: formData.industry?.trim() || null,
      product_service: formData.productService?.trim() || null,
      goals: formData.goals?.trim() || null,
      target_audience: formData.targetAudience?.trim() || null,
    }

    if (formData.campaignId) {
      // Update existing campaign
      isUpdating = true
      
      // Try with all fields first, fallback to basic fields if needed
      let updateData = { ...campaignData, ...additionalFields, updated_at: new Date().toISOString() }
      
      const { data: updatedCampaign, error: updateError } = await supabaseServer
        .from("campaigns")
        .update(updateData)
        .eq("id", formData.campaignId)
        .eq("user_id", userId)
        .select()
        .single()

      if (updateError) {
        console.error("❌ Error updating campaign:", updateError)
        
        // If error mentions missing columns, try with basic fields only
        if (updateError.message.includes("Could not find") || updateError.message.includes("column")) {
          console.log("🔄 Retrying with basic campaign fields only...")
          const { data: basicUpdate, error: basicError } = await supabaseServer
            .from("campaigns")
            .update({
              name: formData.campaignName.trim(),
              trigger_type: "Manual", // Ensure trigger_type is set
              updated_at: new Date().toISOString()
            })
            .eq("id", formData.campaignId)
            .eq("user_id", userId)
            .select()
            .single()
            
          if (basicError) {
            return NextResponse.json({ success: false, error: basicError.message }, { status: 500 })
          }
          campaign = basicUpdate
        } else {
          return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
        }
      } else {
        campaign = updatedCampaign
      }
    } else {
      // Create new campaign
      let insertData = { 
        user_id: userId, 
        ...campaignData, 
        ...additionalFields
      }
      
      const { data: newCampaign, error: createError } = await supabaseServer
        .from("campaigns")
        .insert(insertData)
        .select()
        .single()

      if (createError) {
        console.error("❌ Error creating campaign:", createError)
        
        // If error mentions missing columns, try with basic fields only
        if (createError.message.includes("Could not find") || createError.message.includes("column")) {
          console.log("🔄 Retrying with basic campaign fields only...")
          const { data: basicCampaign, error: basicError } = await supabaseServer
            .from("campaigns")
            .insert({
              user_id: userId,
              name: formData.campaignName.trim(),
              type: "Email",
              trigger_type: "Manual", 
              status: "Draft"
            })
            .select()
            .single()
            
          if (basicError) {
            return NextResponse.json({ 
              success: false, 
              error: basicError.message,
              note: "Campaign created with basic fields. Please run database migration to enable full AI features."
            }, { status: 500 })
          }
          campaign = basicCampaign
        } else {
          return NextResponse.json({ success: false, error: createError.message }, { status: 500 })
        }
      } else {
        campaign = newCampaign
      }
    }

    // Generate AI assets
    const aiAssets = await generateAIAssets(formData)

    // Merge extracted keywords with manual keywords
    const allKeywords = [...(formData.keywords || []), ...(aiAssets.extracted_keywords || [])]
    const uniqueKeywords = [...new Set(allKeywords)] // Remove duplicates

    // Update campaign with extracted keywords if any were found
    if (aiAssets.extracted_keywords && aiAssets.extracted_keywords.length > 0) {
      try {
        await supabaseServer
          .from("campaigns")
          .update({ keywords: uniqueKeywords })
          .eq("id", campaign.id)
          .eq("user_id", userId)
        console.log("✅ Keywords updated with extracted terms:", uniqueKeywords)
      } catch (error) {
        console.log("⚠️ Failed to update keywords, continuing anyway")
      }
    }

    // Save AI assets to database
    await saveAIAssets(campaign.id, aiAssets)
    
    // Save AI-generated email sequences to campaign_sequences table
    await saveAISequencesToCampaignSequences(campaign.id, aiAssets.email_sequences || [])

    return NextResponse.json({ 
      success: true, 
      data: {
        campaign: campaign,
        aiAssets: aiAssets,
        extractedKeywords: aiAssets.extracted_keywords || [],
        totalKeywords: uniqueKeywords
      }
    })

  } catch (error) {
    console.error("❌ Error in campaign create/update:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

async function generateAIAssets(formData: CampaignFormData) {
  try {
    console.log("🤖 Generating AI assets for campaign...")
    console.log("🔑 OpenAI API Key configured:", !!apiKey)
    if (apiKey) {
      console.log("🔑 Using API key from:", process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY' : 'OPENAI')
    }

    // Check if OpenAI is available
    if (!openai) {
      console.warn("⚠️ OpenAI API key not configured, using fallback data")
      return getFallbackAIAssets()
    }

    console.log("✅ Using OpenAI for AI asset generation")

    const companyContext = `
Company: ${formData.companyName}
${formData.website ? `Website: ${formData.website}` : 'No website provided'}
Location: ${formData.location || 'Not specified'}
Industry: ${formData.industry || 'Not specified'}
Main Activity: ${formData.mainActivity}
${formData.productService ? `Product/Service: ${formData.productService}` : ''}
${formData.goals ? `Goals: ${formData.goals}` : ''}
${formData.targetAudience ? `Target Audience: ${formData.targetAudience}` : ''}
Keywords: ${formData.keywords?.join(', ') || 'None'}
Language: ${formData.language || 'English'}
    `.trim()

    // Generate single ICP & Persona (cost optimization)
    console.log("🎯 Generating ICP & Persona...")
    const icpResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert marketing strategist. Generate 1 detailed Ideal Customer Profile (ICP) and 1 target persona for the given company. Respond in ${formData.language || 'English'}. Return only valid JSON without code blocks or markdown.`
        },
        {
          role: "user",
          content: `Based on this company information, generate 1 ICP and 1 persona in ${formData.language || 'English'}:

${companyContext}

Return JSON in this exact format:
{
  "icp": {
    "id": 1,
    "title": "ICP Title",
    "description": "Detailed description",
    "company_size": "Size range",
    "industry": "Industry type",
    "budget_range": "Budget range",
    "decision_makers": ["Role 1", "Role 2"]
  },
  "persona": {
    "id": 1,
    "icp_id": 1,
    "name": "Persona Name",
    "title": "Job Title",
    "demographics": "Demographics info",
    "goals": ["Goal 1", "Goal 2"],
    "challenges": ["Challenge 1", "Challenge 2"],
    "preferred_communication": "Communication style"
  }
}`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    const icpData = JSON.parse(icpResponse.choices[0].message.content || '{}')
    console.log("✅ ICPs & Personas generated successfully")

    // Generate single Pain Point & Value Prop (cost optimization)
    console.log("💡 Generating Pain Point & Value Proposition...")
    const painValueResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert sales strategist. Generate 1 specific pain point and 1 value proposition based on the company and ICP. Respond in ${formData.language || 'English'}. Return only valid JSON without code blocks or markdown.`
        },
        {
          role: "user",
          content: `Based on this company and ICP, create 1 pain point and 1 value proposition in ${formData.language || 'English'}:

${companyContext}

ICP: ${JSON.stringify(icpData.icp)}

Return JSON in this exact format:
{
  "pain_point": {
    "id": 1,
    "icp_id": 1,
    "title": "Pain Point Title",
    "description": "Detailed pain point description",
    "impact": "Business impact",
    "urgency": "high|medium|low"
  },
  "value_proposition": {
    "id": 1,
    "pain_point_id": 1,
    "title": "Value Prop Title", 
    "description": "How we solve this pain point",
    "benefits": ["Benefit 1", "Benefit 2"],
    "proof_points": ["Proof 1", "Proof 2"]
  }
}`
        }
      ],
      temperature: 0.7,
      max_tokens: 600
    })

    const painValueData = JSON.parse(painValueResponse.choices[0].message.content || '{}')
    console.log("✅ Pain Points & Value Props generated successfully")

    // Extract keywords from website if provided
    let extractedKeywords = []
    if (formData.website && !formData.noWebsite) {
      console.log("🔍 Extracting keywords from website...")
      try {
        const keywordResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Extract 5-8 relevant keywords from the company context for marketing campaigns. Return only a JSON array of keywords."
            },
            {
              role: "user", 
              content: `Extract marketing keywords from: ${companyContext}`
            }
          ],
          temperature: 0.3,
          max_tokens: 100
        })
        extractedKeywords = JSON.parse(keywordResponse.choices[0].message.content || '[]')
        console.log("✅ Keywords extracted:", extractedKeywords)
      } catch (error) {
        console.log("⚠️ Keyword extraction failed, using manual keywords")
      }
    }

    // Generate Email Sequence (language-aware) - 6 emails for 2 sequences
    console.log("📧 Generating Email Sequences...")
    const sequenceResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert email marketing copywriter. Generate 6 compelling emails for a 2-sequence campaign. IMPORTANT: All emails in the same sequence must have the SAME subject line for email threading. First 3 emails (sequence 1) share one subject, last 3 emails (sequence 2 after 60 days) share a different subject. Write in ${formData.language || 'English'}. Return only valid JSON without code blocks or markdown.`
        },
        {
          role: "user",
          content: `Create 6 emails in ${formData.language || 'English'} for this company:

${companyContext}

ICP: ${JSON.stringify(icpData.icp)}
Value Proposition: ${JSON.stringify(painValueData.value_proposition)}

IMPORTANT: Use the SAME subject for emails 1-3 (initial sequence), and the SAME subject for emails 4-6 (re-engagement sequence).

Return JSON in this exact format:
{
  "email_sequences": [
    {
      "step": 1,
      "subject": "Quick question about {{companyName}}",
      "content": "Email body with {{firstName}} and {{companyName}} variables",
      "purpose": "Introduction/awareness",
      "timing_days": 0
    },
    {
      "step": 2, 
      "subject": "Quick question about {{companyName}}",
      "content": "Follow-up email content (same subject for threading)",
      "purpose": "Value demonstration", 
      "timing_days": 3
    },
    {
      "step": 3,
      "subject": "Quick question about {{companyName}}",
      "content": "Final follow-up content (same subject for threading)",
      "purpose": "Call to action",
      "timing_days": 6
    },
    {
      "step": 4,
      "subject": "New updates for {{companyName}}",
      "content": "Re-engagement email content (new subject for new thread)",
      "purpose": "Re-engagement",
      "timing_days": 66
    },
    {
      "step": 5,
      "subject": "New updates for {{companyName}}",
      "content": "Follow-up re-engagement content (same subject for threading)",
      "purpose": "Renewed value proposition",
      "timing_days": 69
    },
    {
      "step": 6,
      "subject": "New updates for {{companyName}}",
      "content": "Final re-engagement content (same subject for threading)", 
      "purpose": "Last call to action",
      "timing_days": 72
    }
  ]
}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    const sequenceData = JSON.parse(sequenceResponse.choices[0].message.content || '{}')
    console.log("✅ Email Sequences generated successfully")
    console.log("🎉 All AI assets generated successfully")

    return {
      icps: icpData.icp ? [icpData.icp] : [],
      personas: icpData.persona ? [icpData.persona] : [],
      pain_points: painValueData.pain_point ? [painValueData.pain_point] : [],
      value_propositions: painValueData.value_proposition ? [painValueData.value_proposition] : [],
      email_sequences: sequenceData.email_sequences || [],
      extracted_keywords: extractedKeywords || []
    }

  } catch (error) {
    console.error("❌ Error generating AI assets:", error)
    
    // Provide specific error info for OpenAI issues
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.error("🔑 OpenAI API Key authentication failed - check if key is valid")
      } else if (error.message.includes('429')) {
        console.error("⏰ OpenAI rate limit exceeded - using fallback data")
      } else if (error.message.includes('timeout')) {
        console.error("⏱️ OpenAI API timeout - using fallback data")
      } else {
        console.error("🤖 OpenAI API error:", error.message)
      }
    }
    
    console.log("🔄 Using fallback AI data instead...")
    return getFallbackAIAssets()
  }
}

function getFallbackAIAssets() {
  return {
    icps: [
      {
        id: 1,
        title: "Mid-Market Companies",
        description: "Growing companies looking to improve their processes",
        company_size: "50-500 employees",
        industry: "Technology/Services",
        budget_range: "$10K-100K",
        decision_makers: ["CEO", "VP Operations"]
      }
    ],
    personas: [
      {
        id: 1,
        icp_id: 1,
        name: "Tech-Savvy Manager",
        title: "Operations Manager",
        demographics: "35-45 years old, tech-savvy",
        goals: ["Improve efficiency", "Reduce costs"],
        challenges: ["Limited resources", "Tight deadlines"],
        preferred_communication: "Email, direct approach"
      }
    ],
    pain_points: [
      {
        id: 1,
        icp_id: 1,
        title: "Manual Processes",
        description: "Relying on manual processes that are time-consuming",
        impact: "Reduced productivity and increased errors",
        urgency: "high"
      }
    ],
    value_propositions: [
      {
        id: 1,
        pain_point_id: 1,
        title: "Automation Solution",
        description: "Automate your processes to save time and reduce errors",
        benefits: ["Save 10+ hours per week", "Reduce errors by 90%"],
        proof_points: ["Case studies", "Customer testimonials"]
      }
    ],
    email_sequences: [
      {
        step: 1,
        subject: "Quick question about {{companyName}}",
        content: "Hi {{firstName}},\n\nI noticed {{companyName}} and thought you might be interested in how we've helped similar companies improve their operations.\n\nWould you be open to a brief conversation?",
        purpose: "Introduction",
        timing_days: 0
      },
      {
        step: 2,
        subject: "Following up - {{companyName}}",
        content: "Hi {{firstName}},\n\nI wanted to follow up on my previous email. I understand you're busy, but I believe we could really help {{companyName}} streamline operations.\n\nCould we schedule a quick 15-minute call?",
        purpose: "Value demonstration",
        timing_days: 3
      },
      {
        step: 3,
        subject: "Final thoughts for {{companyName}}",
        content: "Hi {{firstName}},\n\nThis will be my last email in this sequence. I genuinely believe we can help {{companyName}} save significant time and resources.\n\nIf you're interested, I'm here. Otherwise, I won't bother you further.",
        purpose: "Call to action",
        timing_days: 6
      },
      {
        step: 4,
        subject: "New updates for {{companyName}}",
        content: "Hi {{firstName}},\n\nIt's been a while since we last connected. We've recently launched some new features that I think would be perfect for {{companyName}}.\n\nWould you be interested in learning more?",
        purpose: "Re-engagement",
        timing_days: 66
      },
      {
        step: 5,
        subject: "Special opportunity for {{companyName}}",
        content: "Hi {{firstName}},\n\nI wanted to share an exclusive opportunity we're offering to companies like {{companyName}}. \n\nWe're seeing incredible results with similar businesses in your industry.",
        purpose: "Renewed value proposition",
        timing_days: 69
      },
      {
        step: 6,
        subject: "Last chance - {{companyName}}",
        content: "Hi {{firstName}},\n\nThis is my final outreach. We've helped dozens of companies similar to {{companyName}} achieve remarkable results.\n\nIf there's any interest, I'd love to connect. Otherwise, I'll close your file.",
        purpose: "Last call to action",
        timing_days: 72
      }
    ],
    extracted_keywords: []
  }
}

async function saveAIAssets(campaignId: number, aiAssets: any) {
  try {
    console.log("💾 Saving AI assets to database...")

    // First, delete existing AI assets for this campaign if updating
    const { error: deleteError } = await supabaseServer
      .from("campaign_ai_assets")
      .delete()
      .eq("campaign_id", campaignId)

    if (deleteError && !deleteError.message.includes("Could not find the table")) {
      console.error("⚠️ Error deleting existing AI assets:", deleteError)
    }

    // Insert new AI assets
    const { error } = await supabaseServer
      .from("campaign_ai_assets")
      .insert({
        campaign_id: campaignId,
        icps: aiAssets.icps,
        personas: aiAssets.personas,
        pain_points: aiAssets.pain_points,
        value_propositions: aiAssets.value_propositions,
        email_sequences: aiAssets.email_sequences,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      if (error.message.includes("Could not find the table")) {
        console.warn("⚠️ campaign_ai_assets table does not exist - AI assets will not be persisted")
        console.log("💡 Please run the database migration to create the campaign_ai_assets table")
        return // Don't throw error, just continue without persisting
      } else {
        console.error("❌ Error saving AI assets:", error)
        throw error
      }
    }

    console.log("✅ AI assets saved successfully")

  } catch (error) {
    console.error("❌ Error in saveAIAssets:", error)
    // Don't throw error to prevent campaign creation from failing
    console.warn("⚠️ Continuing without persisting AI assets...")
  }
}

async function saveAISequencesToCampaignSequences(campaignId: number, aiSequences: any[]) {
  try {
    if (!aiSequences || aiSequences.length === 0) {
      console.log("ℹ️ No AI sequences to save to campaign_sequences")
      return
    }

    console.log(`📧 Saving ${aiSequences.length} AI sequences to campaign_sequences table...`)

    // Delete existing sequences for this campaign
    const { error: deleteError } = await supabaseServer
      .from("campaign_sequences")
      .delete()
      .eq("campaign_id", campaignId)

    if (deleteError) {
      console.error("❌ Error deleting existing sequences:", deleteError)
      throw new Error(`Failed to delete existing sequences: ${deleteError.message}`)
    }

    // Convert AI sequences to campaign_sequences format
    const sequenceData = aiSequences.map((aiSeq: any, index: number) => ({
      campaign_id: campaignId,
      step_number: aiSeq.step || (index + 1),
      subject: aiSeq.subject || `Email ${index + 1} Subject`,
      content: aiSeq.content || "",
      timing_days: aiSeq.timing_days || (aiSeq.step === 1 ? 0 : 3), // First email immediate, others 3 days apart
      variants: 1,
      outreach_method: "email",
      sequence_number: aiSeq.step <= 3 ? 1 : 2, // First 3 emails are sequence 1, next 3 are sequence 2
      sequence_step: aiSeq.step <= 3 ? aiSeq.step : (aiSeq.step - 3), // Reset step count for sequence 2
      title: `Email ${aiSeq.step}`,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    console.log('📝 AI sequences converted to campaign_sequences format:', JSON.stringify(sequenceData.map(s => ({
      step_number: s.step_number,
      subject: s.subject,
      timing_days: s.timing_days,
      sequence_number: s.sequence_number,
      sequence_step: s.sequence_step
    })), null, 2))

    // Insert sequences
    const { data: insertedData, error: insertError } = await supabaseServer
      .from("campaign_sequences")
      .insert(sequenceData)
      .select()

    if (insertError) {
      console.error("❌ Error inserting AI sequences:", insertError)
      throw new Error(`Failed to save AI sequences: ${insertError.message}`)
    }

    console.log(`✅ Successfully saved ${sequenceData.length} AI sequences to campaign_sequences`)
    return insertedData

  } catch (error) {
    console.error("❌ Error in saveAISequencesToCampaignSequences:", error)
    // Don't throw error to prevent campaign creation from failing
    console.warn("⚠️ Continuing without saving AI sequences to campaign_sequences...")
  }
}