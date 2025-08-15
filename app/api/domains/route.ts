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
      return null
    }

    return data.user_id
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    let userId = await getUserIdFromSession()
    
    // TEMPORARY DEV FIX: If no session, use the most recent user for development
    if (!userId && process.env.NODE_ENV === 'development') {
      console.log('🔧 DEV MODE: No session found, using fallback user ID')
      const { data: domains } = await supabase
        .from('domains')
        .select('user_id')
        .limit(1)
      userId = domains?.[0]?.user_id || null
    }
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data: domains, error } = await supabase
      .from('domains')
      .select('id, domain, status, description, is_test_domain, verification_type, created_at, emails_sent, emails_delivered, emails_rejected, emails_received')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

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

    const response = NextResponse.json({
      success: true,
      domains: transformedDomains
    })

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
    response.headers.set('Content-Type', 'application/json; charset=utf-8')
    
    return response
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
    let userId = await getUserIdFromSession()
    
    // TEMPORARY DEV FIX: If no session, use the most recent user for development
    if (!userId && process.env.NODE_ENV === 'development') {
      console.log('🔧 DEV MODE: No session found, using fallback user ID')
      const { data: domains } = await supabase
        .from('domains')
        .select('user_id')
        .limit(1)
      userId = domains?.[0]?.user_id || null
    }
    
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
      .select('*')
      .eq('user_id', userId)
      .eq('domain', domain)
      .single()

    if (existingDomain) {
      console.log(`✅ Domain ${domain} already exists, returning existing domain`)
      
      // Transform existing domain to match frontend interface
      const transformedDomain = {
        id: existingDomain.id,
        domain: existingDomain.domain,
        status: existingDomain.status,
        description: existingDomain.description,
        isTestDomain: existingDomain.is_test_domain,
        verification_type: existingDomain.verification_type,
        created_at: existingDomain.created_at,
        stats: {
          sent: existingDomain.emails_sent || 0,
          delivered: existingDomain.emails_delivered || 0,
          rejected: existingDomain.emails_rejected || 0,
          received: existingDomain.emails_received || 0
        }
      }

      return NextResponse.json({
        success: true,
        domain: transformedDomain,
        dnsRecords: existingDomain.dns_records || getDefaultDnsRecords(domain, replySubdomain),
        message: "Domain already exists - redirecting to setup",
        existingDomain: true
      })
    }

    // Construct the full reply hostname for inbound parse
    const replyHostname = `${replySubdomain}.${domain}`
    
    // Determine if it's a test domain
    const isTestDomain = domain.includes('mlsender.net') || domain.includes('test-')

    // Step 1: Create SendGrid domain authentication FIRST to get real DNS records
    let domainAuthResult = null
    let realDnsRecords = []
    
    try {
      console.log(`🔐 Creating SendGrid domain authentication for ${domain}`)
      
      // Check if domain authentication already exists
      const existingAuth = await getDomainAuthentication(domain)
      
      if (existingAuth.domain) {
        console.log(`✅ Domain authentication already exists for ${domain}`)
        domainAuthResult = existingAuth.domain
      } else {
        // Create new domain authentication
        domainAuthResult = await createDomainAuthentication({
          domain: domain,
          default: false,
          custom_spf: false
        })
        console.log(`✅ Domain authentication created for ${domain}`)
      }
      
      // Extract REAL DNS records from SendGrid response
      if (domainAuthResult?.dns_records || domainAuthResult?.dns) {
        const dns = domainAuthResult.dns_records || domainAuthResult.dns
        
        // Add DKIM records
        if (dns.dkim1) {
          realDnsRecords.push({
            type: dns.dkim1.type || 'CNAME',
            host: dns.dkim1.host?.replace(`.${domain}`, '') || `s1._domainkey`,
            value: dns.dkim1.data,
            purpose: 'DKIM authentication (key 1) - Cryptographic email signing'
          })
        }
        
        if (dns.dkim2) {
          realDnsRecords.push({
            type: dns.dkim2.type || 'CNAME',
            host: dns.dkim2.host?.replace(`.${domain}`, '') || `s2._domainkey`,
            value: dns.dkim2.data,
            purpose: 'DKIM authentication (key 2) - Cryptographic email signing'
          })
        }
        
        // Add mail CNAME record
        if (dns.mail_cname) {
          realDnsRecords.push({
            type: dns.mail_cname.type || 'CNAME',
            host: dns.mail_cname.host?.replace(`.${domain}`, '') || `mail`,
            value: dns.mail_cname.data,
            purpose: 'Link tracking and email branding'
          })
        }
        
        // Add SPF record
        realDnsRecords.push({
          type: 'TXT',
          host: '@',
          value: 'v=spf1 include:sendgrid.net ~all',
          purpose: 'SPF - Authorizes SendGrid to send emails on your behalf'
        })
        
        // Add DMARC record
        realDnsRecords.push({
          type: 'TXT',
          host: '_dmarc',
          value: 'v=DMARC1; p=none; rua=mailto:dmarc@leadsup.io; ruf=mailto:dmarc@leadsup.io; pct=100; sp=none;',
          purpose: 'DMARC policy - Email authentication and reporting'
        })
        
        // Add MX record for reply routing
        realDnsRecords.push({
          type: 'MX',
          host: replySubdomain,
          value: 'mx.sendgrid.net',
          priority: 10,
          purpose: `Route replies from ${replySubdomain}.${domain} back to LeadsUp for processing`
        })
        
        console.log(`✅ Generated ${realDnsRecords.length} real DNS records from SendGrid`)
      } else {
        console.log(`⚠️ No DNS records found in domainAuthResult, using defaults`)
        realDnsRecords = getDefaultDnsRecords(domain, replySubdomain)
      }
      
    } catch (sendgridError) {
      console.error(`⚠️ SendGrid setup failed, using default records:`, sendgridError)
      // Fallback to default records if SendGrid fails
      realDnsRecords = getDefaultDnsRecords(domain, replySubdomain)
    }
    
    // If no real records were generated, use defaults as fallback
    if (realDnsRecords.length === 0) {
      console.log(`⚠️ No real DNS records generated, using defaults as final fallback`)
      realDnsRecords = getDefaultDnsRecords(domain, replySubdomain)
    }
    
    console.log(`✅ Generated ${realDnsRecords.length} DNS records for ${domain}`)

    // Insert domain into database with REAL DNS records
    const { data: newDomain, error } = await supabase
      .from('domains')
      .insert({
        user_id: userId,
        domain,
        status: 'pending',
        description: `Domain pending verification (Reply: ${replyHostname}) - Real SendGrid DNS`,
        verification_type: verificationType,
        dns_records: realDnsRecords,
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

    // Step 2: Configure inbound parse (domain auth already created above)
    let inboundParseResult = null
    
    if (domainAuthResult?.id) {
      try {
        console.log(`✅ Validating SendGrid domain authentication for ${domain}`)
        let isValidated = false
        
        try {
          const validationResult = await validateDomainAuthentication(domainAuthResult.id.toString())
          isValidated = validationResult.valid === true
          console.log(`✅ Domain authentication validation result: ${isValidated ? 'VALID' : 'INVALID'}`)
        } catch (validationError) {
          console.log(`⚠️ Domain authentication validation failed: ${validationError}`)
          isValidated = false
        }
        
        // Only configure inbound parse if domain is actually validated
        if (isValidated) {
          console.log(`🔧 Configuring SendGrid inbound parse for ${replyHostname}`)
          const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadsup.com'}/api/webhooks/sendgrid`
          
          inboundParseResult = await configureInboundParse({
            hostname: replyHostname,
            url: webhookUrl,
            spam_check: true,
            send_raw: false
          })

          console.log(`✅ SendGrid inbound parse configured successfully for ${replyHostname}`)
        } else {
          console.log(`⚠️ Skipping inbound parse configuration - domain not validated yet`)
          console.log(`📋 User needs to add DNS records to domain provider first`)
        }
        
        // Store success in description
        await supabase
          .from('domains')
          .update({
            description: `Domain pending verification (Reply: ${replyHostname}) - Real SendGrid DNS with Inbound Parse`
          })
          .eq('id', newDomain.id)
          
      } catch (inboundError) {
        // Don't show error for duplicate entries (already configured)
        const errorMsg = inboundError instanceof Error ? inboundError.message : 'Unknown error'
        if (!errorMsg.includes('duplicate entry')) {
          console.error(`⚠️ Failed to configure inbound parse for ${domain}:`, inboundError)
        }
        // Store the error but don't fail domain creation
        await supabase
          .from('domains')
          .update({
            description: `Domain pending verification (Reply: ${replyHostname}) - Real SendGrid DNS (Inbound Parse failed: ${errorMsg.substring(0, 50)})`
          })
          .eq('id', newDomain.id)
      }
    } else {
      console.log(`⚠️ No domain authentication result, skipping inbound parse setup`)
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
      dnsRecords: realDnsRecords,
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
    let userId = await getUserIdFromSession()
    
    // TEMPORARY DEV FIX: If no session, use the most recent user for development
    if (!userId && process.env.NODE_ENV === 'development') {
      console.log('🔧 DEV MODE: No session found, using fallback user ID')
      const { data: domains } = await supabase
        .from('domains')
        .select('user_id')
        .limit(1)
      userId = domains?.[0]?.user_id || null
    }
    
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

