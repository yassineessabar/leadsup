/**
 * Domain Connect API Integration
 * Provides one-click DNS setup for major registrars
 */

interface DomainConnectTemplate {
  providerId: string
  serviceId: string
  version: number
  syncPubKeyDomain: string
  records: DomainConnectRecord[]
}

interface DomainConnectRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT'
  host: string
  pointsTo?: string
  data?: string
  priority?: number
  ttl?: number
}

interface DomainConnectProvider {
  name: string
  providerName: string
  urlAPI: string
  width?: number
  height?: number
}

export class DomainConnectService {
  private static readonly LEADSUP_PROVIDER_ID = 'leadsup.io'
  private static readonly SERVICE_ID = 'email-setup'
  
  /**
   * Check if domain supports Domain Connect
   */
  async checkDomainConnectSupport(domain: string): Promise<{
    supported: boolean
    provider?: DomainConnectProvider
    setupUrl?: string
  }> {
    try {
      // Step 1: Check for Domain Connect discovery
      const discoveryUrl = `https://_domainconnect.${domain}/v2/${DomainConnectService.LEADSUP_PROVIDER_ID}/${DomainConnectService.SERVICE_ID}`
      
      try {
        const response = await fetch(discoveryUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(5000)
        })

        if (response.ok) {
          const data = await response.json()
          return {
            supported: true,
            provider: data.provider,
            setupUrl: data.urlAPI
          }
        }
      } catch (fetchError) {
        // Domain Connect discovery failed, continue to fallback
        console.log(`Domain Connect discovery failed for ${domain}:`, fetchError.message)
      }

      // Step 2: Fallback - check common registrar patterns
      return await this.checkRegistrarSupport(domain)

    } catch (error) {
      console.log('Domain Connect check failed:', error.message)
      return { supported: false }
    }
  }

  /**
   * Generate Domain Connect setup URL
   */
  generateSetupUrl(domain: string, provider: DomainConnectProvider): string {
    const params = new URLSearchParams({
      domain,
      providerId: DomainConnectService.LEADSUP_PROVIDER_ID,
      serviceId: DomainConnectService.SERVICE_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/domain-connect/callback`,
      state: this.generateState(domain)
    })

    return `${provider.urlAPI}/v2/domainTemplates/providers/${DomainConnectService.LEADSUP_PROVIDER_ID}/services/${DomainConnectService.SERVICE_ID}/apply?${params}`
  }

  /**
   * Check if registrar supports Domain Connect (fallback detection)
   */
  private async checkRegistrarSupport(domain: string): Promise<{
    supported: boolean
    provider?: DomainConnectProvider
    setupUrl?: string
  }> {
    try {
      // Get nameservers to detect registrar
      const nameservers = await this.getNameservers(domain)
      const registrar = this.detectRegistrar(nameservers)

      const supportedRegistrars: Record<string, DomainConnectProvider> = {
        godaddy: {
          name: 'GoDaddy',
          providerName: 'GoDaddy',
          urlAPI: 'https://domainconnect.godaddy.com',
          width: 750,
          height: 750
        },
        // Note: Namecheap does NOT support Domain Connect - removed from supported list
        google: {
          name: 'Google Domains',
          providerName: 'Google',
          urlAPI: 'https://domainconnect.domains.google',
          width: 800,
          height: 600
        },
        ionos: {
          name: '1&1 IONOS',
          providerName: '1&1 IONOS',
          urlAPI: 'https://domainconnect.1and1.com',
          width: 700,
          height: 650
        }
      }

      if (registrar && supportedRegistrars[registrar]) {
        return {
          supported: true,
          provider: supportedRegistrars[registrar],
          setupUrl: supportedRegistrars[registrar].urlAPI
        }
      }

      return { supported: false }

    } catch (error) {
      return { supported: false }
    }
  }

  /**
   * Get nameservers for domain
   */
  private async getNameservers(domain: string): Promise<string[]> {
    try {
      const dns = await import('dns')
      const util = await import('util')
      const resolve = util.promisify(dns.resolve)
      
      const records = await resolve(domain, 'NS')
      return records.map(ns => ns.toLowerCase())
    } catch (error) {
      return []
    }
  }

  /**
   * Detect registrar from nameservers
   */
  private detectRegistrar(nameservers: string[]): string | null {
    const patterns = {
      godaddy: ['domaincontrol.com', 'godaddy.com'],
      namecheap: ['registrar-servers.com', 'namecheap.com'],
      google: ['googledomains.com', 'google.com'],
      ionos: ['1and1.com', 'ionos.com', 'ui-dns.com'],
      cloudflare: ['cloudflare.com'],
      route53: ['awsdns']
    }

    for (const [registrar, patterns_list] of Object.entries(patterns)) {
      if (nameservers.some(ns => patterns_list.some(pattern => ns.includes(pattern)))) {
        return registrar
      }
    }

    return null
  }

  /**
   * Generate secure state parameter
   */
  private generateState(domain: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2)
    return Buffer.from(`${domain}:${timestamp}:${random}`).toString('base64')
  }

  /**
   * Validate state parameter
   */
  validateState(state: string, expectedDomain: string): boolean {
    try {
      const decoded = Buffer.from(state, 'base64').toString()
      const [domain, timestamp] = decoded.split(':')
      
      // Check domain matches
      if (domain !== expectedDomain) return false
      
      // Check timestamp is within last hour
      const now = Date.now()
      const stateTime = parseInt(timestamp)
      const oneHour = 60 * 60 * 1000
      
      return (now - stateTime) < oneHour
    } catch {
      return false
    }
  }

  /**
   * Create Domain Connect template for LeadsUp
   */
  static getLeadsUpTemplate(): DomainConnectTemplate {
    return {
      providerId: DomainConnectService.LEADSUP_PROVIDER_ID,
      serviceId: DomainConnectService.SERVICE_ID,
      version: 1,
      syncPubKeyDomain: 'leadsup.io',
      records: [
        // SPF Record for sending authorization
        {
          type: 'TXT',
          host: '@',
          data: 'v=spf1 include:sendgrid.net ~all',
          ttl: 3600
        },
        // DKIM Record for signing
        {
          type: 'CNAME',
          host: 's1._domainkey',
          pointsTo: 's1.domainkey.u30435661.wl250.sendgrid.net',
          ttl: 3600
        },
        // MX Record for reply handling
        {
          type: 'MX',
          host: 'reply',
          pointsTo: 'mx.sendgrid.net',
          priority: 10,
          ttl: 3600
        },
        // Verification TXT record
        {
          type: 'TXT',
          host: '_leadsup-verify',
          data: '%verification_token%', // Will be replaced with actual token
          ttl: 300
        }
      ]
    }
  }
}

export default DomainConnectService