import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { gmail } from 'googleapis'

/**
 * Gmail Pub/Sub Webhook Handler
 * 
 * This endpoint receives notifications from Gmail via Google Cloud Pub/Sub
 * when new emails arrive in monitored Gmail accounts.
 * 
 * Setup required:
 * 1. Enable Gmail API
 * 2. Set up Google Cloud Pub/Sub topic
 * 3. Configure Gmail push notifications
 * 4. Add service account credentials to env
 */

// Verify webhook authenticity (recommended for production)
function verifyGmailWebhook(request: NextRequest): boolean {
  // Add your verification logic here
  // You can verify using:
  // - Google Cloud Pub/Sub message signatures
  // - IP allowlisting
  // - Custom secret tokens
  return true
}

// Generate deterministic conversation ID
function generateConversationId(contactEmail: string, senderEmail: string, campaignId?: string): string {
  const participants = [contactEmail, senderEmail].sort().join('|')
  const base = participants + (campaignId ? `|${campaignId}` : '')
  return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

// Parse Gmail message and extract relevant data
async function parseGmailMessage(gmail: any, messageId: string, userId: string) {
  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    })

    const message = response.data
    const headers = message.payload?.headers || []
    
    // Extract headers
    const getHeader = (name: string) => headers.find((h: any) => 
      h.name?.toLowerCase() === name.toLowerCase()
    )?.value || ''

    const from = getHeader('from')
    const to = getHeader('to')
    const subject = getHeader('subject')
    const messageIdHeader = getHeader('message-id')
    const inReplyTo = getHeader('in-reply-to')
    const references = getHeader('references')
    const date = getHeader('date')

    // Extract email addresses from "Name <email@domain.com>" format
    const extractEmail = (emailString: string) => {
      const match = emailString.match(/<([^>]+)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/)
      return match ? match[1] : emailString
    }

    const fromEmail = extractEmail(from).toLowerCase()
    const toEmail = extractEmail(to).toLowerCase()
    
    // Extract body content
    let bodyText = ''
    let bodyHtml = ''
    
    function extractBody(part: any) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8')
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8')
      } else if (part.parts) {
        part.parts.forEach(extractBody)
      }
    }

    if (message.payload) {
      extractBody(message.payload)
    }

    // Check if this is a reply to one of our campaigns
    let campaignId = null
    let contactId = null
    let isInbound = true

    // Get user's campaign senders to determine direction
    const { data: campaignSenders } = await supabaseServer
      .from('campaign_senders')
      .select('email, campaign_id')
      .eq('user_id', userId)

    const senderEmails = campaignSenders?.map(s => s.email.toLowerCase()) || []
    
    if (senderEmails.includes(fromEmail)) {
      // This is an outbound email from our campaign
      isInbound = false
    } else if (senderEmails.includes(toEmail)) {
      // This is an inbound reply to our campaign
      isInbound = true
      
      // Try to find the campaign from the sender email
      const sender = campaignSenders?.find(s => s.email.toLowerCase() === toEmail)
      if (sender) {
        campaignId = sender.campaign_id
        
        // Try to find the contact
        const { data: contact } = await supabaseServer
          .from('contacts')
          .select('id')
          .eq('email', fromEmail)
          .single()
          
        if (contact) {
          contactId = contact.id
        }
      }
    }

    return {
      messageId: messageIdHeader,
      threadId: message.threadId,
      campaignId,
      contactId,
      contactEmail: isInbound ? fromEmail : toEmail,
      senderEmail: isInbound ? toEmail : fromEmail,
      subject,
      bodyText,
      bodyHtml,
      direction: isInbound ? 'inbound' : 'outbound',
      hasAttachments: (message.payload?.parts?.length || 0) > 1,
      inReplyTo,
      references: references.split(' ').filter(Boolean),
      sentAt: date ? new Date(date).toISOString() : new Date().toISOString(),
      providerData: {
        gmailMessageId: messageId,
        gmailThreadId: message.threadId,
        labelIds: message.labelIds || []
      }
    }
  } catch (error) {
    console.error('Error parsing Gmail message:', error)
    throw error
  }
}

// Process incoming Gmail webhook
export async function POST(request: NextRequest) {
  try {
    console.log('📨 Gmail webhook received')

    // Verify webhook authenticity
    if (!verifyGmailWebhook(request)) {
      console.error('❌ Gmail webhook verification failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse Pub/Sub message
    const body = await request.json()
    const pubsubMessage = body.message

    if (!pubsubMessage?.data) {
      console.error('❌ Invalid Pub/Sub message format')
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    // Decode Pub/Sub message data
    const data = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString())
    console.log('📧 Gmail notification data:', data)

    const { emailAddress, historyId } = data

    // Get user from Gmail address
    const { data: gmailAccount, error: accountError } = await supabaseServer
      .from('campaign_senders')
      .select('user_id, access_token, refresh_token')
      .eq('email', emailAddress)
      .eq('auth_type', 'oauth2')
      .single()

    if (accountError || !gmailAccount) {
      console.error('❌ Gmail account not found:', emailAddress)
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Initialize Gmail API with user's credentials
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    auth.setCredentials({
      access_token: gmailAccount.access_token,
      refresh_token: gmailAccount.refresh_token
    })

    const gmailApi = gmail({ version: 'v1', auth })

    // Get recent messages since last history ID
    // For now, we'll get the latest messages (you can implement history tracking)
    const messagesResponse = await gmailApi.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'is:unread' // Only process unread messages
    })

    const messages = messagesResponse.data.messages || []
    console.log(`📬 Processing ${messages.length} messages`)

    for (const message of messages) {
      try {
        // Parse message details
        const messageData = await parseGmailMessage(gmailApi, message.id!, gmailAccount.user_id)
        
        // Generate conversation ID
        const conversationId = generateConversationId(
          messageData.contactEmail,
          messageData.senderEmail,
          messageData.campaignId
        )

        // Check if message already exists
        const { data: existingMessage } = await supabaseServer
          .from('inbox_messages')
          .select('id')
          .eq('message_id', messageData.messageId)
          .eq('user_id', gmailAccount.user_id)
          .single()

        if (existingMessage) {
          console.log(`⏭️ Message ${messageData.messageId} already exists, skipping`)
          continue
        }

        // Insert into inbox_messages
        const { data: insertedMessage, error: insertError } = await supabaseServer
          .from('inbox_messages')
          .insert({
            user_id: gmailAccount.user_id,
            message_id: messageData.messageId,
            thread_id: messageData.threadId,
            conversation_id: conversationId,
            campaign_id: messageData.campaignId,
            contact_id: messageData.contactId,
            contact_email: messageData.contactEmail,
            sender_email: messageData.senderEmail,
            subject: messageData.subject,
            body_text: messageData.bodyText,
            body_html: messageData.bodyHtml,
            direction: messageData.direction,
            channel: 'email',
            status: messageData.direction === 'inbound' ? 'unread' : 'sent',
            has_attachments: messageData.hasAttachments,
            in_reply_to: messageData.inReplyTo,
            reference_ids: messageData.references,
            sent_at: messageData.sentAt,
            received_at: new Date().toISOString(),
            provider: 'gmail',
            provider_data: messageData.providerData
          })
          .select()
          .single()

        if (insertError) {
          console.error('❌ Error inserting message:', insertError)
          continue
        }

        console.log(`✅ Processed message: ${messageData.subject}`)

        // Update or create thread
        await supabaseServer
          .from('inbox_threads')
          .upsert({
            user_id: gmailAccount.user_id,
            conversation_id: conversationId,
            thread_id: messageData.threadId,
            campaign_id: messageData.campaignId,
            contact_id: messageData.contactId,
            contact_email: messageData.contactEmail,
            subject: messageData.subject,
            last_message_at: messageData.sentAt,
            last_message_preview: messageData.bodyText?.substring(0, 150) || '',
            status: 'active'
          }, {
            onConflict: 'conversation_id,user_id'
          })

        // If this is an inbound message, trigger any automation workflows
        if (messageData.direction === 'inbound' && messageData.campaignId) {
          // TODO: Trigger N8N workflow for prospect response
          console.log(`🤖 Prospect replied to campaign ${messageData.campaignId}`)
        }

      } catch (messageError) {
        console.error(`❌ Error processing message ${message.id}:`, messageError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: messages.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Gmail webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle GET for webhook verification (if needed)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  
  if (challenge) {
    return new Response(challenge)
  }
  
  return NextResponse.json({ 
    status: 'Gmail webhook endpoint active',
    timestamp: new Date().toISOString()
  })
}