import sgMail from '@sendgrid/mail'

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

if (!SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is required')
}
sgMail.setApiKey(SENDGRID_API_KEY)

export interface SendGridEmailOptions {
  to: string
  from: string
  fromName?: string
  subject: string
  text?: string
  html?: string
  replyTo?: string
  attachments?: Array<{
    content: string
    filename: string
    type?: string
    disposition?: string
    contentId?: string
  }>
}

export async function sendEmailWithSendGrid(options: SendGridEmailOptions) {
  try {
    console.log(`📧 Sending email via SendGrid from ${options.from} to ${options.to}`)
    
    // Use the actual sender email from the campaign sender
    // This should be one of the verified emails like contact@leadsup.io, hello@leadsup.io, etc.
    const senderEmail = options.from
    
    if (!senderEmail) {
      throw new Error('Sender email is required')
    }
    
    const msg = {
      to: options.to,
      from: {
        email: senderEmail,
        name: options.fromName || senderEmail
      },
      subject: options.subject,
      text: options.text || '',
      html: options.html || options.text || '',
      replyTo: options.replyTo || senderEmail,
      attachments: options.attachments || []
    }

    const result = await sgMail.send(msg)
    
    console.log(`✅ Email sent successfully via SendGrid - Message ID: ${result[0]?.headers?.['x-message-id']}`)
    
    return {
      success: true,
      messageId: result[0]?.headers?.['x-message-id'] || `sendgrid-${Date.now()}`,
      provider: 'sendgrid',
      method: 'sendgrid_api'
    }
    
  } catch (error: any) {
    console.error('❌ SendGrid send error:', error)
    
    // Extract error details from SendGrid response
    let errorMessage = 'Failed to send via SendGrid'
    if (error.response?.body?.errors) {
      errorMessage = error.response.body.errors.map((e: any) => e.message).join(', ')
    } else if (error.message) {
      errorMessage = error.message
    }
    
    throw new Error(`SendGrid error: ${errorMessage}`)
  }
}

// SendGrid Inbound Parse Configuration
export interface InboundParseSettings {
  hostname: string
  url: string
  spam_check?: boolean
  send_raw?: boolean
}

export async function configureInboundParse(settings: InboundParseSettings) {
  try {
    console.log(`🔧 Configuring SendGrid inbound parse for ${settings.hostname}`)
    
    const response = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hostname: settings.hostname,
        url: settings.url,
        spam_check: settings.spam_check ?? true,
        send_raw: settings.send_raw ?? false
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`✅ Inbound parse configured successfully for ${settings.hostname}`)
    
    return {
      success: true,
      hostname: settings.hostname,
      webhook_id: result.id,
      result
    }
    
  } catch (error: any) {
    console.error('❌ SendGrid inbound parse configuration error:', error)
    throw new Error(`Failed to configure inbound parse: ${error.message}`)
  }
}

export async function getInboundParseSettings() {
  try {
    console.log('🔍 Fetching SendGrid inbound parse settings')
    
    const response = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const settings = await response.json()
    console.log(`✅ Retrieved ${settings.result?.length || 0} inbound parse settings`)
    
    return {
      success: true,
      settings: settings.result || []
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching inbound parse settings:', error)
    throw new Error(`Failed to fetch inbound parse settings: ${error.message}`)
  }
}

export async function deleteInboundParse(hostname: string) {
  try {
    console.log(`🗑️ Deleting SendGrid inbound parse for ${hostname}`)
    
    // First get the settings to find the ID
    const { settings } = await getInboundParseSettings()
    const setting = settings.find((s: any) => s.hostname === hostname)
    
    if (!setting) {
      console.log(`⚠️ No inbound parse setting found for ${hostname}`)
      return { success: true, message: 'Setting not found (already deleted)' }
    }

    const response = await fetch(`https://api.sendgrid.com/v3/user/webhooks/parse/settings/${setting.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    console.log(`✅ Inbound parse deleted successfully for ${hostname}`)
    
    return {
      success: true,
      hostname,
      deleted_id: setting.id
    }
    
  } catch (error: any) {
    console.error('❌ Error deleting inbound parse:', error)
    throw new Error(`Failed to delete inbound parse: ${error.message}`)
  }
}

// SendGrid Domain Authentication (Sender Authentication)
export interface DomainAuthSettings {
  domain: string
  subdomain?: string
  ips?: string[]
  custom_spf?: boolean
  default?: boolean
}

export async function createDomainAuthentication(settings: DomainAuthSettings) {
  try {
    console.log(`🔐 Creating SendGrid domain authentication for ${settings.domain}`)
    
    const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain: settings.domain,
        subdomain: settings.subdomain || null,
        ips: settings.ips || [],
        custom_spf: settings.custom_spf ?? false,
        default: settings.default ?? false
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`✅ Domain authentication created successfully for ${settings.domain}`)
    
    return {
      success: true,
      domain: settings.domain,
      id: result.id,
      dns_records: result.dns,
      result
    }
    
  } catch (error: any) {
    console.error('❌ SendGrid domain authentication error:', error)
    throw new Error(`Failed to create domain authentication: ${error.message}`)
  }
}

export async function getDomainAuthentication(domain?: string) {
  try {
    console.log(`🔍 Fetching SendGrid domain authentication${domain ? ` for ${domain}` : ''}`)
    
    const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const domains = await response.json()
    console.log(`✅ Retrieved ${domains.length} domain authentications`)
    
    if (domain) {
      const matchingDomain = domains.find((d: any) => d.domain === domain)
      return {
        success: true,
        domain: matchingDomain || null,
        all_domains: domains
      }
    }
    
    return {
      success: true,
      domains
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching domain authentication:', error)
    throw new Error(`Failed to fetch domain authentication: ${error.message}`)
  }
}

export async function validateDomainAuthentication(domainId: string) {
  try {
    console.log(`✅ Validating SendGrid domain authentication ${domainId}`)
    
    const response = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${domainId}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`✅ Domain validation result: ${result.valid ? 'VALID' : 'INVALID'}`)
    
    return {
      success: true,
      valid: result.valid,
      validation_results: result.validation_results,
      result
    }
    
  } catch (error: any) {
    console.error('❌ Error validating domain authentication:', error)
    throw new Error(`Failed to validate domain authentication: ${error.message}`)
  }
}

// SendGrid Sender Identity Management
export interface SenderIdentitySettings {
  nickname: string
  from: {
    email: string
    name?: string
  }
  reply_to?: {
    email: string
    name?: string
  }
  address: string
  address_2?: string
  city: string
  state?: string
  zip?: string
  country: string
}

export async function createSenderIdentity(settings: SenderIdentitySettings) {
  try {
    console.log(`🆔 Creating SendGrid sender identity for ${settings.from.email}`)
    
    const payload = {
      nickname: settings.nickname,
      from: {
        email: settings.from.email,
        name: settings.from.name || settings.from.email.split('@')[0]
      },
      reply_to: {
        email: settings.reply_to?.email || settings.from.email,
        name: settings.reply_to?.name || settings.from.name || settings.from.email.split('@')[0]
      },
      address: settings.address,
      city: settings.city,
      zip: settings.zip || "10001",
      country: settings.country
    }
    
    // Only add optional fields if they have values
    if (settings.address_2) {
      payload.address_2 = settings.address_2
    }
    // Note: state field causes SendGrid "bad json payload" error, so it's excluded
    
    console.log('📧 SendGrid payload:', JSON.stringify(payload, null, 2))
    
    const response = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // Handle specific error cases
      if (response.status === 403) {
        console.log(`⚠️  SendGrid API key lacks permission to create sender identities for ${settings.from.email}`)
        console.log(`💡 You can manually create sender identity in SendGrid dashboard: https://app.sendgrid.com/settings/sender_auth`)
        
        // Return a "success" for permission errors so the sender account is still created
        return {
          success: false,
          error: 'permission_denied',
          message: 'SendGrid API key lacks sender identity permissions. Create manually in SendGrid dashboard.',
          sender_id: null,
          verification_status: 'pending'
        }
      }
      
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`✅ Sender identity created successfully for ${settings.from.email}`)
    
    return {
      success: true,
      sender_id: result.id,
      verification_status: result.verified_status,
      result
    }
    
  } catch (error: any) {
    console.error('❌ SendGrid sender identity creation error:', error)
    throw new Error(`Failed to create sender identity: ${error.message}`)
  }
}

export async function getSenderIdentities() {
  try {
    console.log('🔍 Fetching SendGrid sender identities')
    
    const response = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`✅ Retrieved ${result.results?.length || 0} sender identities`)
    
    return {
      success: true,
      senders: result.results || []
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching sender identities:', error)
    throw new Error(`Failed to fetch sender identities: ${error.message}`)
  }
}

export async function resendSenderIdentityVerification(senderId: string) {
  try {
    console.log(`📧 Resending verification for sender identity ${senderId}`)
    
    const response = await fetch(`https://api.sendgrid.com/v3/verified_senders/${senderId}/resend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    console.log(`✅ Verification email resent for sender identity ${senderId}`)
    
    return {
      success: true,
      message: 'Verification email sent'
    }
    
  } catch (error: any) {
    console.error('❌ Error resending verification:', error)
    throw new Error(`Failed to resend verification: ${error.message}`)
  }
}

export async function deleteSenderIdentity(senderId: string) {
  try {
    console.log(`🗑️ Deleting sender identity ${senderId}`)
    
    const response = await fetch(`https://api.sendgrid.com/v3/verified_senders/${senderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    console.log(`✅ Sender identity deleted successfully`)
    
    return {
      success: true,
      message: 'Sender identity deleted'
    }
    
  } catch (error: any) {
    console.error('❌ Error deleting sender identity:', error)
    throw new Error(`Failed to delete sender identity: ${error.message}`)
  }
}

export { sgMail }