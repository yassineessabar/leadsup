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
    
    // Step 1: FIRST verify SendGrid domain authentication status
    let sendgridDomainValid = false
    let sendgridValidationError = null
    
    try {
      const { getDomainAuthentication, validateDomainAuthentication } = await import('@/lib/sendgrid')
      
      console.log(`🔐 Checking SendGrid domain authentication for ${domain.domain}`)
      const authResult = await getDomainAuthentication(domain.domain)
      
      if (authResult.domain) {
        console.log(`📋 Found domain auth (ID: ${authResult.domain.id}, Valid: ${authResult.domain.valid})`)
        
        if (!authResult.domain.valid) {
          console.log(`🔄 Attempting to validate domain authentication...`)
          const validationResult = await validateDomainAuthentication(authResult.domain.id.toString())
          sendgridDomainValid = validationResult.valid
          
          if (!sendgridDomainValid) {
            sendgridValidationError = `SendGrid domain authentication failed validation: ${JSON.stringify(validationResult.validation_results)}`
            console.log(`❌ SendGrid validation failed:`, validationResult.validation_results)
          } else {
            console.log(`✅ SendGrid domain authentication validated successfully`)
          }
        } else {
          sendgridDomainValid = true
          console.log(`✅ SendGrid domain authentication already valid`)
        }
      } else {
        sendgridValidationError = `No SendGrid domain authentication found for ${domain.domain}`
        console.log(`❌ No SendGrid domain authentication found`)
      }
    } catch (sendgridError) {
      sendgridValidationError = `SendGrid error: ${sendgridError.message}`
      console.log(`❌ SendGrid check failed:`, sendgridError.message)
    }
    
    // Step 2: Verify DNS records
    const verificationResults = await verifyDNSRecords(domain)
    
    // Calculate domain readiness - requires BOTH DNS records AND SendGrid domain authentication
    const requiredRecords = verificationResults.filter(r => 
      r.record.includes('DKIM')
    )
    const passedRequiredRecords = requiredRecords.filter(r => r.verified)
    const optionalRecords = verificationResults.filter(r => 
      !r.record.includes('DKIM')
    )
    const passedOptionalRecords = optionalRecords.filter(r => r.verified)
    
    // Domain is ready ONLY if:
    // 1. All required DNS records pass (DKIM)
    // 2. SendGrid domain authentication is validated
    const dnsReady = requiredRecords.length > 0 && passedRequiredRecords.length === requiredRecords.length
    const domainReady = dnsReady && sendgridDomainValid
    const allVerified = verificationResults.every(result => result.verified)
    const newStatus = domainReady ? 'verified' : 'failed'

    // Create detailed verification report including SendGrid status
    const verificationReport = {
      domain: domain.domain,
      timestamp: new Date().toISOString(),
      domainReady,
      sendgridAuthentication: {
        validated: sendgridDomainValid,
        error: sendgridValidationError
      },
      summary: {
        totalRecords: verificationResults.length,
        passedRecords: verificationResults.filter(r => r.verified).length,
        failedRecords: verificationResults.filter(r => !r.verified).length,
        requiredRecords: requiredRecords.length,
        passedRequiredRecords: passedRequiredRecords.length,
        optionalRecords: optionalRecords.length,
        passedOptionalRecords: passedOptionalRecords.length,
        sendgridDomainValid
      },
      records: verificationResults.map(result => ({
        ...result,
        status: result.verified ? 'pass' : (result.error ? 'fail' : 'pending'),
        required: result.record.includes('DKIM')
      })),
      recommendations: generateRecommendations(verificationResults, domainReady, sendgridDomainValid, sendgridValidationError)
    }

    console.log(`📊 Final Verification Report:`)
    console.log(`   Domain Ready: ${domainReady}`)
    console.log(`   DNS Ready: ${dnsReady}`)
    console.log(`   SendGrid Domain Valid: ${sendgridDomainValid}`)
    console.log(`   Required Records Passed: ${passedRequiredRecords.length}/${requiredRecords.length}`)
    console.log(`   Optional Records Passed: ${passedOptionalRecords.length}/${optionalRecords.length}`)
    if (sendgridValidationError) {
      console.log(`   SendGrid Error: ${sendgridValidationError}`)
    }

    // Update domain status
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        status: newStatus,
        last_verification_attempt: new Date().toISOString(),
        verified_at: domainReady ? new Date().toISOString() : null,
        verification_error: domainReady ? null : (sendgridValidationError || 'Required DNS records not found or incorrect')
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
        error_message: domainReady ? null : (sendgridValidationError || 'Required DNS records not found or incorrect'),
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
    // For link tracking records, check the exact hostname from the database
    if (record.purpose?.includes('Link tracking') || record.purpose?.includes('tracking')) {
      console.log(`🔍 Checking exact link tracking record: ${hostname}`)
      
      try {
        const cnameRecords = await withTimeout(resolveCname(hostname), 3000)
        const foundRecord = cnameRecords[0] || null
        
        if (foundRecord && foundRecord.includes('u55053564.wl065.sendgrid.net')) {
          console.log(`✅ Found working link tracking record: ${hostname} → ${foundRecord}`)
          return {
            record: `CNAME (${record.purpose})`,
            expected: record.value,
            found: foundRecord,
            verified: true
          }
        } else {
          console.log(`❌ Link tracking record found but incorrect: ${hostname} → ${foundRecord}`)
          return {
            record: `CNAME (${record.purpose})`,
            expected: record.value,
            found: foundRecord,
            verified: false,
            error: `Link tracking record points to wrong SendGrid account`
          }
        }
      } catch (err) {
        console.log(`❌ Link tracking record not found: ${hostname}`)
        return {
          record: `CNAME (${record.purpose})`,
          expected: record.value,
          found: null,
          verified: false,
          error: `Link tracking record not found: ${hostname}`
        }
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

function generateRecommendations(verificationResults: VerificationResult[], domainReady: boolean, sendgridDomainValid: boolean, sendgridValidationError: string | null): string[] {
  const recommendations: string[] = []
  
  if (domainReady) {
    recommendations.push("✅ Domain is ready for email sending!")
    recommendations.push("All required DNS records (DKIM) are properly configured and SendGrid domain authentication is validated.")
  } else {
    recommendations.push("❌ Domain is not ready for email sending.")
    
    // Check SendGrid domain authentication first
    if (!sendgridDomainValid) {
      if (sendgridValidationError?.includes('No SendGrid domain authentication found')) {
        recommendations.push("🔴 SendGrid Domain Authentication Missing: Domain authentication not created in SendGrid.")
      } else {
        recommendations.push("🔴 SendGrid Domain Authentication Invalid: Domain authentication exists but validation failed.")
        if (sendgridValidationError) {
          recommendations.push(`📋 SendGrid Error: ${sendgridValidationError}`)
        }
      }
      recommendations.push("💡 SendGrid domain authentication must be validated before inbound parse and sender identities can be configured.")
    }
    
    // Then check DNS records
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
      } else if (record.record.includes('Link tracking')) {
        recommendations.push(`🟡 Link Tracking Record Missing: Add CNAME record "${record.record}" pointing to "${record.expected}" (optional).`)
      }
    }
    
    recommendations.push("💡 DNS changes can take up to 48 hours to propagate. Try verifying again later.")
    recommendations.push("💡 Check your domain registrar's DNS management panel to add the missing records.")
  }
  
  return recommendations
}

async function setupSendGridIntegration(domain: any) {
  try {
    console.log(`🚀 Setting up SendGrid integration for ${domain.domain}`)
    console.log(`⚠️ Note: This function only runs when SendGrid domain authentication is already validated`)
    
    // Import SendGrid functions
    const { createSenderIdentity, getDomainAuthentication, createDomainAuthentication, validateDomainAuthentication, configureInboundParse } = await import('@/lib/sendgrid')
    
    // Step 1: FIRST create and validate domain authentication in SendGrid
    console.log(`🔐 Setting up SendGrid domain authentication for ${domain.domain}`)
    let domainAuthId = null
    
    try {
      // Check if domain auth already exists
      const existingAuth = await getDomainAuthentication(domain.domain)
      
      if (existingAuth.domain) {
        console.log(`✅ Domain authentication already exists for ${domain.domain}`)
        domainAuthId = existingAuth.domain.id
        
        // Force validation of existing domain
        try {
          const validationResult = await validateDomainAuthentication(domainAuthId)
          console.log(`🔄 Domain validation result: ${validationResult.valid ? 'VALID' : 'PENDING'}`)
        } catch (validationError) {
          console.log(`⚠️ Domain validation pending: ${validationError.message}`)
        }
      } else {
        // Create new domain authentication
        console.log(`📝 Creating domain authentication for ${domain.domain}`)
        const authResult = await createDomainAuthentication({
          domain: domain.domain,
          subdomain: 'mail'
        })
        
        if (authResult.success) {
          domainAuthId = authResult.id
          console.log(`✅ Domain authentication created for ${domain.domain}`)
          
          // Immediately validate
          try {
            const validationResult = await validateDomainAuthentication(domainAuthId)
            console.log(`🔄 Domain validation result: ${validationResult.valid ? 'VALID' : 'PENDING'}`)
          } catch (validationError) {
            console.log(`⚠️ Domain validation pending: ${validationError.message}`)
          }
        }
      }
    } catch (domainAuthError) {
      console.log(`⚠️ Domain authentication setup failed: ${domainAuthError.message}`)
    }
    
    // Step 2: Configure Inbound Parse (now that domain auth exists)
    try {
      const replyHostname = `reply.${domain.domain}`
      const webhookUrl = 'https://app.leadsup.io/api/webhooks/sendgrid'
      
      console.log(`📧 Configuring Inbound Parse: ${replyHostname} → ${webhookUrl}`)
      
      const parseResult = await configureInboundParse({
        hostname: replyHostname,
        url: webhookUrl,
        spam_check: true,
        send_raw: false
      })
      
      if (parseResult.success) {
        console.log(`✅ Inbound Parse configured successfully for ${replyHostname}`)
        
        // Update domain record
        await supabase
          .from('domains')
          .update({
            inbound_parse_configured: true,
            inbound_parse_hostname: replyHostname,
            inbound_parse_webhook_id: parseResult.webhook_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', domain.id)
      }
    } catch (parseError) {
      console.log(`⚠️ Inbound parse setup failed: ${parseError.message}`)
      if (parseError.message?.includes('duplicate entry')) {
        console.log(`✅ Inbound parse already configured for ${domain.domain}`)
        await supabase
          .from('domains')
          .update({
            inbound_parse_configured: true,
            inbound_parse_hostname: `reply.${domain.domain}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', domain.id)
      }
    }
    
    // Step 3: NOW create sender identities (after domain auth is set up)
    const { data: senderAccounts, error: fetchError } = await supabase
      .from('sender_accounts')
      .select('*')
      .eq('domain_id', domain.id)
    
    if (fetchError) {
      console.error('Error fetching sender accounts:', fetchError)
      return
    }
    
    if (!senderAccounts || senderAccounts.length === 0) {
      console.log(`ℹ️ No sender accounts to process for ${domain.domain}`)
      return
    }
    
    console.log(`📧 Creating SendGrid identities for ${senderAccounts.length} sender accounts`)
    
    // Create sender identities AFTER domain auth (they should auto-verify)
    for (const sender of senderAccounts) {
      try {
        console.log(`  Creating identity for ${sender.email}...`)
        
        const result = await createSenderIdentity({
          nickname: `${sender.display_name || sender.email.split('@')[0]} - ${domain.domain}`,
          from: {
            email: sender.email,
            name: sender.display_name || sender.email.split('@')[0]
          },
          reply_to: {
            email: sender.email,
            name: sender.display_name || sender.email.split('@')[0]
          },
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US'
        })
        
        // Use actual SendGrid verification status (should be auto-verified)
        const verificationStatus = result.verification_status || 'pending'
        
        await supabase
          .from('sender_accounts')
          .update({
            sendgrid_sender_id: result.sender_id,
            sendgrid_status: verificationStatus,
            sendgrid_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sender.id)
        
        console.log(`  ✅ Identity created for ${sender.email} - Status: ${verificationStatus}`)
        
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`  ✅ Identity already exists for ${sender.email}`)
          
          await supabase
            .from('sender_accounts')
            .update({
              sendgrid_status: 'verified',
              updated_at: new Date().toISOString()
            })
            .eq('id', sender.id)
        } else {
          console.error(`  ❌ Failed to create identity for ${sender.email}:`, error.message)
        }
      }
    }
    
    console.log(`✅ SendGrid integration complete for ${domain.domain}`)
    
  } catch (error) {
    console.error('SendGrid setup failed:', error)
  }
}

async function forceSendGridDomainAuthentication(domainName: string, getDomainAuthentication: any, createDomainAuthentication: any, validateDomainAuthentication: any) {
  try {
    console.log(`🔐 Forcing SendGrid domain authentication for ${domainName}`)
    
    // Step 1: Check if domain authentication already exists
    const existingAuth = await getDomainAuthentication(domainName)
    
    if (existingAuth.domain) {
      console.log(`✅ Domain authentication already exists for ${domainName} (ID: ${existingAuth.domain.id})`)
      
      // Force validation of existing domain authentication
      try {
        console.log(`🔄 Forcing validation of existing domain authentication...`)
        const validationResult = await validateDomainAuthentication(existingAuth.domain.id)
        
        if (validationResult.valid) {
          console.log(`✅ Domain authentication is VALID for ${domainName}`)
        } else {
          console.log(`⚠️ Domain authentication validation failed for ${domainName}:`, validationResult.validation_results)
          // Continue anyway - DNS might still be propagating
        }
      } catch (validationError) {
        console.error(`❌ Failed to validate domain authentication for ${domainName}:`, validationError.message)
        // Continue anyway - the domain authentication exists
      }
      
      return existingAuth.domain
    }
    
    // Step 2: Create new domain authentication if it doesn't exist
    console.log(`📝 Creating new domain authentication for ${domainName}`)
    
    const newAuth = await createDomainAuthentication({
      domain: domainName,
      subdomain: 'mail' // Use 'mail' subdomain for better deliverability
    })
    
    if (newAuth.success) {
      console.log(`✅ Created domain authentication for ${domainName} (ID: ${newAuth.domain_id})`)
      
      // Step 3: Immediately try to validate the new domain authentication
      try {
        console.log(`🔄 Attempting immediate validation of new domain authentication...`)
        const validationResult = await validateDomainAuthentication(newAuth.domain_id)
        
        if (validationResult.valid) {
          console.log(`✅ New domain authentication is VALID for ${domainName}`)
        } else {
          console.log(`⚠️ New domain authentication validation pending for ${domainName} - DNS may still be propagating`)
        }
      } catch (validationError) {
        console.log(`⚠️ Validation pending for ${domainName} - DNS records may still be propagating`)
      }
      
      return newAuth
    } else {
      throw new Error('Failed to create domain authentication')
    }
    
  } catch (error: any) {
    console.error(`❌ Failed to force domain authentication for ${domainName}:`, error.message)
    // Don't throw - continue with sender identity creation even if domain auth fails
    return null
  }
}

async function setupInboundParseConfiguration(domain: any, configureInboundParse: any) {
  try {
    console.log(`📧 Setting up Inbound Parse for ${domain.domain}`)
    
    // Construct the reply hostname for inbound parse
    const replyHostname = `reply.${domain.domain}`
    const webhookUrl = 'https://app.leadsup.io/api/webhooks/sendgrid'
    
    console.log(`🔧 Configuring Inbound Parse:`)
    console.log(`   Hostname: ${replyHostname}`)
    console.log(`   Webhook URL: ${webhookUrl}`)
    
    // Configure SendGrid Inbound Parse
    const parseResult = await configureInboundParse({
      hostname: replyHostname,
      url: webhookUrl,
      spam_check: true,
      send_raw: false
    })
    
    if (parseResult.success) {
      console.log(`✅ Inbound Parse configured successfully for ${replyHostname}`)
      
      // Update domain record to indicate Inbound Parse is configured
      await supabase
        .from('domains')
        .update({
          inbound_parse_configured: true,
          inbound_parse_hostname: replyHostname,
          inbound_parse_webhook_id: parseResult.webhook_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', domain.id)
      
      console.log(`✅ Domain record updated with Inbound Parse configuration`)
    } else {
      throw new Error('Inbound Parse configuration failed')
    }
    
  } catch (error: any) {
    console.error(`❌ Failed to setup Inbound Parse for ${domain.domain}:`, error.message)
    
    // Handle duplicate entry as success (already configured)
    if (error.message?.includes('duplicate entry')) {
      console.log(`✅ Inbound Parse already configured for reply.${domain.domain}`)
      
      // Still update domain record to indicate it's configured
      await supabase
        .from('domains')
        .update({
          inbound_parse_configured: true,
          inbound_parse_hostname: `reply.${domain.domain}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', domain.id)
    } else {
      // Log error but don't fail domain verification
      console.error(`⚠️ Inbound Parse setup failed for ${domain.domain}, but domain verification continues`)
      
      // Update domain record to indicate Inbound Parse failed
      await supabase
        .from('domains')
        .update({
          inbound_parse_configured: false,
          inbound_parse_error: error.message.substring(0, 500),
          updated_at: new Date().toISOString()
        })
        .eq('id', domain.id)
    }
  }
}