import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { to, subject, content, campaignId } = await request.json()
    
    if (!to) {
      return NextResponse.json({ success: false, error: 'Email recipient required' }, { status: 400 })
    }

    if (!campaignId) {
      return NextResponse.json({ success: false, error: 'Campaign ID required' }, { status: 400 })
    }
    
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'SENDGRID_API_KEY not configured'
      }, { status: 500 })
    }

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("id, name, user_id")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      )
    }

    // Get campaign sender (first active sender)
    const { data: senders, error: sendersError } = await supabaseServer
      .from("campaign_senders")
      .select("email, name")
      .eq("campaign_id", campaignId)
      .eq("is_selected", true)
      .eq("is_active", true)
      .limit(1)

    if (sendersError || !senders || senders.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active sender found for this campaign" },
        { status: 400 }
      )
    }

    const sender = senders[0]
    
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    const msg = {
      to: to,
      from: {
        email: sender.email,
        name: sender.name || sender.email.split('@')[0]
      },
      subject: subject || 'Test Email from LeadsUp',
      html: content || `
        <h2>Test Email from LeadsUp</h2>
        <p>This is a test email to verify SendGrid integration is working.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    }
    
    console.log(`📧 Sending test email from ${sender.email} to ${to}`)
    
    const result = await sgMail.send(msg)
    
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
      messageId: result[0]?.headers?.['x-message-id'] || 'unknown'
    })
    
  } catch (error) {
    console.error('❌ Test email error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}