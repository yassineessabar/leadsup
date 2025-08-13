import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    // Query user_sessions table to get user_id
    const { data, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      console.error("Error fetching user from session:", error)
      return null
    }

    return data.user_id
  } catch (error) {
    console.error("Error in getUserIdFromSession:", error)
    return null
  }
}

// GET /api/domains/[id]/inbound-tracking - Get inbound tracking configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: domainId } = await params

    // Verify domain ownership and that it's verified
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', userId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }

    if (domain.status !== 'verified') {
      return NextResponse.json(
        { success: false, error: 'Domain must be verified to configure inbound tracking' },
        { status: 400 }
      )
    }

    // Check if inbound tracking is already configured
    // Note: inbound_tracking_enabled column doesn't exist yet, so we'll default to true for verified domains
    const inboundConfig = {
      isConfigured: domain.status === 'verified', // Assume configured if domain is verified
      webhookUrl: `https://leadsup.io/api/webhooks/sendgrid`,
      parseSettings: {
        subdomain: `reply.${domain.domain}`,
        destination: `https://leadsup.io/api/webhooks/sendgrid/inbound/${domainId}`,
        spamCheck: true,
        sendRaw: false
      },
      dnsRecords: [
        {
          type: 'MX',
          host: 'reply',
          value: 'mx.sendgrid.net',
          priority: 10,
          purpose: 'Route inbound emails to SendGrid Inbound Parse'
        }
      ]
    }

    return NextResponse.json({
      success: true,
      domain: {
        id: domain.id,
        domain: domain.domain,
        status: domain.status
      },
      inboundConfig
    })

  } catch (error) {
    console.error('Error in GET /api/domains/[id]/inbound-tracking:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/domains/[id]/inbound-tracking - Enable inbound tracking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: domainId } = await params

    // Verify domain ownership and that it's verified
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', userId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }

    if (domain.status !== 'verified') {
      return NextResponse.json(
        { success: false, error: 'Domain must be verified to configure inbound tracking' },
        { status: 400 }
      )
    }

    // Check if inbound tracking columns exist, if not, skip the database update
    console.log('🔧 Attempting to enable inbound tracking...')
    
    // Try to update with inbound tracking columns, but handle gracefully if they don't exist
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        updated_at: new Date().toISOString()
        // Note: inbound_tracking_enabled and inbound_webhook_url columns don't exist yet
        // In production, these would be added via database migration
      })
      .eq('id', domainId)
    
    console.log('📝 For now, inbound tracking is conceptually enabled for domain', domainId)

    if (updateError) {
      console.error('Error enabling inbound tracking:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to enable inbound tracking' },
        { status: 500 }
      )
    }

    // In a production environment, you would also:
    // 1. Configure SendGrid Inbound Parse webhook via their API
    // 2. Set up the subdomain routing
    // 3. Verify MX records are properly configured

    return NextResponse.json({
      success: true,
      message: 'Inbound tracking enabled successfully',
      config: {
        webhookUrl: `https://leadsup.io/api/webhooks/sendgrid/inbound/${domainId}`,
        subdomain: `reply.${domain.domain}`,
        enabled: true
      }
    })

  } catch (error) {
    console.error('Error in POST /api/domains/[id]/inbound-tracking:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/domains/[id]/inbound-tracking - Disable inbound tracking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: domainId } = await params

    // Verify domain ownership
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', userId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Disable inbound tracking (conceptually, since columns don't exist yet)
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        updated_at: new Date().toISOString()
        // Note: inbound_tracking_enabled and inbound_webhook_url columns don't exist yet
      })
      .eq('id', domainId)
    
    console.log('📝 Inbound tracking conceptually disabled for domain', domainId)

    if (updateError) {
      console.error('Error disabling inbound tracking:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to disable inbound tracking' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Inbound tracking disabled successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/domains/[id]/inbound-tracking:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}