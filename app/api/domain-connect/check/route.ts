import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns'
import { promisify } from 'util'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter is required' },
        { status: 400 }
      )
    }

    return await checkDomainConnect(domain)
  } catch (error) {
    // console.error('Domain Connect GET check failed:', error)
    return NextResponse.json(
      { error: 'Failed to check Domain Connect support' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json()

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    return await checkDomainConnect(domain)
  } catch (error) {
    // console.error('Domain Connect POST check failed:', error)
    return NextResponse.json(
      { error: 'Failed to check Domain Connect support' },
      { status: 500 }
    )
  }
}

async function checkDomainConnect(domain: string) {
  try {
    // TEMPORARILY DISABLED: Auto domain detection commented out until full testing is complete
    // All domains will use manual setup process for now
    // TODO: Re-enable automatic domain connect after testing with real API credentials
    
    /* 
    // Check for direct API support
    const directApiSupport = await checkDirectApiSupport(domain)
    if (directApiSupport.supported) {
      return NextResponse.json({
        success: true,
        supported: true,
        provider: directApiSupport.provider,
        providerName: directApiSupport.provider,
        method: 'direct-api',
        requiresAuth: true
      })
    }
    */

    // Always fallback to manual setup until auto-detection is fully tested
    return NextResponse.json({
      success: true,
      supported: false,
      method: 'manual',
      message: 'Manual DNS setup required'
    })

  } catch (error) {
    // console.error('Domain Connect check failed:', error)
    return NextResponse.json({
      success: true,
      supported: false,
      method: 'manual',
      message: 'Manual DNS setup required (API error)'
    })
  }
}

async function checkDirectApiSupport(domain: string) {
  try {
    const resolve = promisify(dns.resolve)
    
    const nameservers = await resolve(domain, 'NS')
    const nsString = nameservers.join(' ').toLowerCase()

    // Check for providers with direct API support
    if (nsString.includes('cloudflare')) {
      return {
        supported: true,
        provider: 'Cloudflare',
        apiType: 'cloudflare'
      }
    }

    if (nsString.includes('awsdns')) {
      return {
        supported: true,
        provider: 'AWS Route53',
        apiType: 'route53'
      }
    }

    return { supported: false }

  } catch (error) {
    return { supported: false }
  }
}