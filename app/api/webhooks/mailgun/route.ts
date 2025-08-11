import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import crypto from 'crypto'

/**
 * Mailgun Webhook Handler
 * 
 * This endpoint receives emails directly from Mailgun when someone replies
 * to your campaign emails. No N8N needed - direct integration!
 */

// Generate deterministic conversation ID
function generateConversationId(contactEmail: string, senderEmail: string, campaignId?: string): string {
  const participants = [contactEmail, senderEmail].sort().join('|')
  const base = participants + (campaignId ? `|${campaignId}` : '')
  return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

// Parse email address from "Name <email@domain.com>" format
function extractEmail(emailString: string): string {
  if (!emailString) return ''
  const match = emailString.match(/<([^>]+)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/)
  return match ? match[1].toLowerCase() : emailString.toLowerCase()
}

// Verify Mailgun webhook signature
function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const key = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
  if (!key) {
    console.log('⚠️  MAILGUN_WEBHOOK_SIGNING_KEY not set, skipping signature verification')
    return true // Allow during development
  }
  
  const hmac = crypto.createHmac('sha256', key)
  hmac.update(timestamp + token)
  const computedSignature = hmac.digest('hex')
  
  return computedSignature === signature
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 Mailgun webhook received')

    // Parse form data from Mailgun
    const formData = await request.formData()
    
    // Extract Mailgun fields
    const sender = formData.get('sender') as string || ''
    const recipient = formData.get('recipient') as string || ''
    const subject = formData.get('subject') as string || 'No Subject'
    const bodyPlain = formData.get('body-plain') as string || ''
    const bodyHtml = formData.get('body-html') as string || ''
    const messageId = formData.get('Message-Id') as string || `mailgun-${Date.now()}@leadsup.com`
    const timestamp = formData.get('timestamp') as string || ''
    const token = formData.get('token') as string || ''
    const signature = formData.get('signature') as string || ''
    const attachmentCount = formData.get('attachment-count') as string || '0'
    
    console.log(`📧 Processing email from ${sender} to ${recipient}`)
    console.log(`   Subject: "${subject}"`)
    
    // Verify signature (optional in development)
    if (!verifyMailgunSignature(timestamp, token, signature)) {
      console.error('❌ Mailgun signature verification failed')
      // Still process in development, but log the warning
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Extract clean email addresses
    const fromEmail = extractEmail(sender)
    const toEmail = extractEmail(recipient)
    
    console.log(`   Clean addresses: ${fromEmail} → ${toEmail}`)

    // Find which campaign sender this email is responding to
    const { data: campaignSender, error: senderError } = await supabaseServer
      .from('campaign_senders')
      .select('user_id, campaign_id')
      .eq('email', toEmail)
      .single()
    
    if (senderError || !campaignSender) {
      console.log(`⏭️ Email to ${toEmail} is not for a campaign sender, ignoring`)
      return NextResponse.json({ 
        success: true, 
        message: 'Not a campaign email, ignored' 
      })
    }
    
    console.log(`✅ Found campaign sender: User ${campaignSender.user_id}, Campaign ${campaignSender.campaign_id}`)

    // Try to find the contact (note: contact_id in inbox_messages expects UUID, but contacts table uses integer)
    // For now, we'll set contact_id to null and use contact_email for identification
    const contactId = null

    // Generate conversation ID for threading
    const conversationId = generateConversationId(fromEmail, toEmail, campaignSender.campaign_id)
    
    console.log(`🔗 Conversation ID: ${conversationId}`)

    // Check if message already exists
    const { data: existingMessage } = await supabaseServer
      .from('inbox_messages')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', campaignSender.user_id)
      .single()

    if (existingMessage) {
      console.log(`⏭️ Message ${messageId} already exists`)
      return NextResponse.json({ 
        success: true, 
        message: 'Message already processed' 
      })
    }

    // Store the inbound message
    const { data: insertedMessage, error: insertError } = await supabaseServer
      .from('inbox_messages')
      .insert({
        user_id: campaignSender.user_id,
        message_id: messageId,
        conversation_id: conversationId,
        campaign_id: campaignSender.campaign_id,
        contact_id: contactId,
        contact_email: fromEmail,
        sender_email: toEmail,
        subject: subject,
        body_text: bodyPlain,
        body_html: bodyHtml,
        direction: 'inbound',
        channel: 'email',
        status: 'unread',
        folder: 'inbox',
        has_attachments: parseInt(attachmentCount) > 0,
        attachments: [],
        sent_at: timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : new Date().toISOString(),
        received_at: new Date().toISOString(),
        provider: 'mailgun',
        provider_data: {
          timestamp,
          token,
          attachmentCount: parseInt(attachmentCount),
          originalSender: sender,
          originalRecipient: recipient
        }
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error inserting Mailgun message:', insertError)
      return NextResponse.json({ 
        error: 'Failed to save message' 
      }, { status: 500 })
    }

    console.log(`✅ Message stored successfully: ${insertedMessage.id}`)

    // Update or create thread
    await supabaseServer
      .from('inbox_threads')
      .upsert({
        user_id: campaignSender.user_id,
        conversation_id: conversationId,
        campaign_id: campaignSender.campaign_id,
        contact_id: null, // Use null for contact_id to avoid UUID issues
        contact_email: fromEmail,
        subject: subject,
        last_message_at: timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : new Date().toISOString(),
        last_message_preview: bodyPlain.substring(0, 150),
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })

    console.log(`✅ Thread updated for conversation ${conversationId}`)

    // Log success
    console.log('📊 Mailgun email capture summary:')
    console.log(`   - From: ${fromEmail}`)
    console.log(`   - To: ${toEmail}`)
    console.log(`   - Subject: ${subject}`)
    console.log(`   - Attachments: ${attachmentCount}`)
    console.log(`   - Message ID: ${insertedMessage.id}`)
    console.log(`   - Provider: Mailgun`)

    return NextResponse.json({ 
      success: true,
      messageId: insertedMessage.id,
      conversationId,
      direction: 'inbound',
      processed: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Mailgun webhook error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Mailgun webhook endpoint active',
    endpoint: '/api/webhooks/mailgun',
    method: 'POST',
    contentType: 'multipart/form-data',
    provider: 'Mailgun',
    documentation: 'https://documentation.mailgun.com/en/latest/user_manual.html#receiving-messages',
    timestamp: new Date().toISOString()
  })
}