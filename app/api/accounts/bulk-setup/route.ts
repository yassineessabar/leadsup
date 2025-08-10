import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth helper function
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Bulk setup multiple email accounts with different authentication methods
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Bulk Setup API\"' } }
    )
  }

  try {
    const body = await request.json()
    const { setup_method, accounts } = body

    console.log(`🔧 Setting up ${accounts?.length || 0} accounts using ${setup_method} method...`)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    }

    switch (setup_method) {
      case 'smtp_relay':
        return await setupSMTPRelay(body, results)
      
      case 'oauth_workspace':
        return await setupOAuthWorkspace(body, results)
      
      case 'warm_up_service':
        return await setupWarmUpService(body, results)
      
      case 'simplified_gmail':
        return await setupSimplifiedGmail(body, results)
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid setup method',
          available_methods: [
            'smtp_relay',
            'oauth_workspace', 
            'warm_up_service',
            'simplified_gmail'
          ]
        })
    }

  } catch (error) {
    console.error('❌ Error in bulk setup:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// SMTP Relay Setup (SendGrid, Mailgun, SES)
async function setupSMTPRelay(body: any, results: any) {
  const { smtp_provider, api_key, sender_addresses } = body

  console.log(`🔧 Setting up ${smtp_provider} SMTP relay...`)

  // Create unified SMTP configuration
  const smtpConfig = {
    provider: smtp_provider,
    api_key: api_key,
    auth_type: 'smtp_relay',
    setup_date: new Date().toISOString()
  }

  // Add all sender addresses with the same SMTP config
  for (const address of sender_addresses) {
    try {
      const { error } = await supabaseServer
        .from('campaign_senders')
        .upsert({
          email: address.email,
          name: address.name,
          auth_type: 'smtp_relay',
          smtp_config: smtpConfig,
          is_active: true,
          created_at: new Date().toISOString()
        })

      if (error) {
        results.failed++
        results.errors.push({
          email: address.email,
          error: error.message
        })
      } else {
        results.success++
      }
    } catch (error) {
      results.failed++
      results.errors.push({
        email: address.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return NextResponse.json({
    success: true,
    method: 'smtp_relay',
    provider: smtp_provider,
    configured_accounts: results.success,
    failed_accounts: results.failed,
    errors: results.errors,
    next_steps: [
      '✅ All accounts configured with single SMTP relay',
      '🔧 No individual passwords needed',
      '🚀 Ready to send emails immediately',
      '',
      'Test command:',
      'curl -u "admin:password" -X POST http://localhost:3000/api/campaigns/automation/send-emails'
    ]
  })
}

// OAuth Workspace Setup
async function setupOAuthWorkspace(body: any, results: any) {
  const { workspace_domain, service_account_key, sender_addresses } = body

  console.log(`🔧 Setting up Google Workspace OAuth for domain: ${workspace_domain}`)

  // Store service account configuration
  const oauthConfig = {
    workspace_domain: workspace_domain,
    service_account_key: service_account_key,
    auth_type: 'oauth_workspace',
    setup_date: new Date().toISOString()
  }

  // Add all sender addresses with OAuth config
  for (const address of sender_addresses) {
    try {
      const { error } = await supabaseServer
        .from('campaign_senders')
        .upsert({
          email: address.email,
          name: address.name,
          auth_type: 'oauth_workspace',
          oauth_config: oauthConfig,
          is_active: true,
          created_at: new Date().toISOString()
        })

      if (error) {
        results.failed++
        results.errors.push({
          email: address.email,
          error: error.message
        })
      } else {
        results.success++
      }
    } catch (error) {
      results.failed++
      results.errors.push({
        email: address.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return NextResponse.json({
    success: true,
    method: 'oauth_workspace',
    domain: workspace_domain,
    configured_accounts: results.success,
    failed_accounts: results.failed,
    errors: results.errors,
    next_steps: [
      '✅ Google Workspace OAuth configured',
      '🔐 Service account handles all authentication',
      '📧 All domain email accounts ready',
      '',
      'Required: Enable domain-wide delegation in Google Admin Console'
    ]
  })
}

// Warm-up Service Setup (Instantly, Lemlist, Woodpecker)
async function setupWarmUpService(body: any, results: any) {
  const { warmup_provider, api_key, accounts } = body

  console.log(`🔧 Setting up ${warmup_provider} warm-up service...`)

  const warmupConfig = {
    provider: warmup_provider,
    api_key: api_key,
    auth_type: 'warmup_service',
    setup_date: new Date().toISOString()
  }

  // Configure accounts with warm-up service
  for (const account of accounts) {
    try {
      const { error } = await supabaseServer
        .from('campaign_senders')
        .upsert({
          email: account.email,
          name: account.name,
          auth_type: 'warmup_service',
          warmup_config: warmupConfig,
          is_active: true,
          created_at: new Date().toISOString()
        })

      if (error) {
        results.failed++
        results.errors.push({
          email: account.email,
          error: error.message
        })
      } else {
        results.success++
      }
    } catch (error) {
      results.failed++
      results.errors.push({
        email: account.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return NextResponse.json({
    success: true,
    method: 'warmup_service',
    provider: warmup_provider,
    configured_accounts: results.success,
    failed_accounts: results.failed,
    errors: results.errors,
    next_steps: [
      '✅ Warm-up service configured',
      '🌡️ Accounts will be warmed automatically',
      '📈 Deliverability optimization included',
      '',
      'Note: Email sending will use the warm-up service API'
    ]
  })
}

// Simplified Gmail Setup (One-click App Password generation)
async function setupSimplifiedGmail(body: any, results: any) {
  const { accounts } = body

  return NextResponse.json({
    success: true,
    method: 'simplified_gmail',
    message: 'Gmail simplified setup',
    instructions: [
      '🔧 Simplified Gmail Setup Process:',
      '',
      '1. Enable 2-Step Verification (one-time setup)',
      '2. Use our Chrome extension to auto-generate App Passwords',
      '3. Extension automatically saves passwords to your campaign',
      '',
      '⚠️ This requires a custom Chrome extension for bulk setup',
      '💡 For immediate use, consider SMTP Relay instead'
    ],
    alternative: 'Use setup_method: "smtp_relay" for immediate deployment'
  })
}