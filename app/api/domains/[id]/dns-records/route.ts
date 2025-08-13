import { NextRequest, NextResponse } from 'next/server'
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
      console.error("Error fetching user from session:", error)
      return null
    }

    return data.user_id
  } catch (error) {
    console.error("Error in getUserIdFromSession:", error)
    return null
  }
}

// Helper function to fetch authenticated domains from SendGrid
async function fetchSendGridAuthenticatedDomains() {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    throw new Error('SendGrid API key not configured')
  }

  try {
    // Try the new v3 endpoint first
    const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      return response.json()
    }

    // If v3/whitelabel/domains fails, try v3/sendgrid/domains (newer endpoint)
    const altResponse = await fetch('https://api.sendgrid.com/v3/sendapi/v3/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (altResponse.ok) {
      return altResponse.json()
    }

    console.error('SendGrid API error - both endpoints failed')
    return []
  } catch (error) {
    console.error('SendGrid API error:', error)
    return []
  }
}

// Helper function to strip domain name from host field
function stripDomainFromHost(host: string, domain: string): string {
  if (!host) return '@';
  
  // If host is exactly the domain, return @
  if (host === domain) return '@';
  
  // If host ends with the domain, remove it
  if (host.endsWith(`.${domain}`)) {
    return host.replace(`.${domain}`, '');
  }
  
  // Return as-is if no domain found
  return host;
}

// Helper function to get DNS records for a specific domain from SendGrid
async function getSendGridDNSRecords(domain: string, replySubdomain: string = 'reply') {
  try {
    // First, fetch all authenticated domains
    const authenticatedDomains = await fetchSendGridAuthenticatedDomains()
    
    // Find the matching domain
    const domainConfig = authenticatedDomains.find((d: any) => 
      d.domain === domain || d.domain.includes(domain)
    )

    if (domainConfig) {
      // Extract DNS records from the SendGrid domain configuration
      const dnsRecords = []

      // Add SPF record (always include for authenticated domains)
      dnsRecords.push({
        type: 'TXT',
        host: '@',
        value: 'v=spf1 include:sendgrid.net ~all',
        purpose: 'SPF - Authorizes SendGrid to send emails on your behalf'
      })

      // Add DKIM records
      if (domainConfig.dns?.dkim1) {
        const host1 = stripDomainFromHost(domainConfig.dns.dkim1.host, domain)
        dnsRecords.push({
          type: domainConfig.dns.dkim1.type || 'CNAME',
          host: host1,
          value: domainConfig.dns.dkim1.data,
          purpose: 'DKIM authentication (key 1) - Cryptographic email signing'
        })
      }

      if (domainConfig.dns?.dkim2) {
        const host2 = stripDomainFromHost(domainConfig.dns.dkim2.host, domain)
        dnsRecords.push({
          type: domainConfig.dns.dkim2.type || 'CNAME',
          host: host2,
          value: domainConfig.dns.dkim2.data,
          purpose: 'DKIM authentication (key 2) - Cryptographic email signing'
        })
      }

      // Add mail CNAME record for link tracking
      if (domainConfig.dns?.mail_cname) {
        const hostCname = stripDomainFromHost(domainConfig.dns.mail_cname.host, domain)
        dnsRecords.push({
          type: domainConfig.dns.mail_cname.type || 'CNAME',
          host: hostCname,
          value: domainConfig.dns.mail_cname.data,
          purpose: 'Link tracking and email branding'
        })
      }

      // Add subdomain record if exists (but skip for leadsup.io to use verified records only)
      if (domainConfig.subdomain && domain !== 'leadsup.io' && !domain.includes('leadsup.io')) {
        const emSubdomain = `em${domainConfig.id}`
        dnsRecords.push({
          type: 'CNAME',
          host: emSubdomain,
          value: `${domainConfig.subdomain}.${domainConfig.user_id}.sendgrid.net`,
          purpose: 'Link tracking subdomain'
        })
      }

      // Add MX record for reply routing
      dnsRecords.push({
        type: 'MX',
        host: replySubdomain,
        value: 'mx.sendgrid.net',
        priority: 10,
        purpose: `Route replies from ${replySubdomain}.${domain} back to LeadsUp for processing`
      })

      // Add DMARC record (use SendGrid verified format for leadsup.io)
      if (domain === 'leadsup.io' || domain.includes('leadsup.io')) {
        dnsRecords.push({
          type: 'TXT',
          host: '_dmarc',
          value: 'v=DMARC1; p=none;',
          purpose: 'DMARC policy - Email authentication and reporting'
        })
      } else {
        dnsRecords.push({
          type: 'TXT',
          host: '_dmarc',
          value: 'v=DMARC1; p=none; rua=mailto:dmarc@leadsup.io; ruf=mailto:dmarc@leadsup.io; pct=100; sp=none;',
          purpose: 'DMARC policy - Email authentication and reporting'
        })
      }

      return dnsRecords
    }

    // If no authenticated domain found in SendGrid, return default records
    return getDefaultDNSRecords(domain, replySubdomain)
  } catch (error) {
    console.error('Error fetching SendGrid DNS records:', error)
    // Fallback to default records if SendGrid API fails
    return getDefaultDNSRecords(domain, replySubdomain)
  }
}

// Default DNS records for new domains
function getDefaultDNSRecords(domain: string, replySubdomain: string = 'reply') {
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
        purpose: 'DKIM authentication (key 1) - Cryptographic email signing'
      },
      {
        type: 'CNAME',
        host: 's2._domainkey',
        value: 's2.domainkey.u55053564.wl065.sendgrid.net',
        purpose: 'DKIM authentication (key 2) - Cryptographic email signing'
      },
      {
        type: 'TXT',
        host: '_dmarc',
        value: 'v=DMARC1; p=none;',
        purpose: 'DMARC policy - Email authentication and reporting'
      },
      {
        type: 'MX',
        host: replySubdomain,
        value: 'mx.sendgrid.net',
        priority: 10,
        purpose: `Route replies from ${replySubdomain}.${domain} back to LeadsUp for processing`
      }
    ]
  }

  // Generate default records for new domains
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
      purpose: 'DKIM authentication (key 1) - Cryptographic email signing'
    },
    {
      type: 'CNAME',
      host: 's2._domainkey',
      value: `s2.domainkey.${sendgridSubdomain}`,
      purpose: 'DKIM authentication (key 2) - Cryptographic email signing'
    },
    {
      type: 'TXT',
      host: '@',
      value: 'v=spf1 include:sendgrid.net ~all',
      purpose: 'SPF - Authorizes SendGrid to send emails on your behalf'
    },
    {
      type: 'TXT',
      host: '_dmarc',
      value: 'v=DMARC1; p=none; rua=mailto:dmarc@leadsup.io; ruf=mailto:dmarc@leadsup.io; pct=100; sp=none;',
      purpose: 'DMARC policy - Email authentication and reporting'
    },
    {
      type: 'MX',
      host: replySubdomain,
      value: 'mx.sendgrid.net',
      priority: 10,
      purpose: `Route replies from ${replySubdomain}.${domain} back to LeadsUp for processing`
    }
  ]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user is authenticated
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Await params before accessing its properties
    const { id } = await params
    // The 'id' param here is actually the domain name
    const domain = id

    // Verify user owns this domain
    const { data: domainRecord, error } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', userId)
      .eq('domain', domain)
      .single()

    if (error || !domainRecord) {
      return NextResponse.json(
        { success: false, error: "Domain not found or unauthorized" },
        { status: 404 }
      )
    }

    // Extract reply subdomain from domain description
    let replySubdomain = 'reply' // default
    if (domainRecord.description) {
      const replyMatch = domainRecord.description.match(/Reply:\s*([^.\s)]+)/)
      if (replyMatch && replyMatch[1]) {
        replySubdomain = replyMatch[1].split('.')[0] // Get just the subdomain part
      }
    }
    
    console.log(`Using reply subdomain '${replySubdomain}' for domain ${domain}`)
    
    // Use stored DNS records from domain creation first, fallback to SendGrid
    let dnsRecords = domainRecord.dns_records || []
    let source = 'stored'
    
    // If no stored records, fetch from SendGrid or use defaults
    if (!dnsRecords || dnsRecords.length === 0) {
      console.log(`No stored DNS records for ${domain}, fetching from SendGrid`)
      dnsRecords = await getSendGridDNSRecords(domain, replySubdomain)
      source = 'sendgrid'
      
      // Store the fetched DNS records in the database for future use
      await supabase
        .from('domains')
        .update({
          dns_records: dnsRecords,
          updated_at: new Date().toISOString()
        })
        .eq('id', domainRecord.id)
    } else {
      console.log(`Using stored DNS records for ${domain} (${dnsRecords.length} records)`)
    }

    return NextResponse.json({
      success: true,
      domain,
      records: dnsRecords, // Changed from dnsRecords to records to match frontend expectation
      source
    })
  } catch (error) {
    console.error("Error in GET /api/domains/[domain]/dns-records:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch DNS records" },
      { status: 500 }
    )
  }
}