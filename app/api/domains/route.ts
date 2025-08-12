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
function getDefaultDnsRecords(domain: string) {
  return [
    {
      type: 'TXT',
      name: '@',
      value: 'v=spf1 include:sendgrid.net ~all',
      purpose: 'Email authentication (SPF)',
      required: true
    },
    {
      type: 'CNAME',
      name: 's1._domainkey',
      value: 's1.domainkey.u30435661.wl250.sendgrid.net',
      purpose: 'Email signing (DKIM)',
      required: true
    },
    {
      type: 'MX',
      name: 'reply',
      value: 'mx.sendgrid.net',
      priority: 10,
      purpose: 'Route replies to LeadsUp',
      required: false
    },
    {
      type: 'TXT',
      name: '_leadsup-verify',
      value: `leadsup-verify-${Date.now()}`,
      purpose: 'Domain verification',
      required: true
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
    const { domain, verificationType = 'manual' } = body

    if (!domain) {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
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
    const dnsRecords = getDefaultDnsRecords(domain)
    
    // Update verification record with actual token
    dnsRecords.forEach(record => {
      if (record.name === '_leadsup-verify') {
        record.value = verificationToken
      }
    })

    // Determine if it's a test domain
    const isTestDomain = domain.includes('mlsender.net') || domain.includes('test-')

    // Insert domain into database
    const { data: newDomain, error } = await supabase
      .from('domains')
      .insert({
        user_id: userId,
        domain,
        status: 'pending',
        description: 'Domain pending verification',
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
      dnsRecords
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
      .select('id, domain')
      .eq('id', domainId)
      .eq('user_id', userId)
      .single()

    if (checkError || !existingDomain) {
      return NextResponse.json(
        { success: false, error: "Domain not found or unauthorized" },
        { status: 404 }
      )
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

