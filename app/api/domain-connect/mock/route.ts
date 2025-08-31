import { NextRequest, NextResponse } from 'next/server'

/**
 * Mock Domain Connect API for testing without real domains
 * Simulates responses from various registrars
 */

// Mock domain database with different registrar configurations
const MOCK_DOMAINS = {
  'test-godaddy.mock': {
    registrar: 'GoDaddy',
    nameservers: ['ns1.domaincontrol.com', 'ns2.domaincontrol.com'],
    supportsDomainConnect: true,
    apiEnabled: true,
    currentRecords: [],
    owner: 'test@example.com'
  },
  'test-cloudflare.mock': {
    registrar: 'Cloudflare',
    nameservers: ['alice.ns.cloudflare.com', 'bob.ns.cloudflare.com'],
    supportsDomainConnect: false,
    apiEnabled: true,
    apiType: 'direct',
    zoneId: 'mock-zone-123',
    currentRecords: [],
    owner: 'test@example.com'
  },
  'test-route53.mock': {
    registrar: 'AWS Route53',
    nameservers: ['ns-123.awsdns-45.com', 'ns-678.awsdns-90.org'],
    supportsDomainConnect: false,
    apiEnabled: true,
    apiType: 'direct',
    hostedZoneId: 'Z123MOCK456',
    currentRecords: [],
    owner: 'test@example.com'
  },
  'test-namecheap.mock': {
    registrar: 'Namecheap',
    nameservers: ['dns1.registrar-servers.com', 'dns2.registrar-servers.com'],
    supportsDomainConnect: false,
    apiEnabled: false,
    currentRecords: [],
    owner: 'test@example.com'
  },
  'test-google.mock': {
    registrar: 'Google Domains',
    nameservers: ['ns-cloud-a1.googledomains.com', 'ns-cloud-a2.googledomains.com'],
    supportsDomainConnect: true,
    apiEnabled: true,
    currentRecords: [],
    owner: 'test@example.com'
  }
}

// Simulated DNS records that would be applied
const REQUIRED_RECORDS = [
  {
    type: 'TXT',
    host: '@',
    value: 'v=spf1 include:sendgrid.net ~all',
    ttl: 3600,
    purpose: 'SPF - Email authorization'
  },
  {
    type: 'CNAME',
    host: 's1._domainkey',
    value: 's1.domainkey.u30435661.wl250.sendgrid.net',
    ttl: 3600,
    purpose: 'DKIM - Email signing'
  },
  {
    type: 'CNAME',
    host: 's2._domainkey',
    value: 's2.domainkey.u30435661.wl250.sendgrid.net',
    ttl: 3600,
    purpose: 'DKIM - Email signing backup'
  },
  {
    type: 'MX',
    host: 'reply',
    value: 'mx.sendgrid.net',
    priority: 10,
    ttl: 3600,
    purpose: 'Reply email routing'
  },
  {
    type: 'TXT',
    host: '_dmarc',
    value: 'v=DMARC1; p=none; rua=mailto:dmarc@leadsup.io',
    ttl: 3600,
    purpose: 'DMARC - Email authentication policy'
  }
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const domain = searchParams.get('domain')

  switch (action) {
    case 'list':
      // List all available mock domains
      return NextResponse.json({
        success: true,
        message: 'Mock domains available for testing',
        domains: Object.keys(MOCK_DOMAINS).map(domain => ({
          domain,
          ...MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS]
        }))
      })

    case 'check':
      // Check if domain supports auto-connect
      if (!domain || !MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS]) {
        return NextResponse.json({
          success: false,
          error: 'Domain not found in mock database'
        }, { status: 404 })
      }

      const domainInfo = MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS]
      return NextResponse.json({
        success: true,
        domain,
        registrar: domainInfo.registrar,
        supportsDomainConnect: domainInfo.supportsDomainConnect,
        apiEnabled: domainInfo.apiEnabled,
        nameservers: domainInfo.nameservers,
        method: domainInfo.apiEnabled ? 'automatic' : 'manual',
        requiresAuth: domainInfo.apiEnabled,
        mockMode: true
      })

    case 'records':
      // Get current DNS records
      if (!domain || !MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS]) {
        return NextResponse.json({
          success: false,
          error: 'Domain not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        domain,
        currentRecords: MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS].currentRecords,
        requiredRecords: REQUIRED_RECORDS,
        mockMode: true
      })

    default:
      return NextResponse.json({
        success: true,
        message: 'Mock Domain Connect API',
        availableActions: ['list', 'check', 'records', 'apply', 'verify'],
        mockMode: true
      })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, domain, records, credentials } = body

  switch (action) {
    case 'apply':
      // Simulate applying DNS records
      if (!domain || !MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS]) {
        return NextResponse.json({
          success: false,
          error: 'Domain not found'
        }, { status: 404 })
      }

      const domainData = MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS]
      
      // Check if API is enabled for this registrar
      if (!domainData.apiEnabled) {
        return NextResponse.json({
          success: false,
          error: 'This registrar requires manual DNS configuration',
          registrar: domainData.registrar,
          method: 'manual'
        }, { status: 400 })
      }

      // Simulate API authentication check
      if (!credentials || !credentials.apiKey) {
        return NextResponse.json({
          success: false,
          error: 'API credentials required',
          registrar: domainData.registrar,
          credentialsNeeded: getRequiredCredentials(domainData.registrar)
        }, { status: 401 })
      }

      // Simulate applying records
      const appliedRecords = records || REQUIRED_RECORDS
      domainData.currentRecords = appliedRecords

      // Simulate different response times based on registrar
      const delay = getRegistrarDelay(domainData.registrar)
      await new Promise(resolve => setTimeout(resolve, delay))

      return NextResponse.json({
        success: true,
        message: `DNS records applied successfully (mock)`,
        domain,
        registrar: domainData.registrar,
        appliedRecords: appliedRecords.length,
        propagationTime: '5-30 minutes (simulated)',
        mockMode: true,
        simulatedDelay: `${delay}ms`
      })

    case 'verify':
      // Simulate DNS record verification
      if (!domain || !MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS]) {
        return NextResponse.json({
          success: false,
          error: 'Domain not found'
        }, { status: 404 })
      }

      const verifyDomain = MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS]
      const hasRecords = verifyDomain.currentRecords.length > 0

      return NextResponse.json({
        success: true,
        domain,
        verified: hasRecords,
        recordsFound: verifyDomain.currentRecords.length,
        recordsRequired: REQUIRED_RECORDS.length,
        status: hasRecords ? 'configured' : 'pending',
        message: hasRecords 
          ? 'All DNS records are properly configured (mock)'
          : 'DNS records not yet applied',
        mockMode: true
      })

    case 'authenticate':
      // Simulate OAuth/API authentication flow
      if (!domain || !MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS]) {
        return NextResponse.json({
          success: false,
          error: 'Domain not found'
        }, { status: 404 })
      }

      const authDomain = MOCK_DOMAINS[domain as keyof typeof MOCK_DOMAINS]
      
      if (!authDomain.apiEnabled) {
        return NextResponse.json({
          success: false,
          error: 'This registrar does not support API access',
          registrar: authDomain.registrar
        }, { status: 400 })
      }

      // Simulate OAuth URL generation for supported providers
      if (authDomain.supportsDomainConnect) {
        const mockAuthUrl = `https://mock-auth.${authDomain.registrar.toLowerCase().replace(' ', '-')}.com/oauth/authorize?` +
          `client_id=mock_client_id&` +
          `redirect_uri=${encodeURIComponent('http://localhost:3000/api/domain-connect/callback')}&` +
          `domain=${domain}&` +
          `state=${Buffer.from(JSON.stringify({ domain, timestamp: Date.now() })).toString('base64')}`

        return NextResponse.json({
          success: true,
          authUrl: mockAuthUrl,
          method: 'oauth',
          registrar: authDomain.registrar,
          mockMode: true
        })
      } else {
        // Direct API key authentication
        return NextResponse.json({
          success: true,
          method: 'api_key',
          registrar: authDomain.registrar,
          requiredCredentials: getRequiredCredentials(authDomain.registrar),
          mockMode: true
        })
      }

    case 'simulate-callback':
      // Simulate OAuth callback
      const { code, state } = body
      
      if (!code || !state) {
        return NextResponse.json({
          success: false,
          error: 'Missing authorization code or state'
        }, { status: 400 })
      }

      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        
        return NextResponse.json({
          success: true,
          message: 'Authorization successful (mock)',
          domain: stateData.domain,
          accessToken: 'mock_access_token_' + Date.now(),
          refreshToken: 'mock_refresh_token_' + Date.now(),
          expiresIn: 3600,
          mockMode: true
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Invalid state parameter'
        }, { status: 400 })
      }

    default:
      return NextResponse.json({
        success: false,
        error: 'Invalid action',
        validActions: ['apply', 'verify', 'authenticate', 'simulate-callback']
      }, { status: 400 })
  }
}

// Helper function to get required credentials for each registrar
function getRequiredCredentials(registrar: string) {
  const credentials: Record<string, any> = {
    'GoDaddy': {
      apiKey: 'GoDaddy API Key',
      apiSecret: 'GoDaddy API Secret',
      helpUrl: 'https://developer.godaddy.com/keys'
    },
    'Cloudflare': {
      apiToken: 'Cloudflare API Token',
      helpUrl: 'https://dash.cloudflare.com/profile/api-tokens'
    },
    'AWS Route53': {
      accessKeyId: 'AWS Access Key ID',
      secretAccessKey: 'AWS Secret Access Key',
      helpUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials'
    },
    'Google Domains': {
      method: 'OAuth 2.0',
      clientId: 'Google Client ID',
      clientSecret: 'Google Client Secret',
      helpUrl: 'https://console.cloud.google.com/apis/credentials'
    },
    'Namecheap': {
      message: 'Namecheap requires manual DNS configuration',
      apiNotSupported: true
    }
  }

  return credentials[registrar] || { message: 'Unknown registrar' }
}

// Simulate different response times for different registrars
function getRegistrarDelay(registrar: string): number {
  const delays: Record<string, number> = {
    'Cloudflare': 200,  // Fastest
    'AWS Route53': 500,
    'GoDaddy': 800,
    'Google Domains': 1000,
    'Namecheap': 0  // No API, instant rejection
  }
  
  return delays[registrar] || 500
}