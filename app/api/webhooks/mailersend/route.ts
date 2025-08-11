import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import crypto from 'crypto'

/**
 * MailerSend Webhook Handler
 * 
 * This endpoint receives inbound emails from MailerSend when someone replies
 * to your campaign emails. Supports MailerSend's inbound email webhooks.
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

// Verify MailerSend webhook signature
function verifyMailerSendSignature(body: string, signature: string): boolean {
  const signingSecret = process.env.MAILERSEND_WEBHOOK_SECRET || 'JXRHYr0hEp90BiPoNv1WqSQkrtNTL0Id'
  
  if (!signature) {
    console.log('⚠️  No signature provided, allowing in development')
    return true // Allow during development when no signature
  }
  
  const expectedSignature = crypto.createHmac('sha256', signingSecret)
    .update(body)
    .digest('hex')
  
  console.log('🔐 Signature verification:', signature === expectedSignature ? '✅ Valid' : '❌ Invalid')
  return signature === expectedSignature
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 MailerSend webhook received')

    const body = await request.text()
    const webhookData = JSON.parse(body)
    
    // Get signature for verification (MailerSend uses X-Signature header)
    const signature = request.headers.get('x-signature') || request.headers.get('mailersend-signature') || ''
    
    console.log('📧 MailerSend webhook type:', webhookData.type)
    
    // Handle different webhook types
    if (webhookData.type === 'activity.inbound') {
      // This is an inbound email webhook
      const inboundData = webhookData.data
      
      console.log(`📧 Processing inbound email from ${inboundData.from} to ${inboundData.to}`)
      console.log(`   Subject: "${inboundData.subject}"`)
      
      // Verify signature (optional in development)
      if (!verifyMailerSendSignature(body, signature)) {
        console.error('❌ MailerSend signature verification failed')
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
      }

      // Extract clean email addresses
      const fromEmail = extractEmail(inboundData.from)
      const toEmail = extractEmail(inboundData.to)
      
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

      // Generate conversation ID for threading
      const conversationId = generateConversationId(fromEmail, toEmail, campaignSender.campaign_id)
      
      console.log(`🔗 Conversation ID: ${conversationId}`)

      // Check if message already exists
      const messageId = inboundData.message_id || `mailersend-${Date.now()}-${Math.random()}`
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
          contact_id: null, // Set to null for now
          contact_email: fromEmail,
          sender_email: toEmail,
          subject: inboundData.subject || 'No Subject',
          body_text: inboundData.text || '',
          body_html: inboundData.html || '',
          direction: 'inbound',
          channel: 'email',
          status: 'unread',
          folder: 'inbox',
          has_attachments: inboundData.attachments?.length > 0 || false,
          attachments: inboundData.attachments || [],
          sent_at: inboundData.created_at ? new Date(inboundData.created_at).toISOString() : new Date().toISOString(),
          received_at: new Date().toISOString(),
          provider: 'mailersend',
          provider_data: {
            webhook_type: webhookData.type,
            message_id: inboundData.message_id,
            original_from: inboundData.from,
            original_to: inboundData.to,
            webhook_id: webhookData.webhook_id
          }
        })
        .select()
        .single()

      if (insertError) {
        console.error('❌ Error inserting MailerSend message:', insertError)
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
          contact_id: null,
          contact_email: fromEmail,
          subject: inboundData.subject || 'No Subject',
          last_message_at: inboundData.created_at ? new Date(inboundData.created_at).toISOString() : new Date().toISOString(),
          last_message_preview: (inboundData.text || '').substring(0, 150),
          status: 'active'
        }, {
          onConflict: 'conversation_id,user_id'
        })

      console.log(`✅ Thread updated for conversation ${conversationId}`)

      // Log success
      console.log('📊 MailerSend email capture summary:')
      console.log(`   - From: ${fromEmail}`)
      console.log(`   - To: ${toEmail}`)
      console.log(`   - Subject: ${inboundData.subject}`)
      console.log(`   - Attachments: ${inboundData.attachments?.length || 0}`)
      console.log(`   - Message ID: ${insertedMessage.id}`)
      console.log(`   - Provider: MailerSend`)

      return NextResponse.json({ 
        success: true,
        messageId: insertedMessage.id,
        conversationId,
        direction: 'inbound',
        processed: true,
        timestamp: new Date().toISOString()
      })
      
    } else {
      console.log(`⏭️ Webhook type ${webhookData.type} not handled`)
      return NextResponse.json({ 
        success: true, 
        message: `Webhook type ${webhookData.type} received but not processed` 
      })
    }

  } catch (error) {
    console.error('❌ MailerSend webhook error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'MailerSend webhook endpoint active',
    endpoint: '/api/webhooks/mailersend',
    method: 'POST',
    contentType: 'application/json',
    provider: 'MailerSend',
    supported_events: ['activity.inbound'],
    documentation: 'https://developers.mailersend.com/webhooks.html',
    timestamp: new Date().toISOString()
  })
}