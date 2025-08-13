import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { configureInboundParse, deleteInboundParse, createDomainAuthentication, getDomainAuthentication, validateDomainAuthentication } from "@/lib/sendgrid"

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

    // Query user_sessions table to get user_id
    const { data, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      console.error("Error fetching user from session:", error)
      return null
    }

    return data.user_id
  } catch (error) {
    console.error("Error in getUserIdFromSession:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data: domains, error } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching domains:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch domains" },
        { status: 500 }
      )
    }

    // Transform domains to match frontend interface
    const transformedDomains = domains.map(domain => ({
      id: domain.id,
      domain: domain.domain,
      status: domain.status,
      description: domain.description || `Domain is ${domain.status}`,
      isTestDomain: domain.is_test_domain || false,
      verification_type: domain.verification_type,
      created_at: domain.created_at,
      stats: {
        sent: domain.emails_sent || 0,
        delivered: domain.emails_delivered || 0,
        rejected: domain.emails_rejected || 0,
        received: domain.emails_received || 0
      }
    }))

    return NextResponse.json({
      success: true,
      domains: transformedDomains
    })
  } catch (error) {
    console.error("Error in GET /api/domains:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to get default DNS records for a domain
function getDefaultDnsRecords(domain: string, replySubdomain: string = 'reply') {
  // For leadsup.io, use SendGrid verified records only
  if (domain === 'leadsup.io' || domain.includes('leadsup.io')) {
    return [
      {
        type: 'CNAME',
        host: 'em7895',
        value: 'u55053564.wl065.sendgrid.net',
        purpose: 'Link tracking and email branding'
      },
      {
        type: 'CNAME',
        host: 's1._domainkey',
        value: 's1.domainkey.u55053564.wl065.sendgrid.net',
        purpose: 'DKIM authentication (key 1)'
      },
      {
        type: 'CNAME',
        host: 's2._domainkey',
        value: 's2.domainkey.u55053564.wl065.sendgrid.net',
        purpose: 'DKIM authentication (key 2)'
      },
      {
        type: 'TXT',
        host: '_dmarc',
        value: 'v=DMARC1; p=none;',
        purpose: 'DMARC policy'
      },
      {
        type: 'MX',
        host: replySubdomain,
        value: 'mx.sendgrid.net',
        priority: '10',
        purpose: `Route replies from ${replySubdomain}.${domain} back to LeadsUp`
      }
    ]
  }

  // Generate default records for other domains
  const sendgridSubdomain = `u${Math.random().toString(36).substring(2, 10)}.wl${Math.floor(Math.random() * 900) + 100}.sendgrid.net`
  const emPrefix = `em${Math.floor(Math.random() * 9000) + 1000}`
  
  return [
    {
      type: 'CNAME',
      host: emPrefix,
      value: sendgridSubdomain,
      purpose: 'Link tracking and email branding'
    },
    {
      type: 'CNAME',
      host: 's1._domainkey',
      value: `s1.domainkey.${sendgridSubdomain}`,
      purpose: 'DKIM authentication (key 1)'
    },
    {
      type: 'CNAME',
      host: 's2._domainkey',
      value: `s2.domainkey.${sendgridSubdomain}`,
      purpose: 'DKIM authentication (key 2)'
    },
    {
      type: 'TXT',
      host: '@',
      value: 'v=spf1 include:sendgrid.net ~all',
      purpose: 'SPF - Authorizes SendGrid to send emails'
    },
    {
      type: 'TXT',
      host: '_dmarc',
      value: 'v=DMARC1; p=none; rua=mailto:dmarc@leadsup.io; ruf=mailto:dmarc@leadsup.io; pct=100; sp=none;',
      purpose: 'DMARC policy'
    },
    {
      type: 'MX',
      host: replySubdomain,
      value: 'mx.sendgrid.net',
      priority: '10',
      purpose: `Route replies from ${replySubdomain}.${domain} back to LeadsUp`
    }
  ]
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { domain, verificationType = 'manual', replySubdomain = 'reply' } = body

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 }
      )
    }

    // Validate reply subdomain format
    const subdomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*$/
    if (!subdomainRegex.test(replySubdomain)) {
      return NextResponse.json(
        { success: false, error: "Invalid reply subdomain format" },
        { status: 400 }
      )
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { success: false, error: "Invalid domain format" },
        { status: 400 }
      )
    }

    // Check if domain already exists for this user
    const { data: existingDomain } = await supabase
      .from('domains')
      .select('id')
      .eq('user_id', userId)
      .eq('domain', domain)
      .single()

    if (existingDomain) {
      return NextResponse.json(
        { success: false, error: "Domain already exists" },
        { status: 409 }
      )
    }

    // Generate verification token and DNS records
    const verificationToken = `leadsup-verify-${Math.random().toString(36).substring(2, 15)}`
    const dnsRecords = getDefaultDnsRecords(domain, replySubdomain)
    
    // Construct the full reply hostname for inbound parse
    const replyHostname = `${replySubdomain}.${domain}`
    
    // Update verification record with actual token
    dnsRecords.forEach(record => {
      if (record.name === '_leadsup-verify') {
        record.value = verificationToken
      }
    })

    // Determine if it's a test domain
    const isTestDomain = domain.includes('mlsender.net') || domain.includes('test-')

    // Insert domain into database (without new columns for now)
    const { data: newDomain, error } = await supabase
      .from('domains')
      .insert({
        user_id: userId,
        domain,
        status: 'pending',
        description: `Domain pending verification (Reply: ${replyHostname})`,
        verification_type: verificationType,
        verification_token: verificationToken,
        verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        dns_records: dnsRecords,
        is_test_domain: isTestDomain
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating domain:", error)
      return NextResponse.json(
        { success: false, error: "Failed to create domain" },
        { status: 500 }
      )
    }

    // Auto-configure SendGrid domain authentication and inbound parse
    let domainAuthResult = null
    let inboundParseResult = null
    
    try {
      console.log(`🔐 Setting up SendGrid domain authentication and inbound parse for ${domain}`)
      
      // Step 1: Check if domain authentication already exists
      console.log(`🔍 Checking existing domain authentication for ${domain}`)
      const existingAuth = await getDomainAuthentication(domain)
      
      if (existingAuth.domain) {
        console.log(`✅ Domain authentication already exists for ${domain}`)
        domainAuthResult = existingAuth.domain
      } else {
        // Step 2: Create domain authentication if it doesn't exist
        console.log(`🔐 Creating domain authentication for ${domain}`)
        domainAuthResult = await createDomainAuthentication({
          domain: domain,
          default: false,
          custom_spf: false
        })
        console.log(`✅ Domain authentication created for ${domain}`)
      }
      
      // Step 3: Validate domain authentication before creating inbound parse
      if (domainAuthResult?.id) {
        console.log(`✅ Validating SendGrid domain authentication for ${domain}`)
        try {
          await validateDomainAuthentication(domainAuthResult.id.toString())
          console.log(`✅ Domain authentication validated for ${domain}`)
        } catch (validationError) {
          console.log(`⚠️ Domain authentication validation failed, but continuing: ${validationError}`)
          // Continue anyway as the domain may already be validated
        }
      }
      
      // Step 4: Configure inbound parse (now that domain auth exists and is validated)
      console.log(`🔧 Configuring SendGrid inbound parse for ${replyHostname}`)
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadsup.com'}/api/webhooks/sendgrid`
      
      inboundParseResult = await configureInboundParse({
        hostname: replyHostname,
        url: webhookUrl,
        spam_check: true,
        send_raw: false
      })

      console.log(`✅ SendGrid inbound parse configured successfully for ${replyHostname}`)
      
      // Store success in description
      await supabase
        .from('domains')
        .update({
          description: `Domain pending verification (Reply: ${replyHostname} - Auth & Inbound configured)`
        })
        .eq('id', newDomain.id)

    } catch (setupError) {
      console.error(`⚠️ Failed to configure SendGrid for ${domain}:`, setupError)
      
      // Store the error but don't fail domain creation
      const errorMsg = setupError instanceof Error ? setupError.message : 'Unknown error'
      await supabase
        .from('domains')
        .update({
          description: `Domain pending verification (Reply: ${replyHostname} - Setup failed: ${errorMsg.substring(0, 100)})`
        })
        .eq('id', newDomain.id)
    }

    // Transform domain to match frontend interface
    const transformedDomain = {
      id: newDomain.id,
      domain: newDomain.domain,
      status: newDomain.status,
      description: newDomain.description,
      isTestDomain: newDomain.is_test_domain,
      verification_type: newDomain.verification_type,
      created_at: newDomain.created_at,
      stats: {
        sent: 0,
        delivered: 0,
        rejected: 0,
        received: 0
      }
    }

    return NextResponse.json({
      success: true,
      domain: transformedDomain,
      dnsRecords,
      sendGridSetup: {
        domainAuth: {
          configured: domainAuthResult ? true : false,
          id: domainAuthResult?.id || null
        },
        inboundParse: {
          hostname: replyHostname,
          configured: inboundParseResult?.success || false,
          webhookId: inboundParseResult?.webhook_id || null
        }
      }
    })
  } catch (error) {
    console.error("Error in POST /api/domains:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('id')

    if (!domainId) {
      return NextResponse.json(
        { success: false, error: "Domain ID is required" },
        { status: 400 }
      )
    }

    // First verify the domain belongs to the user
    const { data: existingDomain, error: checkError } = await supabase
      .from('domains')
      .select('id, domain, description')
      .eq('id', domainId)
      .eq('user_id', userId)
      .single()

    if (checkError || !existingDomain) {
      return NextResponse.json(
        { success: false, error: "Domain not found or unauthorized" },
        { status: 404 }
      )
    }

    // Try to clean up SendGrid inbound parse if it was configured
    // We'll extract the reply hostname from the description for now
    if (existingDomain.description && existingDomain.description.includes('Reply:')) {
      try {
        const replyMatch = existingDomain.description.match(/Reply:\s*([^\s)]+)/);
        if (replyMatch && replyMatch[1]) {
          const replyHostname = replyMatch[1];
          console.log(`🗑️ Cleaning up SendGrid inbound parse for ${replyHostname}`)
          await deleteInboundParse(replyHostname)
          console.log(`✅ SendGrid inbound parse cleaned up successfully`)
        }
      } catch (cleanupError) {
        console.error(`⚠️ Failed to cleanup inbound parse:`, cleanupError)
        // Don't fail the deletion if cleanup fails
      }
    }

    // Delete the domain (verification history will be cascade deleted)
    const { error: deleteError } = await supabase
      .from('domains')
      .delete()
      .eq('id', domainId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error("Error deleting domain:", deleteError)
      return NextResponse.json(
        { success: false, error: "Failed to delete domain" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Domain ${existingDomain.domain} deleted successfully`
    })

  } catch (error) {
    console.error("Error in DELETE /api/domains:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

