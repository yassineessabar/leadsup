/**
 * Make.com Integration for DNS Providers
 * Handles automated DNS setup for providers without Domain Connect
 */

interface MakeScenario {
  scenarioId: string
  provider: string
  webhookUrl: string
  authRequired: boolean
}

interface DNSSetupRequest {
  domain: string
  provider: string
  records: DNSRecord[]
  credentials?: {
    apiKey?: string
    apiSecret?: string
    authToken?: string
  }
}

interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT'
  name: string
  value: string
  priority?: number
  ttl?: number
}

export class MakeIntegration {
  private static readonly MAKE_WEBHOOK_BASE = process.env.MAKE_WEBHOOK_URL || 'https://hook.make.com'
  
  // Make.com scenarios for different DNS providers
  private static readonly SCENARIOS: Record<string, MakeScenario> = {
    namecheap: {
      scenarioId: 'namecheap-dns-setup',
      provider: 'Namecheap',
      webhookUrl: `${MakeIntegration.MAKE_WEBHOOK_BASE}/your-namecheap-scenario-id`,
      authRequired: true
    },
    godaddy: {
      scenarioId: 'godaddy-dns-setup', 
      provider: 'GoDaddy',
      webhookUrl: `${MakeIntegration.MAKE_WEBHOOK_BASE}/your-godaddy-scenario-id`,
      authRequired: true
    },
    cloudflare: {
      scenarioId: 'cloudflare-dns-setup',
      provider: 'Cloudflare',
      webhookUrl: `${MakeIntegration.MAKE_WEBHOOK_BASE}/your-cloudflare-scenario-id`,
      authRequired: true
    },
    route53: {
      scenarioId: 'route53-dns-setup',
      provider: 'AWS Route53',
      webhookUrl: `${MakeIntegration.MAKE_WEBHOOK_BASE}/your-route53-scenario-id`,
      authRequired: true
    }
  }

  /**
   * Check if Make.com integration is available for provider
   */
  static isProviderSupported(provider: string): boolean {
    return provider.toLowerCase() in MakeIntegration.SCENARIOS
  }

  /**
   * Get supported providers
   */
  static getSupportedProviders(): string[] {
    return Object.keys(MakeIntegration.SCENARIOS)
  }

  /**
   * Set up DNS records via Make.com
   */
  static async setupDNSRecords(request: DNSSetupRequest): Promise<{
    success: boolean
    message: string
    executionId?: string
    error?: string
  }> {
    try {
      const scenario = MakeIntegration.SCENARIOS[request.provider.toLowerCase()]
      
      if (!scenario) {
        return {
          success: false,
          message: `Provider ${request.provider} not supported via Make.com`,
          error: 'PROVIDER_NOT_SUPPORTED'
        }
      }

      // Prepare payload for Make.com webhook
      const payload = {
        domain: request.domain,
        provider: request.provider,
        records: request.records,
        credentials: request.credentials,
        timestamp: new Date().toISOString(),
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/make/callback`
      }

      // Send request to Make.com scenario
      const response = await fetch(scenario.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MAKE_API_KEY}`,
          'X-LeadsUp-Domain': request.domain
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          message: 'Failed to trigger Make.com scenario',
          error: errorText
        }
      }

      const result = await response.json()

      return {
        success: true,
        message: `DNS setup initiated via Make.com for ${request.provider}`,
        executionId: result.executionId || result.id
      }

    } catch (error) {
      console.error('Make.com integration error:', error)
      return {
        success: false,
        message: 'Make.com integration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate authentication URL for DNS provider
   */
  static generateAuthUrl(provider: string, domain: string): string {
    const state = Buffer.from(`${domain}:${Date.now()}`).toString('base64')
    
    switch (provider.toLowerCase()) {
      case 'namecheap':
        return `https://ap.www.namecheap.com/settings/tools/apiaccess?state=${state}`
      
      case 'godaddy':
        return `https://developer.godaddy.com/keys?state=${state}`
      
      case 'cloudflare':
        return `https://dash.cloudflare.com/profile/api-tokens?state=${state}`
      
      case 'route53':
        return `https://console.aws.amazon.com/iam/home#/users?state=${state}`
      
      default:
        return '#'
    }
  }

  /**
   * Get setup instructions for manual API setup
   */
  static getSetupInstructions(provider: string): {
    title: string
    steps: string[]
    docsUrl: string
  } {
    const instructions = {
      namecheap: {
        title: 'Namecheap API Setup',
        steps: [
          'Go to Namecheap Dashboard → Profile → Tools → API Access',
          'Enable API access and whitelist your IP address',
          'Generate API key and note your username',
          'Return here and enter your credentials'
        ],
        docsUrl: 'https://www.namecheap.com/support/api/intro/'
      },
      godaddy: {
        title: 'GoDaddy API Setup', 
        steps: [
          'Visit GoDaddy Developer Portal',
          'Create a new API key for Production environment',
          'Copy both the API Key and Secret',
          'Return here and enter your credentials'
        ],
        docsUrl: 'https://developer.godaddy.com/getstarted'
      },
      cloudflare: {
        title: 'Cloudflare API Setup',
        steps: [
          'Go to Cloudflare Dashboard → My Profile → API Tokens',
          'Create Custom Token with Zone:Edit permissions',
          'Include your domain in Zone Resources',
          'Copy the generated token'
        ],
        docsUrl: 'https://developers.cloudflare.com/api/tokens/create'
      },
      route53: {
        title: 'AWS Route53 Setup',
        steps: [
          'Go to AWS IAM Console → Users',
          'Create new user with programmatic access',
          'Attach Route53FullAccess policy',
          'Download Access Key ID and Secret Access Key'
        ],
        docsUrl: 'https://docs.aws.amazon.com/Route53/latest/APIReference/Welcome.html'
      }
    }

    return instructions[provider.toLowerCase()] || {
      title: 'API Setup Required',
      steps: ['Contact support for setup instructions'],
      docsUrl: '#'
    }
  }

  /**
   * Validate API credentials for provider
   */
  static async validateCredentials(provider: string, credentials: any): Promise<{
    valid: boolean
    message: string
  }> {
    try {
      // Use Make.com to validate credentials
      const scenario = MakeIntegration.SCENARIOS[provider.toLowerCase()]
      
      if (!scenario) {
        return { valid: false, message: 'Provider not supported' }
      }

      const testPayload = {
        action: 'validate-credentials',
        provider,
        credentials,
        timestamp: new Date().toISOString()
      }

      const response = await fetch(`${scenario.webhookUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MAKE_API_KEY}`
        },
        body: JSON.stringify(testPayload)
      })

      if (!response.ok) {
        return { valid: false, message: 'Credential validation failed' }
      }

      const result = await response.json()
      
      return {
        valid: result.valid === true,
        message: result.message || (result.valid ? 'Credentials valid' : 'Invalid credentials')
      }

    } catch (error) {
      return { 
        valid: false, 
        message: error instanceof Error ? error.message : 'Validation failed' 
      }
    }
  }

  /**
   * Get estimated setup time for provider
   */
  static getEstimatedTime(provider: string): string {
    const times = {
      cloudflare: '1-2 minutes',
      route53: '2-3 minutes', 
      namecheap: '3-5 minutes',
      godaddy: '3-5 minutes'
    }

    return times[provider.toLowerCase()] || '5-10 minutes'
  }

  /**
   * Check Make.com scenario status
   */
  static async getScenarioStatus(executionId: string): Promise<{
    status: 'running' | 'success' | 'error' | 'unknown'
    message?: string
    result?: any
  }> {
    try {
      // This would require Make.com API integration to check execution status
      // For now, return a placeholder
      return {
        status: 'unknown',
        message: 'Status checking not implemented yet'
      }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Status check failed'
      }
    }
  }
}

export default MakeIntegration