import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import dns from 'dns'
import { promisify } from 'util'

const resolveTxt = promisify(dns.resolveTxt)
const resolveMx = promisify(dns.resolveMx)
const resolveCname = promisify(dns.resolveCname)

interface VerificationResult {
  record: string
  expected: string
  found: string | null
  verified: boolean
  error?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const domainId = params.id

    // Get domain from database
    const { data: domain, error: domainError } = await supabaseServer
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Verify DNS records
    const verificationResults = await verifyDNSRecords(domain)
    
    // Check if all required records are verified
    const allVerified = verificationResults.every(result => result.verified)
    const newStatus = allVerified ? 'verified' : 'failed'

    // Update domain status
    const { error: updateError } = await supabaseServer
      .from('domains')
      .update({
        status: newStatus,
        last_checked_at: new Date().toISOString(),
        verified_at: allVerified ? new Date().toISOString() : null
      })
      .eq('id', domainId)

    if (updateError) {
      console.error('Error updating domain:', updateError)
    }

    // Log verification attempt
    await supabaseServer
      .from('domain_verification_logs')
      .insert({
        domain_id: domainId,
        verification_type: 'manual',
        status: newStatus,
        dns_records_checked: verificationResults
      })

    // If verified, set up SendGrid integration
    if (allVerified) {
      await setupSendGridIntegration(domain)
    }

    return NextResponse.json({
      status: newStatus,
      verified: allVerified,
      results: verificationResults
    })

  } catch (error) {
    console.error('Domain verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}

async function verifyDNSRecords(domain: any): Promise<VerificationResult[]> {
  const results: VerificationResult[] = []

  try {
    // Verify SPF record
    const txtRecords = await resolveTxt(domain.domain)
    const spfRecord = txtRecords.flat().find(record => record.startsWith('v=spf1'))
    
    results.push({
      record: 'SPF',
      expected: domain.spf_record,
      found: spfRecord || null,
      verified: spfRecord?.includes('sendgrid.net') || false
    })

  } catch (error) {
    results.push({
      record: 'SPF',
      expected: domain.spf_record,
      found: null,
      verified: false,
      error: 'DNS lookup failed'
    })
  }

  try {
    // Verify DKIM record
    const dkimHost = domain.dkim_record.split(' ')[0] // Extract host from CNAME record
    const cnameRecords = await resolveCname(`${dkimHost}.${domain.domain}`)
    const dkimVerified = cnameRecords.some(record => record.includes('sendgrid.net'))
    
    results.push({
      record: 'DKIM',
      expected: domain.dkim_record,
      found: cnameRecords?.[0] || null,
      verified: dkimVerified
    })

  } catch (error) {
    results.push({
      record: 'DKIM',
      expected: domain.dkim_record,
      found: null,
      verified: false,
      error: 'DNS lookup failed'
    })
  }

  try {
    // Verify MX record for reply subdomain
    const replyDomain = `${domain.subdomain}.${domain.domain}`
    const mxRecords = await resolveMx(replyDomain)
    const mxVerified = mxRecords.some(record => record.exchange === 'mx.sendgrid.net')
    
    results.push({
      record: 'MX',
      expected: domain.mx_record,
      found: mxRecords?.[0]?.exchange || null,
      verified: mxVerified
    })

  } catch (error) {
    results.push({
      record: 'MX',
      expected: domain.mx_record,
      found: null,
      verified: false,
      error: 'DNS lookup failed'
    })
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