import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"
import OpenAI from 'openai'

// Initialize OpenAI client with error handling
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
}

// Cache for website content to avoid re-fetching
const websiteContentCache = new Map<string, { content: string, timestamp: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    // Check cache first
    const cached = websiteContentCache.get(url)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`🎯 Using cached website content for: ${url}`)
      return cached.content
    }

    console.log(`🌐 Fetching website content from: ${url}`)
    
    // Use Promise.race for aggressive timeout + abort controller
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000) // Reduced to 4s
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LeadsUp/1.0; +https://app.leadsup.io/)'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const html = await response.text()
        // Aggressive content extraction - just get first 1000 chars of visible text
        const textContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 1000) // Further reduced for speed
        
        // Cache the result
        websiteContentCache.set(url, { content: textContent, timestamp: Date.now() })
        console.log(`✅ Fetched and cached website content (${textContent.length} characters)`)
        return textContent
      }
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    console.warn(`⚠️ Error fetching website content: ${error}`)
  }
  return ''
}

// Step 1: Create campaign and generate ICPs & Personas
export async function POST(request: NextRequest) {
  try {
    const { step, campaignId, formData, aiAssets } = await request.json()
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    switch (step) {
      case 'create-campaign':
        return await createCampaignAndICPs(userId, formData)
      case 'generate-pain-value': {
        const result = await generatePainPointsAndValueProps(campaignId, aiAssets)
        return NextResponse.json({ success: true, ...result })
      }
      case 'generate-sequence': {
        const result = await generateEmailSequence(campaignId, formData, aiAssets)
        return NextResponse.json({ success: true, ...result })
      }
      case 'generate-all-remaining': {
        // NEW: Generate pain points and email sequence in parallel for speed
        const [painValueResult, sequenceResult] = await Promise.all([
          generatePainPointsAndValueProps(campaignId, aiAssets),
          generateEmailSequence(campaignId, formData, aiAssets)
        ])
        return NextResponse.json({ 
          success: true, 
          pain_points: painValueResult.pain_points,
          value_propositions: painValueResult.value_propositions,
          email_sequences: sequenceResult.email_sequences
        })
      }
      case 'update-assets': {
        await updateCampaignAssets(campaignId, aiAssets)
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ success: false, error: "Invalid step" }, { status: 400 })
    }
  } catch (error) {
    console.error("❌ Error in progressive campaign creation:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

async function createCampaignAndICPs(userId: string, formData: CampaignFormData) {
  try {
    // Log the keywords being received
    console.log('🔍 [API] Keywords received in API:', formData.keywords)
    console.log('🔍 [API] Keywords type:', typeof formData.keywords, 'isArray:', Array.isArray(formData.keywords))
    console.log('🔍 [API] Keywords length:', formData.keywords?.length)
    // Create campaign first
    const campaignData = {
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
    
    // Log what we're about to save
    console.log('💾 Campaign data being saved:', {
      keywords: campaignData.keywords,
      industry: campaignData.industry,
      location: campaignData.location
    })

    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .insert(campaignData)
      .select()
      .single()

    if (campaignError) {
      console.error('❌ Database error:', campaignError)
      throw new Error(campaignError.message)
    }
    
    // Log what was actually saved
    console.log('✅ [API] Campaign saved to database:', {
      id: campaign.id,
      keywords: campaign.keywords,
      industry: campaign.industry,
      location: campaign.location,
      campaign_objective: campaign.campaign_objective
    })
    
    // Verify keywords were actually saved
    if (campaign.keywords && campaign.keywords.length > 0) {
      console.log('🎯 [API] Keywords successfully saved:', campaign.keywords.length, 'keywords')
    } else {
      console.warn('⚠️ [API] No keywords were saved to database!')
    }

    // Start background website fetch (don't wait for it)
    if (formData.website && !formData.noWebsite) {
      fetchWebsiteContent(formData.website).catch(err => 
        console.warn('Background website fetch failed:', err)
      )
    }

    // Generate ICPs & Personas
    const icpsAndPersonas = await generateICPsAndPersonas(formData)

    // Save AI assets to database
    await saveAIAssets(campaign.id, { 
      icps: icpsAndPersonas.icps, 
      personas: icpsAndPersonas.personas 
    })

    return NextResponse.json({
      success: true,
      data: {
        campaign,
        aiAssets: icpsAndPersonas,
        extractedKeywords: icpsAndPersonas.extracted_keywords || []
      }
    })
  } catch (error) {
    console.error("❌ Error creating campaign and ICPs:", error)
    throw error
  }
}

async function generateICPsAndPersonas(formData: CampaignFormData) {
  const startTime = Date.now()
  try {
    console.log("🎯 Generating ICPs & Personas...")

    if (!openai) {
      console.warn("⚠️ OpenAI API key not configured, using fallback data")
      return getFallbackICPsAndPersonas()
    }

    // Fetch website content if URL is provided (with timeout fallback)
    let websiteContent = ''
    if (formData.website && !formData.noWebsite) {
      try {
        // Race against a 2-second timeout for ultra-fast response
        websiteContent = await Promise.race([
          fetchWebsiteContent(formData.website),
          new Promise<string>((resolve) => setTimeout(() => resolve(''), 2000))
        ])
      } catch (error) {
        console.warn('Website fetch timeout, proceeding without content')
        websiteContent = ''
      }
    }

    const companyContext = `
Company: ${formData.companyName}
${formData.website ? `Website: ${formData.website}` : 'No website provided'}
${websiteContent ? `Website Content: ${websiteContent}` : ''}
Location: ${formData.location || 'Not specified'}
Industry: ${formData.industry || 'Not specified'}
Main Activity: ${formData.mainActivity}
${formData.productService ? `Product/Service: ${formData.productService}` : ''}
${formData.goals ? `Goals: ${formData.goals}` : ''}
${formData.targetAudience ? `Target Audience: ${formData.targetAudience}` : ''}
Keywords: ${formData.keywords?.join(', ') || 'None'}
Language: ${formData.language || 'English'}
    `.trim()

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate 1 ICP and 1 persona. ${websiteContent ? 'Use website content.' : ''} Return JSON only.`
        },
        {
          role: "user",
          content: `Based on this company information, generate 1 ICP and 1 persona in ${formData.language || 'English'}:

${companyContext}

${websiteContent ? 'Analyze the website content to understand what this company does, who they serve, and how they create value. Use this context to create relevant ICPs and personas.' : 'Generate ICPs and personas based on the company information provided.'}

IMPORTANT: For extracted_keywords, ONLY include broad, generic job titles like "CEO", "Director", "Manager", "VP", "President", "Founder", "Executive", "Head of Department". NEVER include specific task-oriented terms like "automate reviews", "online reputation", or "customer feedback".

Return JSON in this exact format:
{
  "icps": [{
    "id": 1,
    "title": "ICP Title",
    "description": "Detailed description",
    "company_size": "Size range",
    "industry": "Industry type",
    "budget_range": "Budget range",
    "decision_makers": ["Role 1", "Role 2"]
  }],
  "personas": [{
    "id": 1,
    "icp_id": 1,
    "name": "Persona Name",
    "title": "Job Title",
    "demographics": "Demographics info",
    "goals": ["Goal 1", "Goal 2"],
    "challenges": ["Challenge 1", "Challenge 2"],
    "preferred_communication": "Communication style"
  }],
  "extracted_keywords": ["CEO", "Director", "Manager"]
}`
        }
      ],
      temperature: 0.3, // Even lower for fastest response
      max_tokens: 400 // Further reduced for speed
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    const duration = Date.now() - startTime
    console.log(`✅ ICPs & Personas generated successfully in ${duration}ms`)
    return result

  } catch (error) {
    console.error("❌ Error generating ICPs & Personas:", error)
    return getFallbackICPsAndPersonas()
  }
}

async function generatePainPointsAndValueProps(campaignId: string | number, aiAssets: any) {
  try {
    console.log("💡 Generating Pain Points & Value Props...")

    if (!openai) {
      console.warn("⚠️ OpenAI API key not configured, using fallback data")
      return getFallbackPainPointsAndValueProps()
    }

    // Fetch campaign data to get website context
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('company_name, website, industry, main_activity, product_service')
      .eq('id', campaignId)
      .single()

    // Fetch website content if available (using cache)
    let websiteContent = ''
    if (campaign?.website) {
      websiteContent = await fetchWebsiteContent(campaign.website)
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate 1 pain point and 1 value proposition. ${websiteContent ? 'Use website content.' : ''} Return JSON only.`
        },
        {
          role: "user",
          content: `Based on this ICP and persona, create 1 pain point and 1 value proposition:

ICP: ${JSON.stringify(aiAssets.icps?.[0])}
Persona: ${JSON.stringify(aiAssets.personas?.[0])}

${campaign ? `Company Context: ${campaign.company_name} - ${campaign.industry || 'Industry not specified'} - ${campaign.main_activity || 'Activity not specified'}` : ''}
${websiteContent ? `Website Content: ${websiteContent}` : ''}

${websiteContent ? 'Use the website content to understand what problems this company solves and create pain points that align with their solutions.' : ''}

Return JSON in this exact format:
{
  "pain_points": [{
    "id": 1,
    "icp_id": 1,
    "title": "Pain Point Title",
    "description": "Detailed pain point description",
    "impact": "Business impact",
    "urgency": "high"
  }],
  "value_propositions": [{
    "id": 1,
    "pain_point_id": 1,
    "title": "Value Prop Title", 
    "description": "How we solve this pain point",
    "benefits": ["Benefit 1", "Benefit 2"],
    "proof_points": ["Proof 1", "Proof 2"]
  }]
}`
        }
      ],
      temperature: 0.3,
      max_tokens: 300 // Further reduced for speed
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    
    // Update AI assets in database
    await updateAIAssets(campaignId, {
      pain_points: result.pain_points,
      value_propositions: result.value_propositions
    })

    console.log("✅ Pain Points & Value Props generated successfully")
    return result

  } catch (error) {
    console.error("❌ Error generating Pain Points & Value Props:", error)
    return getFallbackPainPointsAndValueProps()
  }
}

async function generateEmailSequence(campaignId: string | number, formData: CampaignFormData, aiAssets: any) {
  try {
    console.log("📧 Generating Email Sequence...")

    if (!openai) {
      console.error("❌ CRITICAL: OpenAI API key not configured!")
      console.error("❌ Environment variables check:")
      console.error("   OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing')
      console.error("   OPENAI:", process.env.OPENAI ? '✅ Set' : '❌ Missing')
      console.warn("⚠️ Using fallback email sequences - these will be generic!")
      
      const fallbackResult = getFallbackEmailSequence()
      
      // Save fallback sequences to database
      console.log('💾 Saving fallback sequences to database...')
      try {
        await saveAISequencesToCampaignSequences(campaignId, fallbackResult.email_sequences || [])
        console.log('✅ Fallback sequences saved successfully')
      } catch (saveError) {
        console.error('❌ Failed to save fallback sequences:', saveError)
      }
      
      return fallbackResult
    }

    // Fetch campaign data to get website context
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('company_name, website, industry, main_activity, product_service')
      .eq('id', campaignId)
      .single()

    // Fetch website content if available (using cache)
    let websiteContent = ''
    if (campaign?.website) {
      websiteContent = await fetchWebsiteContent(campaign.website)
    }

    const companyContext = `
Company: ${formData.companyName}
Industry: ${formData.industry || 'Not specified'}
Main Activity: ${formData.mainActivity}
${websiteContent ? `Website Content: ${websiteContent}` : ''}
Language: ${formData.language || 'English'}
    `.trim()

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate 6 emails: 3 with same subject (initial), 3 with different subject (re-engagement). ${websiteContent ? 'Use website content.' : ''} Return JSON only.`
        },
        {
          role: "user",
          content: `Create 6 emails in ${formData.language || 'English'} for this campaign:

${companyContext}

ICP: ${JSON.stringify(aiAssets.icps?.[0])}
Value Proposition: ${JSON.stringify(aiAssets.value_propositions?.[0])}

${websiteContent ? 'Use the website content to write emails that reflect the company\'s actual services, tone, and value proposition. Make the emails authentic to their brand.' : ''}

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
      temperature: 0.3,
      max_tokens: 500 // Further reduced for speed
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    
    console.log('🤖 OpenAI raw response:', response.choices[0].message.content?.substring(0, 200) + '...')
    console.log('📧 Parsed email sequences:', JSON.stringify(result.email_sequences?.map(seq => ({
      step: seq.step,
      subject: seq.subject?.substring(0, 50),
      timing_days: seq.timing_days
    })), null, 2))
    
    if (!result.email_sequences || result.email_sequences.length === 0) {
      console.error("❌ WARNING: OpenAI did not generate any email sequences!")
      console.error("❌ Full OpenAI response:", response.choices[0].message.content)
      console.warn("⚠️ Will fall back to default sequences")
    } else {
      console.log(`✅ OpenAI generated ${result.email_sequences.length} sequences successfully`)
    }
    
    // Update AI assets in database with complete sequence
    await updateAIAssets(campaignId, {
      email_sequences: result.email_sequences
    })
    
    // Save AI-generated sequences to campaign_sequences table
    console.log('📧 About to save AI sequences to campaign_sequences table:', {
      campaignId,
      campaignIdType: typeof campaignId,
      sequencesCount: result.email_sequences?.length || 0,
      sequences: result.email_sequences?.map(seq => ({ step: seq.step, subject: seq.subject?.substring(0, 30) })) || []
    })
    
    if (result.email_sequences && result.email_sequences.length > 0) {
      try {
        await saveAISequencesToCampaignSequences(campaignId, result.email_sequences)
        console.log('✅ AI sequences saved successfully to campaign_sequences table')
      } catch (error) {
        console.error('❌ CRITICAL: Failed to save AI sequences to campaign_sequences:', error)
        // Don't fail the entire operation, but log it prominently
        console.error('❌ This means sequences will not appear in the Email Sequence tab')
      }
    } else {
      console.warn('⚠️ No AI sequences to save - result.email_sequences is empty or undefined')
    }

    console.log("✅ Email Sequence generated successfully")
    return result

  } catch (error) {
    console.error("❌ Error generating email sequence:", error)
    const fallbackResult = getFallbackEmailSequence()
    
    // Save fallback sequences to database too
    console.log('💾 Saving fallback sequences to database...')
    try {
      await saveAISequencesToCampaignSequences(campaignId, fallbackResult.email_sequences || [])
      console.log('✅ Fallback sequences saved successfully')
    } catch (saveError) {
      console.error('❌ Failed to save fallback sequences:', saveError)
    }
    
    return fallbackResult
  }
}

async function updateCampaignAssets(campaignId: string | number, updatedAssets: any) {
  try {
    await updateAIAssets(campaignId, updatedAssets)
  } catch (error) {
    console.error("❌ Error updating campaign assets:", error)
    throw error
  }
}

async function saveAIAssets(campaignId: string | number, aiAssets: any) {
  try {
    console.log("💾 Saving AI assets to database...")

    const { error } = await supabaseServer
      .from("campaign_ai_assets")
      .insert({
        campaign_id: campaignId,
        icps: aiAssets.icps || [],
        personas: aiAssets.personas || [],
        pain_points: aiAssets.pain_points || [],
        value_propositions: aiAssets.value_propositions || [],
        email_sequences: aiAssets.email_sequences || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error("❌ Error saving AI assets:", error)
      // Don't throw error, just log it
    } else {
      console.log("✅ AI assets saved successfully")
    }

  } catch (error) {
    console.error("❌ Error in saveAIAssets:", error)
  }
}

async function updateAIAssets(campaignId: string | number, updates: any) {
  try {
    console.log("🔄 Updating AI assets in database...")

    // First get current assets
    const { data: currentAssets } = await supabaseServer
      .from("campaign_ai_assets")
      .select("*")
      .eq("campaign_id", campaignId)
      .single()

    if (currentAssets) {
      // Update existing record
      const updatedData = {
        icps: updates.icps || currentAssets.icps,
        personas: updates.personas || currentAssets.personas,
        pain_points: updates.pain_points || currentAssets.pain_points,
        value_propositions: updates.value_propositions || currentAssets.value_propositions,
        email_sequences: updates.email_sequences || currentAssets.email_sequences,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabaseServer
        .from("campaign_ai_assets")
        .update(updatedData)
        .eq("campaign_id", campaignId)

      if (error) {
        console.error("❌ Error updating AI assets:", error)
      } else {
        console.log("✅ AI assets updated successfully")
      }
    }

  } catch (error) {
    console.error("❌ Error in updateAIAssets:", error)
  }
}

// Fallback functions
function getFallbackICPsAndPersonas() {
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
    extracted_keywords: ["CEO", "Director", "Manager", "VP", "President"]
  }
}

function getFallbackPainPointsAndValueProps() {
  return {
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
    ]
  }
}

function getFallbackEmailSequence() {
  return {
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
        subject: "Quick question about {{companyName}}",
        content: "Hi {{firstName}},\n\nI wanted to follow up on my previous email. I understand you're busy, but I believe we could really help {{companyName}} streamline operations.\n\nCould we schedule a quick 15-minute call?",
        purpose: "Value demonstration",
        timing_days: 3
      },
      {
        step: 3,
        subject: "Quick question about {{companyName}}",
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
        subject: "New updates for {{companyName}}",
        content: "Hi {{firstName}},\n\nI wanted to share an exclusive opportunity we're offering to companies like {{companyName}}. \n\nWe're seeing incredible results with similar businesses in your industry.",
        purpose: "Renewed value proposition",
        timing_days: 69
      },
      {
        step: 6,
        subject: "New updates for {{companyName}}",
        content: "Hi {{firstName}},\n\nThis is my final outreach. We've helped dozens of companies similar to {{companyName}} achieve remarkable results.\n\nIf there's any interest, I'd love to connect. Otherwise, I'll close your file.",
        purpose: "Last call to action",
        timing_days: 72
      }
    ]
  }
}

async function saveAISequencesToCampaignSequences(campaignId: string | number, aiSequences: any[]) {
  try {
    if (!aiSequences || aiSequences.length === 0) {
      console.log("ℹ️ No AI sequences to save to campaign_sequences")
      return
    }

    console.log(`📧 Saving ${aiSequences.length} AI sequences to campaign_sequences table...`)
    console.log('🆔 Campaign ID type and value:', typeof campaignId, campaignId)

    // Convert AI sequences to campaign_sequences format
    const sequenceData = aiSequences.map((aiSeq: any, index: number) => ({
      campaign_id: campaignId,
      step_number: aiSeq.step || (index + 1),
      subject: aiSeq.subject || `Email ${index + 1} Subject`,
      content: aiSeq.content || "",
      timing_days: aiSeq.timing_days !== undefined ? aiSeq.timing_days : (aiSeq.step === 1 ? 0 : 3),
      variants: 1,
      outreach_method: "email",
      sequence_number: aiSeq.step <= 3 ? 1 : 2,
      sequence_step: aiSeq.step <= 3 ? aiSeq.step : (aiSeq.step - 3),
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

    // Delete existing sequences first to avoid conflicts
    console.log('🗑️ Deleting existing sequences for campaign', campaignId)
    const { error: deleteError } = await supabaseServer
      .from("campaign_sequences")
      .delete()
      .eq("campaign_id", campaignId)

    if (deleteError) {
      console.error("❌ Error deleting existing AI sequences:", deleteError)
      throw new Error(`Failed to delete existing sequences: ${deleteError.message}`)
    }

    // Insert new sequences
    const { data: insertedData, error: insertError } = await supabaseServer
      .from("campaign_sequences")
      .insert(sequenceData)
      .select()

    if (insertError) {
      console.error("❌ Error inserting AI sequences:", insertError)
      console.error("❌ Insert error details:", JSON.stringify(insertError, null, 2))
      console.error("❌ Campaign ID used in insert:", campaignId, typeof campaignId)
      console.error("❌ Sequence data attempted to insert:", JSON.stringify(sequenceData.slice(0, 1), null, 2)) // Just first item
      throw new Error(`Failed to save AI sequences: ${insertError.message}`)
    }

    console.log(`✅ Successfully saved ${sequenceData.length} AI sequences to campaign_sequences`)
    console.log('🔍 Saved sequence IDs:', insertedData.map(seq => ({ id: seq.id, step_number: seq.step_number, subject: seq.subject?.substring(0, 30) })))
    
    // Verify sequences were saved by re-fetching
    const { data: verifySequences } = await supabaseServer
      .from("campaign_sequences")
      .select("id, step_number, subject")
      .eq("campaign_id", campaignId)
      .order("step_number", { ascending: true })
    
    console.log('✅ Verification: Found', verifySequences?.length || 0, 'sequences in database for campaign', campaignId)
    
    return insertedData

  } catch (error) {
    console.error("❌ CRITICAL: Error in saveAISequencesToCampaignSequences:", error)
    console.error("❌ Full error details:", JSON.stringify(error, null, 2))
    console.error("❌ Error message:", error.message)
    console.error("❌ Error stack:", error.stack)
    
    // Log the specific operation that failed
    if (error.message?.includes('delete')) {
      console.error("❌ Failed at: Deleting existing sequences")
    } else if (error.message?.includes('insert')) {
      console.error("❌ Failed at: Inserting new AI sequences")
    } else {
      console.error("❌ Failed at: Unknown operation")
    }
    
    // Re-throw error to ensure sequences are saved
    throw error
  }
}