import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import dns from 'dns'
import { promisify } from 'util'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resolveTxt = promisify(dns.resolveTxt)
const resolveMx = promisify(dns.resolveMx)
const resolveCname = promisify(dns.resolveCname)

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

interface VerificationResult {
  record: string
  expected: string
  found: string | null
  verified: boolean
  error?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: domainId } = await params

    // Get domain from database
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', userId) // Ensure user owns this domain
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Verify DNS records
    const verificationResults = await verifyDNSRecords(domain)
    
    // Check if all required records are verified
    const allVerified = verificationResults.every(result => result.verified)
    const newStatus = allVerified ? 'verified' : 'failed'

    // Update domain status
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        status: newStatus,
        last_verification_attempt: new Date().toISOString(),
        verified_at: allVerified ? new Date().toISOString() : null,
        verification_error: allVerified ? null : 'DNS records not found or incorrect'
      })
      .eq('id', domainId)

    if (updateError) {
      console.error('Error updating domain:', updateError)
    }

    // Log verification attempt
    await supabase
      .from('domain_verification_history')
      .insert({
        domain_id: domainId,
        verification_type: 'manual',
        status: allVerified ? 'success' : 'failed',
        error_message: allVerified ? null : 'DNS records not found or incorrect',
        dns_records_checked: verificationResults,
        verification_details: { results: verificationResults }
      })

    // If verified, set up SendGrid integration
    if (allVerified) {
      await setupSendGridIntegration(domain)
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      verified: allVerified,
      results: verificationResults
    })

  } catch (error) {
    console.error('Domain verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    )
  }
}

async function verifyDNSRecords(domain: any): Promise<VerificationResult[]> {
  const results: VerificationResult[] = []
  const dnsRecords = domain.dns_records || []

  // Verify each DNS record
  for (const record of dnsRecords) {
    if (!record.required) continue

    try {
      switch (record.type) {
        case 'TXT': {
          if (record.name === '@') {
            // SPF record verification
            const txtRecords = await resolveTxt(domain.domain)
            const spfRecord = txtRecords.flat().find(r => r.startsWith('v=spf1'))
            
            results.push({
              record: `TXT (${record.purpose})`,
              expected: record.value,
              found: spfRecord || null,
              verified: spfRecord?.includes('sendgrid.net') || false
            })
          } else if (record.name === '_leadsup-verify') {
            // Verification token check
            const txtRecords = await resolveTxt(`${record.name}.${domain.domain}`)
            const verifyRecord = txtRecords.flat().find(r => r.startsWith('leadsup-verify-'))
            
            results.push({
              record: `TXT (${record.purpose})`,
              expected: record.value,
              found: verifyRecord || null,
              verified: verifyRecord === record.value
            })
          }
          break
        }
        
        case 'CNAME': {
          // DKIM record verification
          const cnameRecords = await resolveCname(`${record.name}.${domain.domain}`)
          const dkimVerified = cnameRecords.some(r => r.includes('sendgrid.net'))
          
          results.push({
            record: `CNAME (${record.purpose})`,
            expected: record.value,
            found: cnameRecords?.[0] || null,
            verified: dkimVerified
          })
          break
        }
        
        case 'MX': {
          // MX record verification (optional)
          const replyDomain = `${record.name}.${domain.domain}`
          const mxRecords = await resolveMx(replyDomain)
          const mxVerified = mxRecords.some(r => r.exchange === record.value)
          
          results.push({
            record: `MX (${record.purpose})`,
            expected: record.value,
            found: mxRecords?.[0]?.exchange || null,
            verified: mxVerified
          })
          break
        }
      }
    } catch (error) {
      results.push({
        record: `${record.type} (${record.purpose})`,
        expected: record.value,
        found: null,
        verified: false,
        error: 'DNS lookup failed'
      })
    }
  }

  return results
}

async function setupSendGridIntegration(domain: any) {
  try {
    // TODO: Integrate with SendGrid API
    // 1. Authenticate domain for outbound sending
    // 2. Set up inbound parse for reply subdomain
    
    console.log(`Setting up SendGrid for ${domain.domain}`)
    
    // Example SendGrid API calls:
    // await sendgrid.authenticateDomain(domain.domain)
    // await sendgrid.createInboundParse(`${domain.subdomain}.${domain.domain}`)
    
  } catch (error) {
    console.error('SendGrid setup failed:', error)
  }
}