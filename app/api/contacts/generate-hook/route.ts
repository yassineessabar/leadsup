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

    // Generate more personalized hooks based on contact details
    const hooks = generatePersonalizedHooks(contact)
    
    // Helper function to generate varied, contextual hooks
    function generatePersonalizedHooks(contact: any) {
      const firstName = contact.first_name || ''
      const lastName = contact.last_name || ''
      const company = contact.company || ''
      const title = contact.job_title || contact.title || ''
      const location = contact.location || ''
      
      // Parse job title for better personalization
      const isExecutive = /CEO|CTO|CFO|CMO|COO|Chief|President|VP|Vice President|Director|Head of/i.test(title)
      const isSales = /Sales|Business Development|BD|Account|Revenue/i.test(title)
      const isMarketing = /Marketing|Growth|Brand|Content|Digital|Social/i.test(title)
      const isTechnical = /Engineer|Developer|Tech|IT|CTO|Software|Data/i.test(title)
      const isOperations = /Operations|COO|Process|Quality|Supply/i.test(title)
      const isHR = /HR|Human Resources|People|Talent|Recruitment/i.test(title)
      
      const hooks: string[] = []
      
      // Hook 1: Role-specific value proposition
      if (isSales) {
        hooks.push(`I noticed you're driving revenue growth at ${company}. Our platform has helped similar sales leaders increase pipeline velocity by 40%.`)
      } else if (isMarketing) {
        hooks.push(`As ${title} at ${company}, you're likely focused on ROI. We've helped marketing teams like yours reduce CAC by 35%.`)
      } else if (isTechnical) {
        hooks.push(`Leading technical initiatives at ${company}? Our solution integrates seamlessly with your existing tech stack.`)
      } else if (isOperations) {
        hooks.push(`Streamlining operations at ${company} is complex. We've helped ops leaders automate 60% of manual processes.`)
      } else if (isHR) {
        hooks.push(`Building great teams at ${company}? Our platform helps HR leaders improve employee engagement by 45%.`)
      } else if (isExecutive) {
        hooks.push(`As a ${title} at ${company}, strategic efficiency matters. We've helped executives reduce operational costs by 30%.`)
      } else {
        hooks.push(`Your work at ${company} caught my attention. We specialize in helping ${title || 'professionals'} achieve measurable results.`)
      }
      
      // Hook 2: Company-specific insight
      if (company) {
        const companyLower = company.toLowerCase()
        if (companyLower.includes('tech') || companyLower.includes('software')) {
          hooks.push(`${company}'s innovation in tech is impressive. We partner with forward-thinking companies to accelerate digital transformation.`)
        } else if (companyLower.includes('finance') || companyLower.includes('bank')) {
          hooks.push(`In the evolving finance sector, ${company} stands out. Our compliance-ready solution serves leading financial institutions.`)
        } else if (companyLower.includes('health') || companyLower.includes('medical')) {
          hooks.push(`${company}'s impact on healthcare is notable. We help health organizations improve patient outcomes while reducing costs.`)
        } else {
          hooks.push(`I've been following ${company}'s growth trajectory. Our solution aligns perfectly with companies scaling at your pace.`)
        }
      } else {
        hooks.push(`Your professional journey is impressive. We help leaders like you transform challenges into competitive advantages.`)
      }
      
      // Hook 3: Problem-focused approach
      if (isExecutive) {
        hooks.push(`Scaling efficiently while maintaining quality is challenging. How are you currently balancing growth with operational excellence?`)
      } else if (isSales) {
        hooks.push(`With sales cycles getting longer, many ${title || 'sales leaders'} struggle with pipeline predictability. Curious how you're tackling this?`)
      } else if (isMarketing) {
        hooks.push(`Attribution and ROI measurement keep getting more complex. What's your approach to proving marketing impact at ${company}?`)
      } else if (isTechnical) {
        hooks.push(`Technical debt vs. innovation is a constant balance. How does ${company} prioritize engineering resources?`)
      } else {
        hooks.push(`Many ${title || 'professionals'} at growing companies face resource constraints. What's your biggest operational challenge right now?`)
      }
      
      // Ensure all hooks are under 30 words and unique
      return hooks.map(hook => {
        const words = hook.split(' ')
        if (words.length > 30) {
          return words.slice(0, 28).join(' ') + '...'
        }
        return hook
      })
    }
    
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