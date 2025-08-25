import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"
import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

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
  } catch (err) {
    console.error("Error in getUserIdFromSession:", err)
    return null
  }
}

// POST - Send a single email (for replies, forwards, etc.)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      to_email, 
      subject, 
      body_html, 
      body_text, 
      from_email,
      reply_message_id,
      cc,
      bcc
    } = body

    console.log('📧 Sending single email:', { to_email, subject, from_email })

    // Validate required fields
    if (!to_email || !subject || (!body_html && !body_text)) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: to_email, subject, and body" 
      }, { status: 400 })
    }

    // Get sender account if not provided
    let senderEmail = from_email
    if (!senderEmail) {
      // Get the user's default sender account
      const { data: senderAccount } = await supabaseServer
        .from('sender_accounts')
        .select('email')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single()
      
      if (senderAccount) {
        senderEmail = senderAccount.email
      } else {
        // Fallback to first sender account
        const { data: anySender } = await supabaseServer
          .from('sender_accounts')
          .select('email')
          .eq('user_id', userId)
          .limit(1)
          .single()
        
        senderEmail = anySender?.email || 'noreply@leadsup.io'
      }
    }

    // Prepare the email message
    const msg = {
      to: to_email,
      from: {
        email: senderEmail,
        name: 'LeadsUp'
      },
      subject: subject,
      text: body_text || body_html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      html: body_html || body_text.replace(/\n/g, '<br>'), // Convert newlines to br for HTML
      ...(cc && { cc }),
      ...(bcc && { bcc })
    }

    // Send the email via SendGrid
    try {
      await sgMail.send(msg)
      console.log('✅ Email sent successfully via SendGrid')
      
      // Update the reply message in database if reply_message_id provided
      if (reply_message_id) {
        await supabaseServer
          .from('inbox_messages')
          .update({
            sent_at: new Date().toISOString(),
            provider_message_id: `sg_${Date.now()}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', reply_message_id)
          .eq('user_id', userId)
      }

      // Log email activity
      await supabaseServer
        .from('email_tracking')
        .insert({
          user_id: userId,
          campaign_id: null, // Not part of a campaign
          contact_email: to_email,
          sender_email: senderEmail,
          subject: subject,
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider: 'sendgrid',
          message_type: 'single', // Distinguish from campaign emails
          metadata: {
            reply_to: reply_message_id,
            from_inbox: true
          }
        })

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        data: {
          to: to_email,
          from: senderEmail,
          subject: subject
        }
      })

    } catch (sendError: any) {
      console.error('❌ SendGrid error:', sendError)
      
      // Log failed attempt
      await supabaseServer
        .from('email_tracking')
        .insert({
          user_id: userId,
          campaign_id: null,
          contact_email: to_email,
          sender_email: senderEmail,
          subject: subject,
          status: 'failed',
          sent_at: new Date().toISOString(),
          provider: 'sendgrid',
          message_type: 'single',
          error_message: sendError.message || 'Failed to send email',
          metadata: {
            reply_to: reply_message_id,
            from_inbox: true,
            error_details: sendError.response?.body || sendError
          }
        })

      return NextResponse.json({ 
        success: false, 
        error: sendError.message || 'Failed to send email',
        details: sendError.response?.body?.errors || []
      }, { status: 500 })
    }

  } catch (error) {
    console.error("❌ Error in send-single-email:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}