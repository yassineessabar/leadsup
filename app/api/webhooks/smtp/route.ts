import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

/**
 * SMTP Email Webhook Handler
 * 
 * This endpoint handles incoming emails for SMTP-based providers
 * that don't have native webhook support (like custom SMTP servers).
 * 
 * This can be used with:
 * 1. Email forwarding rules (forward emails to this webhook)
 * 2. IMAP polling (separate service that polls IMAP and posts here)
 * 3. Email parsing services (SendGrid, Mailgun, etc.)
 */

// Generate deterministic conversation ID
function generateConversationId(contactEmail: string, senderEmail: string, campaignId?: string): string {
  const participants = [contactEmail, senderEmail].sort().join('|')
  const base = participants + (campaignId ? `|${campaignId}` : '')
  return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

// Parse email address from "Name <email@domain.com>" format
function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/)
  return match ? match[1].toLowerCase() : emailString.toLowerCase()
}

// Basic auth verification for webhook security
function verifyWebhookAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  
  const token = authHeader.split(' ')[1]
  const expectedToken = process.env.SMTP_WEBHOOK_SECRET || 'your-webhook-secret'
  
  return token === expectedToken
}

// Process incoming SMTP email
export async function POST(request: NextRequest) {
  try {
    console.log('📨 SMTP webhook received')

    // Verify webhook authentication
    if (!verifyWebhookAuth(request)) {
      console.error('❌ SMTP webhook authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailData = await request.json()
    console.log('📧 SMTP email data received')

    // Validate required fields
    const requiredFields = ['from', 'to', 'subject', 'messageId']
    for (const field of requiredFields) {
      if (!emailData[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }

    const fromEmail = extractEmail(emailData.from)
    const toEmail = extractEmail(emailData.to)
    
    // Determine which user this email belongs to
    let userId = null
    let campaignId = null
    let contactId = null
    let isInbound = true

    // Check if the 'to' email is one of our campaign senders (inbound email)
    const { data: inboundSender } = await supabaseServer
      .from('campaign_senders')
      .select('user_id, campaign_id')
      .eq('email', toEmail)
      .single()

    if (inboundSender) {
      // This is an inbound email to our campaign
      userId = inboundSender.user_id
      campaignId = inboundSender.campaign_id
      isInbound = true
      
      // Try to find the contact
      const { data: contact } = await supabaseServer
        .from('campaign_leads')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('email', fromEmail)
        .single()
        
      if (contact) {
        contactId = contact.id
      }
    } else {
      // Check if the 'from' email is one of our campaign senders (outbound email)
      const { data: outboundSender } = await supabaseServer
        .from('campaign_senders')
        .select('user_id, campaign_id')
        .eq('email', fromEmail)
        .single()

      if (outboundSender) {
        userId = outboundSender.user_id
        campaignId = outboundSender.campaign_id
        isInbound = false
        
        // Try to find the contact
        const { data: contact } = await supabaseServer
          .from('campaign_leads')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('email', toEmail)
          .single()
          
        if (contact) {
          contactId = contact.id
        }
      }
    }

    if (!userId) {
      console.error('❌ Could not determine user for email:', fromEmail, '->', toEmail)
      return NextResponse.json({ 
        error: 'Email does not belong to any known campaign' 
      }, { status: 404 })
    }

    // Generate conversation ID
    const conversationId = generateConversationId(
      isInbound ? fromEmail : toEmail,
      isInbound ? toEmail : fromEmail,
      campaignId
    )

    // Check if message already exists
    const { data: existingMessage } = await supabaseServer
      .from('inbox_messages')
      .select('id')
      .eq('message_id', emailData.messageId)
      .eq('user_id', userId)
      .single()

    if (existingMessage) {
      console.log(`⏭️ Message ${emailData.messageId} already exists`)
      return NextResponse.json({ 
        success: true, 
        message: 'Message already processed' 
      })
    }

    // Process attachments if present
    const hasAttachments = emailData.attachments && emailData.attachments.length > 0
    const attachments = emailData.attachments || []

    // Insert into inbox_messages
    const { data: insertedMessage, error: insertError } = await supabaseServer
      .from('inbox_messages')
      .insert({
        user_id: userId,
        message_id: emailData.messageId,
        thread_id: emailData.threadId,
        conversation_id: conversationId,
        campaign_id: campaignId,
        contact_id: contactId,
        contact_email: isInbound ? fromEmail : toEmail,
        sender_email: isInbound ? toEmail : fromEmail,
        subject: emailData.subject,
        body_text: emailData.textBody || emailData.text || '',
        body_html: emailData.htmlBody || emailData.html || '',
        direction: isInbound ? 'inbound' : 'outbound',
        channel: 'email',
        status: isInbound ? 'unread' : 'sent',
        has_attachments: hasAttachments,
        attachments: attachments,
        in_reply_to: emailData.inReplyTo,
        reference_ids: emailData.references ? emailData.references.split(' ') : [],
        sent_at: emailData.date ? new Date(emailData.date).toISOString() : new Date().toISOString(),
        received_at: new Date().toISOString(),
        provider: 'smtp',
        provider_data: {
          smtpServer: emailData.smtpServer || 'unknown',
          originalRecipients: emailData.allRecipients || [],
          spamScore: emailData.spamScore,
          headers: emailData.headers || {}
        }
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error inserting SMTP message:', insertError)
      return NextResponse.json({ 
        error: 'Failed to save message' 
      }, { status: 500 })
    }

    console.log(`✅ Processed SMTP message: ${emailData.subject}`)

    // Update or create thread
    await supabaseServer
      .from('inbox_threads')
      .upsert({
        user_id: userId,
        conversation_id: conversationId,
        thread_id: emailData.threadId,
        campaign_id: campaignId,
        contact_id: contactId,
        contact_email: isInbound ? fromEmail : toEmail,
        subject: emailData.subject,
        last_message_at: emailData.date ? new Date(emailData.date).toISOString() : new Date().toISOString(),
        last_message_preview: (emailData.textBody || emailData.text || '').substring(0, 150),
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })

    // If this is an inbound message, log for native automation handling
    if (isInbound && campaignId) {
      console.log(`🤖 Prospect replied to SMTP campaign ${campaignId}`)
      
      // Native automation handling would go here
      // (e.g., update lead status, trigger follow-up sequences, etc.)
    }

    return NextResponse.json({
      success: true,
      messageId: insertedMessage.id,
      conversationId,
      direction: isInbound ? 'inbound' : 'outbound',
      processed: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ SMTP webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle GET for webhook verification/testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'SMTP webhook endpoint active',
    supportedProviders: [
      'SendGrid',
      'Mailgun', 
      'Custom SMTP',
      'Email forwarding',
      'IMAP polling'
    ],
    requiredAuth: 'Bearer token in Authorization header',
    timestamp: new Date().toISOString()
  })
}