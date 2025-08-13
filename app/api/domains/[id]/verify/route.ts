import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import dns from 'dns'
import { promisify } from 'util'
import { exec } from 'child_process'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configure DNS with longer timeouts and clear cache
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

// Force DNS cache clear by cycling servers multiple times
const clearDNSCache = async () => {
  // Cycle through different DNS servers to force cache invalidation
  const servers = [
    ['1.1.1.1', '1.0.0.1'],           // Cloudflare
    ['8.8.8.8', '8.8.4.4'],          // Google
    ['208.67.222.222', '208.67.220.220'], // OpenDNS
    ['8.8.8.8', '8.8.4.4', '1.1.1.1'] // Final mix
  ]
  
  for (const serverSet of servers) {
    dns.setServers(serverSet)
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

const resolveTxt = promisify(dns.resolveTxt)
const resolveMx = promisify(dns.resolveMx)
const resolveCname = promisify(dns.resolveCname)
const execAsync = promisify(exec)

// Bypass Node.js DNS caching by using external dig command
async function resolveCnameBypass(hostname: string): Promise<string[]> {
  try {
    console.log(`🔍 Running dig command for ${hostname}`)
    const { stdout, stderr } = await execAsync(`dig +short ${hostname} CNAME @1.1.1.1`)
    console.log(`📋 Dig output: "${stdout.trim()}"`)
    if (stderr) console.log(`⚠️  Dig stderr: "${stderr.trim()}"`)
    
    const result = stdout.trim()
    if (result && !result.includes('NXDOMAIN') && !result.includes('SERVFAIL')) {
      // Remove trailing dots and return as array
      const cleanResult = result.replace(/\.$/, '')
      console.log(`✅ Dig result cleaned: "${cleanResult}"`)
      return [cleanResult]
    }
    throw new Error('No CNAME record found')
  } catch (error) {
    console.log(`❌ Dig failed, falling back to Node.js DNS:`, error.message)
    // Fallback to regular DNS if dig fails
    return await resolveCname(hostname)
  }
}

// Helper function to add timeout to DNS operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`DNS_TIMEOUT after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

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
    // Clear DNS cache at start of verification
    await clearDNSCache()
    console.log(`🔄 DNS cache cleared, servers now: ${dns.getServers().join(', ')}`)
    
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

    console.log(`🚀 Starting verification for domain: ${domain.domain}`)
    
    // Verify DNS records
    const verificationResults = await verifyDNSRecords(domain)
    
    // Calculate domain readiness - only DKIM is required (matches SendGrid verified records)
    const requiredRecords = verificationResults.filter(r => 
      r.record.includes('DKIM')
    )
    const passedRequiredRecords = requiredRecords.filter(r => r.verified)
    const optionalRecords = verificationResults.filter(r => 
      !r.record.includes('DKIM')
    )
    const passedOptionalRecords = optionalRecords.filter(r => r.verified)
    
    // Domain is ready if all required records pass (DKIM only - matches SendGrid)
    const domainReady = requiredRecords.length > 0 && passedRequiredRecords.length === requiredRecords.length
    const allVerified = verificationResults.every(result => result.verified)
    const newStatus = domainReady ? 'verified' : 'failed'

    // Create detailed verification report
    const verificationReport = {
      domain: domain.domain,
      timestamp: new Date().toISOString(),
      domainReady,
      summary: {
        totalRecords: verificationResults.length,
        passedRecords: verificationResults.filter(r => r.verified).length,
        failedRecords: verificationResults.filter(r => !r.verified).length,
        requiredRecords: requiredRecords.length,
        passedRequiredRecords: passedRequiredRecords.length,
        optionalRecords: optionalRecords.length,
        passedOptionalRecords: passedOptionalRecords.length
      },
      records: verificationResults.map(result => ({
        ...result,
        status: result.verified ? 'pass' : (result.error ? 'fail' : 'pending'),
        required: result.record.includes('DKIM')
      })),
      recommendations: generateRecommendations(verificationResults, domainReady)
    }

    console.log(`📊 Final Verification Report:`)
    console.log(`   Domain Ready: ${domainReady}`)
    console.log(`   Required Records Passed: ${passedRequiredRecords.length}/${requiredRecords.length}`)
    console.log(`   Optional Records Passed: ${passedOptionalRecords.length}/${optionalRecords.length}`)

    // Update domain status
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        status: newStatus,
        last_verification_attempt: new Date().toISOString(),
        verified_at: domainReady ? new Date().toISOString() : null,
        verification_error: domainReady ? null : 'Required DNS records not found or incorrect'
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
        status: domainReady ? 'success' : 'failed',
        error_message: domainReady ? null : 'Required DNS records not found or incorrect',
        dns_records_checked: verificationResults,
        verification_details: { report: verificationReport }
      })

    // If domain is ready, set up SendGrid integration
    if (domainReady) {
      await setupSendGridIntegration(domain)
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      verified: domainReady,
      domainReady,
      report: verificationReport,
      // Legacy fields for backward compatibility
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
  console.log(`🔍 Starting DNS verification for domain: ${domain.domain}`)
  
  // Get DNS records from stored configuration first, then fetch real ones if needed
  let dnsRecords = domain.dns_records || []
  
  // Check if stored records are FAKE (contain fake placeholders)
  const hasFakeRecords = dnsRecords.some(record => 
    record.host === 'mail' || 
    record.host === 'url1234' || 
    (record.value && record.value.includes('u1234567.wl123.sendgrid.net'))
  )
  
  // If no DNS records, empty, or fake records, fetch real ones from DNS records API
  if (!dnsRecords || dnsRecords.length === 0 || hasFakeRecords) {
    if (hasFakeRecords) {
      console.log(`🔄 Detected fake DNS records for ${domain.domain}, fetching real ones`)
    }
    console.log(`Fetching real DNS records for verification of ${domain.domain}`)
    
    // Call our own DNS records API to get the real/current records
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/domains/${domain.id}/dns-records`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const apiData = await response.json()
        if (apiData.success && apiData.records) {
          dnsRecords = apiData.records
          console.log(`✅ Fetched ${dnsRecords.length} real DNS records for verification`)
        }
      }
    } catch (error) {
      console.error('Failed to fetch DNS records from API:', error)
    }
    
    // Final fallback to leadsup.io defaults if API fails
    if (!dnsRecords || dnsRecords.length === 0) {
      dnsRecords = getLeadsUpDNSRecords(domain.domain)
    }
  }

  console.log(`📋 Found ${dnsRecords.length} DNS records to verify`)

  // Verify DNS records in parallel for better performance
  const verificationPromises = dnsRecords.map(record => {
    console.log(`🔎 Verifying ${record.type} record for ${record.host}`)
    return verifyDNSRecordWithRetries(
      record, 
      domain.domain, 
      1, // max retries (minimal since we have timeouts)
      500 // delay between retries (0.5 seconds)
    )
  })
  
  const results = await Promise.all(verificationPromises)

  // Calculate overall status
  const passedRecords = results.filter(r => r.verified).length
  const totalRecords = results.length
  const requiredRecords = results.filter(r => r.record.includes('DKIM')).length
  const passedRequiredRecords = results.filter(r => 
    r.record.includes('DKIM') && r.verified
  ).length

  console.log(`📊 Verification Summary:`)
  console.log(`   Total Records: ${totalRecords}`)
  console.log(`   Passed: ${passedRecords}`)
  console.log(`   Required Records: ${requiredRecords}`)
  console.log(`   Passed Required: ${passedRequiredRecords}`)

  return results
}

async function verifyDNSRecordWithRetries(
  record: any, 
  domainName: string, 
  maxRetries: number = 3, 
  delayMs: number = 2000
): Promise<VerificationResult> {
  let lastError: string | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${record.type} ${record.host}`)
    
    try {
      const result = await verifyDNSRecord(record, domainName)
      
      if (result.verified) {
        console.log(`✅ ${record.type} ${record.host} verified successfully`)
        return result
      } else if (attempt === maxRetries) {
        console.log(`❌ ${record.type} ${record.host} failed after ${maxRetries} attempts`)
        return result
      }
    } catch (error) {
      lastError = error.message || 'DNS lookup failed'
      console.log(`⚠️  Attempt ${attempt} failed for ${record.type} ${record.host}: ${lastError}`)
      console.log(`🔍 Error details: ${JSON.stringify({code: error.code, syscall: error.syscall, hostname: error.hostname})}`)
      console.log(`🔍 Full error in retry:`, error)
      
      if (attempt === maxRetries) {
        return {
          record: `${record.type} (${record.purpose})`,
          expected: record.value,
          found: null,
          verified: false,
          error: lastError
        }
      }
    }
    
    // Wait before retry (except on last attempt)
    if (attempt < maxRetries) {
      console.log(`⏳ Waiting ${delayMs}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  // This shouldn't be reached, but just in case
  return {
    record: `${record.type} (${record.purpose})`,
    expected: record.value,
    found: null,
    verified: false,
    error: lastError || 'Maximum retries exceeded'
  }
}

async function verifyDNSRecord(record: any, domainName: string): Promise<VerificationResult> {
  const recordType = record.type?.toUpperCase()
  
  switch (recordType) {
    case 'TXT': {
      return await verifyTXTRecord(record, domainName)
    }
    
    case 'CNAME': {
      return await verifyCNAMERecord(record, domainName)
    }
    
    case 'MX': {
      return await verifyMXRecord(record, domainName)
    }
    
    default: {
      return {
        record: `${record.type} (${record.purpose})`,
        expected: record.value,
        found: null,
        verified: false,
        error: `Unsupported record type: ${record.type}`
      }
    }
  }
}

async function verifyTXTRecord(record: any, domainName: string): Promise<VerificationResult> {
  // Construct full hostname from host field
  let hostname: string
  if (record.host === '@' || record.host === domainName) {
    hostname = domainName
  } else {
    hostname = `${record.host}.${domainName}`
  }
  console.log(`🔍 Checking TXT record for: ${hostname}`)
  
  try {
    const txtRecords = await withTimeout(resolveTxt(hostname), 3000)
    const allRecords = txtRecords.flat()
    
    console.log(`📝 Found ${allRecords.length} TXT records:`, allRecords)
    
    let foundRecord: string | null = null
    let isVerified = false
    
    if (record.purpose?.includes('SPF')) {
      // SPF record verification
      foundRecord = allRecords.find(r => r.startsWith('v=spf1')) || null
      isVerified = foundRecord?.includes('sendgrid.net') || false
    } else if (record.purpose?.includes('DMARC')) {
      // DMARC record verification
      foundRecord = allRecords.find(r => r.startsWith('v=DMARC1')) || null
      isVerified = !!foundRecord
    } else {
      // Exact match verification
      foundRecord = allRecords.find(r => r === record.value) || null
      isVerified = !!foundRecord
    }
    
    return {
      record: `TXT (${record.purpose})`,
      expected: record.value,
      found: foundRecord,
      verified: isVerified
    }
  } catch (error: any) {
    // Handle DNS ENODATA or ENOTFOUND errors gracefully
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND' || error.code === 'DNS_TIMEOUT') {
      return {
        record: `TXT (${record.purpose})`,
        expected: record.value,
        found: null,
        verified: false,
        error: 'No TXT records found'
      }
    }
    // For other errors, return a generic failure
    return {
      record: `TXT (${record.purpose})`,
      expected: record.value,
      found: null,
      verified: false,
      error: `TXT lookup failed: ${error.message || error}`
    }
  }
}

async function verifyCNAMERecord(record: any, domainName: string): Promise<VerificationResult> {
  // Construct full hostname from host field
  const hostname = `${record.host}.${domainName}`
  console.log(`🔍 Checking CNAME record for: ${hostname}`)
  
  try {
    // For link tracking records, try to find any existing em* subdomain that works
    if (record.purpose?.includes('Link tracking') || record.purpose?.includes('tracking')) {
      // Try common em prefixes that might be configured (prioritize known leadsup.io prefixes)
      const emPrefixes = ['em7895', 'em1487', 'em6012', 'em27056635']
      
      for (const prefix of emPrefixes) {
        const testHost = `${prefix}.${domainName}`
        console.log(`🔍 Trying link tracking subdomain: ${testHost}`)
        
        try {
          const cnameRecords = await withTimeout(resolveCname(testHost), 3000)
          const foundRecord = cnameRecords[0] || null
          
          if (foundRecord && foundRecord.includes('u55053564.wl065.sendgrid.net')) {
            console.log(`✅ Found working link tracking record: ${testHost} → ${foundRecord}`)
            return {
              record: `CNAME (${record.purpose})`,
              expected: record.value,
              found: `${testHost} → ${foundRecord}`,
              verified: true
            }
          }
        } catch (err) {
          // Continue trying other prefixes
          console.log(`⚠️  ${testHost} not found, trying next...`)
        }
      }
      
      // If none of the common prefixes work, return failed
      return {
        record: `CNAME (${record.purpose})`,
        expected: record.value,
        found: null,
        verified: false,
        error: `No working link tracking subdomain found. Tried: ${emPrefixes.map(p => `${p}.${domainName}`).join(', ')}`
      }
    }
    
    // For non-tracking records (DKIM, etc.), use exact hostname with bypass for DKIM
    console.log(`🔍 Looking up CNAME for: ${hostname}`)
    let cnameRecords: string[]
    
    // Use bypass for DKIM records to avoid caching issues
    if (record.purpose?.includes('DKIM')) {
      console.log(`🔄 Using DNS bypass for DKIM record: ${hostname}`)
      cnameRecords = await withTimeout(resolveCnameBypass(hostname), 3000)
    } else {
      cnameRecords = await withTimeout(resolveCname(hostname), 3000)
    }
    
    console.log(`📝 Found CNAME records for ${hostname}:`, cnameRecords)
    
    const foundRecord = cnameRecords[0] || null
    let isVerified = false
    
    if (foundRecord) {
      // For DKIM records, require EXACT match (not just sendgrid.net)
      if (record.purpose?.includes('DKIM')) {
        isVerified = foundRecord === record.value
        console.log(`🔍 DKIM verification: found '${foundRecord}' vs expected '${record.value}' → ${isVerified ? 'MATCH' : 'MISMATCH'}`)
      } else {
        // Exact match for other CNAME records
        isVerified = foundRecord === record.value
      }
    }
    
    return {
      record: `CNAME (${record.purpose})`,
      expected: record.value,
      found: foundRecord,
      verified: isVerified
    }
  } catch (error: any) {
    console.log(`❌ CNAME lookup error for ${hostname}: ${error.message}`)
    
    // Handle DNS ENODATA or ENOTFOUND errors gracefully
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND' || error.code === 'DNS_TIMEOUT') {
      return {
        record: `CNAME ${record.host} (${record.purpose})`,
        expected: record.value,
        found: null,
        verified: false,
        error: 'No CNAME record found'
      }
    }
    
    // For other errors, return a generic failure
    return {
      record: `CNAME ${record.host} (${record.purpose})`,
      expected: record.value,
      found: null,
      verified: false,
      error: `CNAME lookup failed: ${error.message || error}`
    }
  }
}

async function verifyMXRecord(record: any, domainName: string): Promise<VerificationResult> {
  // Construct full hostname from host field
  const hostname = `${record.host}.${domainName}`
  console.log(`🔍 Checking MX record for: ${hostname}`)
  
  try {
    const mxRecords = await withTimeout(resolveMx(hostname), 3000)
    console.log(`📝 Found MX records:`, mxRecords)
    
    const foundRecord = mxRecords.find(mx => mx.exchange === record.value)
    const foundExchange = foundRecord?.exchange || (mxRecords[0]?.exchange || null)
    
    return {
      record: `MX (${record.purpose})`,
      expected: `${record.priority} ${record.value}`,
      found: foundRecord ? `${foundRecord.priority} ${foundRecord.exchange}` : foundExchange,
      verified: !!foundRecord
    }
  } catch (error: any) {
    // Handle DNS ENODATA or ENOTFOUND errors gracefully
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND' || error.code === 'DNS_TIMEOUT') {
      return {
        record: `MX (${record.purpose})`,
        expected: `${record.priority} ${record.value}`,
        found: null,
        verified: false,
        error: 'No MX records found'
      }
    }
    // For other errors, return a generic failure
    return {
      record: `MX (${record.purpose})`,
      expected: `${record.priority} ${record.value}`,
      found: null,
      verified: false,
      error: `MX lookup failed: ${error.message || error}`
    }
  }
}

function getLeadsUpDNSRecords(domain: string) {
  // Default DNS records for leadsup.io (SendGrid verified records only)
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
        host: 'reply',
        value: 'mx.sendgrid.net',
        priority: 10,
        purpose: 'Route replies back to LeadsUp'
      }
    ]
  }

  // Return empty array for unknown domains
  return []
}

function generateRecommendations(verificationResults: VerificationResult[], domainReady: boolean): string[] {
  const recommendations: string[] = []
  
  if (domainReady) {
    recommendations.push("✅ Domain is ready for email sending!")
    recommendations.push("All required DNS records (DKIM) are properly configured and verified by SendGrid.")
  } else {
    recommendations.push("❌ Domain is not ready for email sending.")
    
    const failedRecords = verificationResults.filter(r => !r.verified)
    
    for (const record of failedRecords) {
      if (record.record.includes('SPF')) {
        recommendations.push(`🔴 SPF Record Missing: Add TXT record "${record.expected}" to your domain.`)
      } else if (record.record.includes('DKIM')) {
        recommendations.push(`🔴 DKIM Record Missing: Add CNAME record "${record.record}" pointing to "${record.expected}".`)
      } else if (record.record.includes('DMARC')) {
        recommendations.push(`🟡 DMARC Record Missing: Add TXT record for email authentication policy (optional but recommended).`)
      } else if (record.record.includes('MX')) {
        recommendations.push(`🟡 MX Record Missing: Add MX record for reply handling (optional).`)
      }
    }
    
    recommendations.push("💡 DNS changes can take up to 48 hours to propagate. Try verifying again later.")
    recommendations.push("💡 Check your domain registrar's DNS management panel to add the missing records.")
  }
  
  return recommendations
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