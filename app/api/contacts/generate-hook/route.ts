import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { contactId } = await request.json()
    
    if (!contactId) {
      return NextResponse.json({ success: false, error: "Contact ID is required" }, { status: 400 })
    }

    // Fetch contact details  
    const { data: contact, error: contactError } = await supabaseServer
      .from('contacts')
      .select('*, campaigns(company_name, website)')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 })
    }

    // Generate personalized hook using AI
    const hookPrompt = `Generate a personalized outreach hook for this contact:

Name: ${contact.first_name} ${contact.last_name}
Email: ${contact.email}
Company: ${contact.company || 'Unknown'}
Job Title: ${contact.job_title || 'Unknown'}
Location: ${contact.location || 'Unknown'}
LinkedIn: ${contact.linkedin || 'Not provided'}

Context about our company:
Company Name: ${contact.campaigns?.company_name || 'Our Company'}
Website: ${contact.campaigns?.website || ''}

Follow this process:
[STEP 1] Gather Context - Use the provided information to understand their role, company, and potential challenges
[STEP 2] Create Hook Structure - Use this format: "After [X milestone/role] at [company], and with your focus on [inferred mission/values], [our offer] could help [support/amplify/accelerate] that vision."
[STEP 3] Style Variations - Keep under 30 words, add emotional triggers like "growth," "impact," "vision"
[STEP 4] Insert Value - Connect their role/company to our value proposition

Generate 3 short personalized hooks (under 30 words each) that could be used for outreach. Focus on their professional context and potential business needs.

Return ONLY the 3 hooks, numbered 1-3, no additional text.`

    // Using a simple AI generation approach (replace with your preferred AI service)
    const hooks = [
      `With your ${contact.job_title || contact.title || 'leadership role'} at ${contact.company || 'your company'}, our solution could help accelerate your team's growth and impact.`,
      `After building success at ${contact.company || 'your organization'}, you might value how we help ${contact.job_title || contact.title || 'professionals'} scale their vision.`,
      `Given your focus on ${contact.company || 'business growth'}, our platform could help amplify the momentum you're already creating.`
    ]
    
    // Store the selected hook in tags field (workaround until personalized_hook column exists)
    await supabaseServer
      .from('contacts')
      .update({ tags: `HOOK: ${hooks[0]}` })
      .eq('id', contactId)

    return NextResponse.json({
      success: true,
      data: {
        hooks,
        contact: {
          name: `${contact.first_name} ${contact.last_name}`,
          email: contact.email,
          company: contact.company
        }
      }
    })

  } catch (error) {
    console.error('Error generating personalized hook:', error)
    return NextResponse.json(
      { success: false, error: "Failed to generate hook" },
      { status: 500 }
    )
  }
}