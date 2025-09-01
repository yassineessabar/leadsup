import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { getSupabaseServerClient } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await getSupabaseServerClient()
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
      console.log('❌ No user session found in /api/test-email')
      return NextResponse.json({ 
        success: false, 
        error: "Not authenticated. Please log in to send test emails." 
      }, { status: 401 })
    }
    
    console.log('✅ User authenticated in /api/test-email:', userId)

    const { to, subject, content, campaignId, senderEmail } = await request.json()
    
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
    const { data: campaign, error: campaignError } = await getSupabaseServerClient()
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

    // Use provided sender email or fallback to primary/any sender
    let sender = null
    
    if (senderEmail) {
      // If sender email is provided, try to find it in campaign senders or sender accounts
      console.log('🔍 Looking for specified sender:', senderEmail)
      
      // First check campaign senders
      const { data: campaignSender } = await getSupabaseServerClient()
        .from("campaign_senders")
        .select("email, name")
        .eq("campaign_id", campaignId)
        .eq("email", senderEmail)
        .single()
      
      if (campaignSender) {
        sender = { email: campaignSender.email, name: campaignSender.name }
        console.log('✅ Found sender in campaign senders:', sender.email)
      } else {
        // Check sender accounts
        const { data: senderAccount } = await getSupabaseServerClient()
          .from("sender_accounts")
          .select("email, display_name")
          .eq("user_id", userId)
          .eq("email", senderEmail)
          .single()
        
        if (senderAccount) {
          sender = { email: senderAccount.email, name: senderAccount.display_name }
          console.log('✅ Found sender in sender accounts:', sender.email)
        }
      }
      
      if (!sender) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Sender ${senderEmail} not found in your accounts.`
          },
          { status: 400 }
        )
      }
    } else {
      // No sender specified, use primary or any available sender
      const { data: primarySender, error: senderError } = await getSupabaseServerClient()
        .from("sender_accounts")
        .select("email, display_name")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .single()

      if (senderError || !primarySender) {
        // If no primary sender, try to get any sender account
        const { data: anySender, error: anySenderError } = await getSupabaseServerClient()
          .from("sender_accounts")
          .select("email, display_name")
          .eq("user_id", userId)
          .limit(1)
          .single()

        if (anySenderError || !anySender) {
          return NextResponse.json(
            { 
              success: false, 
              error: "No sender account configured. Please configure a sender account in Settings first.",
              requiresSetup: true 
            },
            { status: 400 }
          )
        }
        
        // Use the first available sender if no primary is set
        sender = { email: anySender.email, name: anySender.display_name }
        console.log('⚠️ No primary sender found, using first available sender:', sender.email)
      } else {
        sender = { email: primarySender.email, name: primarySender.display_name }
        console.log('✅ Using primary sender account:', sender.email)
      }
    }
    
    // Extract domain from sender email and create reply-to address
    const senderDomain = sender.email.split('@')[1]
    const replyToAddress = `reply@reply.${senderDomain}`
    
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    const msg = {
      to: to,
      from: {
        email: sender.email,
        name: sender.name || sender.email.split('@')[0]
      },
      replyTo: replyToAddress,
      subject: subject || 'Test Email from LeadsUp',
      html: content || `
        <h2>Test Email from LeadsUp</h2>
        <p>This is a test email to verify SendGrid integration is working.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    }
    
    // Check if sender is verified in SendGrid - fail if not verified
    try {
      const { getSenderIdentities } = await import('@/lib/sendgrid')
      const identitiesResult = await getSenderIdentities()
      const senderIdentity = identitiesResult.senders.find((s: any) => s.from_email === sender.email)
      
      if (!senderIdentity) {
        throw new Error(`Sender identity for ${sender.email} not found in SendGrid. Please verify the domain and sender first.`)
      }
      
      if (!senderIdentity.verified) {
        throw new Error(`Sender ${sender.email} is not verified in SendGrid. Please check your email for verification link or contact support.`)
      }
      
      console.log(`✅ Sender ${sender.email} is verified in SendGrid`)
    } catch (identityCheckError) {
      console.log(`❌ Sender verification check failed: ${identityCheckError.message}`)
      throw new Error(`Cannot send test email: ${identityCheckError.message}`)
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