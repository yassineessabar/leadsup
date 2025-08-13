import { NextRequest, NextResponse } from 'next/server'
import { getDomainAuthentication } from "@/lib/sendgrid"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain') || 'leadsupbase.co'
    
    console.log(`🔍 Debug: Fetching SendGrid domains for: ${domain}`)
    
    // Get all SendGrid authenticated domains
    const result = await getDomainAuthentication()
    
    console.log(`🔍 Debug: Found ${result.domains?.length || 0} SendGrid domains`)
    
    // Find matching domain
    const matchingDomain = result.domains?.find((d: any) => 
      d.domain === domain || d.domain.includes(domain)
    )
    
    return NextResponse.json({
      success: true,
      searchDomain: domain,
      totalDomains: result.domains?.length || 0,
      allDomains: result.domains?.map((d: any) => ({
        id: d.id,
        domain: d.domain,
        valid: d.valid,
        subdomain: d.subdomain
      })) || [],
      matchingDomain: matchingDomain ? {
        id: matchingDomain.id,
        domain: matchingDomain.domain,
        valid: matchingDomain.valid,
        subdomain: matchingDomain.subdomain,
        dns: matchingDomain.dns
      } : null,
      debug: {
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Error debugging SendGrid domains:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    )
  }
}