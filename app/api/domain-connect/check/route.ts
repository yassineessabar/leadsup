import { NextRequest, NextResponse } from 'next/server'
import DomainConnectService from '@/lib/domain-connect'

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json()

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    const domainConnect = new DomainConnectService()
    const result = await domainConnect.checkDomainConnectSupport(domain)

    if (result.supported && result.provider) {
      // Generate setup URL for supported registrar
      const setupUrl = domainConnect.generateSetupUrl(domain, result.provider)
      
      return NextResponse.json({
        supported: true,
        provider: result.provider.name,
        setupUrl,
        method: 'domain-connect'
      })
    }

    // Check for direct API support
    const directApiSupport = await checkDirectApiSupport(domain)
    if (directApiSupport.supported) {
      return NextResponse.json({
        supported: true,
        provider: directApiSupport.provider,
        method: 'direct-api',
        requiresAuth: true
      })
    }

    // Fallback to manual setup
    return NextResponse.json({
      supported: false,
      method: 'manual',
      message: 'Manual DNS setup required'
    })

  } catch (error) {
    console.error('Domain Connect check failed:', error)
    return NextResponse.json(
      { error: 'Failed to check Domain Connect support' },
      { status: 500 }
    )
  }
}

async function checkDirectApiSupport(domain: string) {
  try {
    const dns = await import('dns')
    const util = await import('util')
    const resolve = util.promisify(dns.resolve)
    
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