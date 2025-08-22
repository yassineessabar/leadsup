import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
    
    if (!SENDGRID_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'SendGrid API key not found' 
      })
    }

    console.log('🔍 Checking SendGrid Inbound Parse settings...')
    
    // Get current inbound parse settings
    const response = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({
        success: false,
        error: `SendGrid API error: ${response.status}`,
        details: errorData
      })
    }

    const settings = await response.json()
    console.log('📧 SendGrid Inbound Parse settings:', settings)
    
    // Check if reply.leadsup.io is configured
    const replyConfig = settings.result?.find((s: any) => 
      s.hostname === 'reply.leadsup.io' || s.hostname === '*.leadsup.io'
    )
    
    return NextResponse.json({
      success: true,
      total_configs: settings.result?.length || 0,
      all_configs: settings.result || [],
      reply_config: replyConfig || null,
      has_reply_config: !!replyConfig,
      recommended_config: {
        hostname: 'reply.leadsup.io',
        url: 'https://leadsup.vercel.app/api/webhooks/sendgrid',
        spam_check: true,
        send_raw: false
      }
    })
    
  } catch (error) {
    console.error('❌ Error checking SendGrid parse config:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
    
    if (!SENDGRID_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'SendGrid API key not found' 
      })
    }

    console.log('🔧 Configuring SendGrid Inbound Parse for reply.leadsup.io...')
    
    const config = {
      hostname: 'reply.leadsup.io',
      url: 'https://leadsup.vercel.app/api/webhooks/sendgrid',
      spam_check: true,
      send_raw: false
    }
    
    const response = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // Handle duplicate entry as success
      if (response.status === 400 && errorData.errors?.[0]?.message?.includes('duplicate entry')) {
        return NextResponse.json({
          success: true,
          message: 'Inbound parse already configured for reply.leadsup.io',
          config: config
        })
      }
      
      return NextResponse.json({
        success: false,
        error: `SendGrid API error: ${response.status}`,
        details: errorData
      })
    }

    const result = await response.json()
    console.log('✅ SendGrid Inbound Parse configured:', result)
    
    return NextResponse.json({
      success: true,
      message: 'SendGrid Inbound Parse configured successfully',
      config: config,
      result: result
    })
    
  } catch (error) {
    console.error('❌ Error configuring SendGrid parse:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}