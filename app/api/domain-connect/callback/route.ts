import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import DomainConnectService from '@/lib/domain-connect'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    const state = searchParams.get('state')
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (!domain || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?tab=domain&error=invalid_request`
      )
    }

    // Validate state parameter
    const domainConnect = new DomainConnectService()
    if (!domainConnect.validateState(state, domain)) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?tab=domain&error=invalid_state`
      )
    }

    if (error) {
      // Domain Connect setup failed
      await logDomainConnectResult(domain, false, error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?tab=domain&error=setup_failed&domain=${domain}`
      )
    }

    if (success === 'true') {
      // Domain Connect setup succeeded
      await processDomainConnectSuccess(domain)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?tab=domain&success=domain_connected&domain=${domain}`
      )
    }

    // Unknown state
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?tab=domain&error=unknown_state`
    )

  } catch (error) {
    console.error('Domain Connect callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?tab=domain&error=callback_error`
    )
  }
}

async function processDomainConnectSuccess(domain: string) {
  try {
    // Find the domain in our database
    const { data: domainRecord, error: findError } = await supabaseServer
      .from('domains')
      .select('*')
      .eq('domain', domain)
      .single()

    if (findError || !domainRecord) {
      console.error('Domain not found in database:', domain)
      return
    }

    // Wait a bit for DNS propagation
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Verify the DNS records were actually set up
    const verificationResult = await verifyDomainConnectSetup(domain)

    if (verificationResult.success) {
      // Update domain status to verified
      await supabaseServer
        .from('domains')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString()
        })
        .eq('domain', domain)

      // Log successful verification
      await supabaseServer
        .from('domain_verification_logs')
        .insert({
          domain_id: domainRecord.id,
          verification_type: 'domain-connect',
          status: 'success',
          dns_records_checked: verificationResult.records
        })

      // Set up SendGrid integration
      await setupSendGridIntegration(domainRecord)

    } else {
      // Mark as failed if verification didn't work
      await supabaseServer
        .from('domains')
        .update({
          status: 'failed',
          last_checked_at: new Date().toISOString()
        })
        .eq('domain', domain)

      await supabaseServer
        .from('domain_verification_logs')
        .insert({
          domain_id: domainRecord.id,
          verification_type: 'domain-connect',
          status: 'failed',
          error_message: 'DNS verification failed after Domain Connect setup',
          dns_records_checked: verificationResult.records
        })
    }

  } catch (error) {
    console.error('Error processing Domain Connect success:', error)
  }
}

async function verifyDomainConnectSetup(domain: string) {
  try {
    const dns = await import('dns')
    const util = await import('util')
    const resolveTxt = util.promisify(dns.resolveTxt)
    const resolveMx = util.promisify(dns.resolveMx)
    const resolveCname = util.promisify(dns.resolveCname)

    const results: any[] = []

    // Check SPF record
    try {
      const txtRecords = await resolveTxt(domain)
      const spfRecord = txtRecords.flat().find(record => record.startsWith('v=spf1'))
      results.push({
        type: 'SPF',
        found: !!spfRecord && spfRecord.includes('sendgrid.net'),
        value: spfRecord
      })
    } catch {
      results.push({ type: 'SPF', found: false, value: null })
    }

    // Check DKIM record
    try {
      const dkimRecords = await resolveCname(`s1._domainkey.${domain}`)
      const dkimFound = dkimRecords.some(record => record.includes('sendgrid.net'))
      results.push({
        type: 'DKIM',
        found: dkimFound,
        value: dkimRecords[0]
      })
    } catch {
      results.push({ type: 'DKIM', found: false, value: null })
    }

    // Check MX record for reply subdomain
    try {
      const mxRecords = await resolveMx(`reply.${domain}`)
      const mxFound = mxRecords.some(record => record.exchange === 'mx.sendgrid.net')
      results.push({
        type: 'MX',
        found: mxFound,
        value: mxRecords[0]?.exchange
      })
    } catch {
      results.push({ type: 'MX', found: false, value: null })
    }

    // Check verification record
    try {
      const verifyRecords = await resolveTxt(`_leadsup-verify.${domain}`)
      const verifyFound = verifyRecords.flat().length > 0
      results.push({
        type: 'VERIFY',
        found: verifyFound,
        value: verifyRecords.flat()[0]
      })
    } catch {
      results.push({ type: 'VERIFY', found: false, value: null })
    }

    const allFound = results.every(r => r.found)
    
    return {
      success: allFound,
      records: results
    }

  } catch (error) {
    console.error('DNS verification error:', error)
    return {
      success: false,
      records: []
    }
  }
}

async function logDomainConnectResult(domain: string, success: boolean, error?: string) {
  try {
    const { data: domainRecord } = await supabaseServer
      .from('domains')
      .select('id')
      .eq('domain', domain)
      .single()

    if (domainRecord) {
      await supabaseServer
        .from('domain_verification_logs')
        .insert({
          domain_id: domainRecord.id,
          verification_type: 'domain-connect',
          status: success ? 'success' : 'failed',
          error_message: error
        })
    }
  } catch (err) {
    console.error('Error logging Domain Connect result:', err)
  }
}

async function setupSendGridIntegration(domain: any) {
  try {
    console.log(`Setting up SendGrid integration for ${domain.domain}`)
    
    // TODO: Implement actual SendGrid API calls
    // 1. Authenticate domain for outbound
    // 2. Set up inbound parse for reply subdomain
    // 3. Configure DKIM keys
    
    // Example calls:
    // await sendgrid.authenticateDomain(domain.domain)
    // await sendgrid.createInboundParse(`reply.${domain.domain}`)
    
  } catch (error) {
    console.error('SendGrid integration failed:', error)
  }
}