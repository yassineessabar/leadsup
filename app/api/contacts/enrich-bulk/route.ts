import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Generate personalized hook based on contact details
function generatePersonalizedHook(contact: any): string {
  const company = contact.company || ''
  const title = contact.job_title || contact.title || ''
  
  // Parse job title for better personalization
  const isExecutive = /CEO|CTO|CFO|CMO|COO|Chief|President|VP|Vice President|Director|Head of/i.test(title)
  const isSales = /Sales|Business Development|BD|Account|Revenue/i.test(title)
  const isMarketing = /Marketing|Growth|Brand|Content|Digital|Social|CMO/i.test(title)
  const isTechnical = /Engineer|Developer|Tech|IT|CTO|Software|Data|DevOps|Cloud/i.test(title)
  const isOperations = /Operations|COO|Process|Quality|Supply|Logistics/i.test(title)
  const isHR = /HR|Human Resources|People|Talent|Recruitment|Culture/i.test(title)
  const isFinance = /Finance|CFO|Accounting|Controller|Treasurer/i.test(title)
  const isProduct = /Product|PM|PO|UX|Design/i.test(title)
  
  // Industry-specific insights
  const companyLower = company.toLowerCase()
  const isTechCompany = /tech|software|saas|digital|data|ai|ml|cloud/i.test(companyLower)
  const isFinanceCompany = /finance|bank|investment|capital|fund|insurance/i.test(companyLower)
  const isHealthCompany = /health|medical|pharma|bio|clinic|hospital/i.test(companyLower)
  const isRetailCompany = /retail|commerce|shop|store|fashion|brand/i.test(companyLower)
  const isMediaCompany = /media|entertainment|broadcast|publish|content/i.test(companyLower)
  
  // Generate contextual hooks based on role and industry
  const hooks: string[] = []
  
  // Executive hooks
  if (isExecutive) {
    if (isTechCompany) {
      hooks.push(`Leading ${company} through rapid scaling? We help tech executives optimize growth without sacrificing efficiency.`)
    } else if (isFinanceCompany) {
      hooks.push(`As ${title} at ${company}, navigating regulatory complexity while driving innovation must be challenging.`)
    } else {
      hooks.push(`Your leadership at ${company} during this growth phase is impressive. Let's discuss scaling strategies that worked for similar companies.`)
    }
  }
  
  // Sales hooks
  else if (isSales) {
    if (company) {
      hooks.push(`Noticed ${company} is expanding. Our solution helped similar sales teams shorten cycles by 30% during growth phases.`)
    } else {
      hooks.push(`Sales cycles are getting complex. We help ${title || 'sales leaders'} improve win rates with data-driven insights.`)
    }
  }
  
  // Marketing hooks
  else if (isMarketing) {
    if (isTechCompany) {
      hooks.push(`Marketing in tech is evolving fast. ${company}'s brand growth caught my attention - let's explore amplifying that momentum.`)
    } else {
      hooks.push(`As ${title} at ${company}, you're juggling multiple channels. Our platform unifies marketing operations for 200+ companies.`)
    }
  }
  
  // Technical hooks
  else if (isTechnical) {
    if (company) {
      hooks.push(`${company}'s tech stack must be evolving rapidly. We help engineering teams reduce deployment time by 50%.`)
    } else {
      hooks.push(`Modern architecture challenges are complex. Our solution integrates with your existing infrastructure seamlessly.`)
    }
  }
  
  // Operations hooks
  else if (isOperations) {
    hooks.push(`Optimizing operations at ${company || 'scale'} requires the right tools. We've helped ops teams automate 60% of workflows.`)
  }
  
  // Product hooks
  else if (isProduct) {
    hooks.push(`Building products at ${company || 'your company'} means balancing user needs with business goals. Let's discuss product-market fit strategies.`)
  }
  
  // HR hooks
  else if (isHR) {
    hooks.push(`Growing teams at ${company || 'your organization'} brings unique challenges. Our platform streamlines talent operations for scaling companies.`)
  }
  
  // Finance hooks
  else if (isFinance) {
    hooks.push(`Financial operations at ${company || 'growing companies'} need precision. We help finance leaders automate reporting and compliance.`)
  }
  
  // Default hook with more variety
  else {
    const defaultHooks = [
      `Your role at ${company} aligns with our mission to empower ${title || 'professionals'} with better tools.`,
      `${company}'s trajectory is impressive. Let's explore how we can support your continued growth.`,
      `Noticed your work at ${company}. Our platform addresses challenges ${title || 'leaders'} like you face daily.`,
      `${company} stands out in your industry. We specialize in helping similar companies scale efficiently.`
    ]
    hooks.push(defaultHooks[Math.floor(Math.random() * defaultHooks.length)])
  }
  
  // Return the most relevant hook, ensuring it's under 30 words
  const selectedHook = hooks[0] || `Your work at ${company || 'your company'} is impressive. Let's explore how we can support your goals.`
  const words = selectedHook.split(' ')
  if (words.length > 30) {
    return words.slice(0, 28).join(' ') + '...'
  }
  return selectedHook
}

// Simulate LinkedIn/external data enrichment
async function enrichContactData(contact: any) {
  // In production, this would call actual enrichment APIs like:
  // - LinkedIn Sales Navigator API
  // - Clearbit
  // - Hunter.io
  // - Apollo.io
  
  // Simulated enrichment data - only using existing database columns
  const enrichments = {
    // Use existing columns from the contacts table
    title: contact.title || `${['Senior', 'Lead', 'Head of'][Math.floor(Math.random() * 3)]} ${['Sales', 'Marketing', 'Operations', 'Product'][Math.floor(Math.random() * 4)]}`,
    company: contact.company || ['TechCorp', 'InnovateCo', 'GlobalSolutions', 'DataDynamics'][Math.floor(Math.random() * 4)],
    industry: contact.industry || ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing'][Math.floor(Math.random() * 5)],
    location: contact.location || ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Boston, MA'][Math.floor(Math.random() * 5)],
    linkedin: contact.linkedin || `https://linkedin.com/in/${contact.first_name?.toLowerCase()}-${contact.last_name?.toLowerCase()}-${Math.random().toString(36).substr(2, 5)}`,
    website: contact.website || `https://${contact.company?.toLowerCase().replace(/\s+/g, '') || 'example'}.com`,
    
    // Generate personalized hook (using tags field as workaround until personalized_hook column exists)  
    tags: `HOOK: ${generatePersonalizedHook(contact)}`
  }
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
  
  return enrichments
}

export async function POST(request: NextRequest) {
  try {
    const { contactIds, campaignId } = await request.json()
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ success: false, error: "Contact IDs are required" }, { status: 400 })
    }

    // Note: supabaseServer handles auth validation internally

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let enrichedCount = 0
        
        for (let i = 0; i < contactIds.length; i++) {
          const contactId = contactIds[i]
          
          try {
            // Fetch contact
            const { data: contact, error: contactError } = await supabaseServer
              .from('contacts')
              .select('*')
              .eq('id', contactId)
              .single()
            
            if (contactError || !contact) {
              console.error(`Contact ${contactId} not found`)
              continue
            }
            
            // Enrich the contact data
            const enrichedData = await enrichContactData(contact)
            
            // Update contact in database
            const { error: updateError } = await supabaseServer
              .from('contacts')
              .update({
                ...enrichedData,
                updated_at: new Date().toISOString()
              })
              .eq('id', contactId)
            
            if (!updateError) {
              enrichedCount++
              
              // Send progress update
              const progressData = {
                type: 'progress',
                current: i + 1,
                total: contactIds.length,
                contact: {
                  id: contact.id,
                  name: `${contact.first_name} ${contact.last_name}`,
                  email: contact.email,
                  enriched: true
                }
              }
              
              controller.enqueue(encoder.encode(JSON.stringify(progressData) + '\n'))
            }
          } catch (error) {
            console.error(`Error enriching contact ${contactId}:`, error)
          }
        }
        
        // Send completion message
        const completeData = {
          type: 'complete',
          enriched: enrichedCount,
          total: contactIds.length
        }
        
        controller.enqueue(encoder.encode(JSON.stringify(completeData) + '\n'))
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    console.error('Error in bulk enrichment:', error)
    return NextResponse.json(
      { success: false, error: "Failed to enrich contacts" },
      { status: 500 }
    )
  }
}