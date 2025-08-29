import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseServer } from '@/lib/supabase'
import crypto from 'crypto'

// SendGrid Event Types
type SendGridEventType = 
  | 'processed' | 'delivered' | 'deferred' | 'bounce' | 'blocked'
  | 'open' | 'click' | 'unsubscribe' | 'group_unsubscribe' | 'spam_report'

interface SendGridEvent {
  event: SendGridEventType
  email: string
  timestamp: number
  sg_message_id: string
  sg_event_id?: string
  smtp_id?: string
  category?: string[]
  asm_group_id?: number
  reason?: string
  status?: string
  url?: string
  useragent?: string
  ip?: string
  
  // Custom fields we can add via SendGrid
  user_id?: string
  campaign_id?: string
  sender_email?: string
  
  // Unique args (custom data passed through)
  unique_args?: {
    user_id?: string
    campaign_id?: string
    sender_email?: string
    [key: string]: any
  }
  
  // Additional event data
  [key: string]: any
}

// Verify SendGrid webhook signature
function verifyWebhookSignature(payload: string, signature: string, timestamp: string): boolean {
  const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY
  
  if (!publicKey) {
    console.warn('⚠️ SENDGRID_WEBHOOK_PUBLIC_KEY not configured, skipping signature verification')
    return true // Allow in development
  }

  try {
    // SendGrid uses ECDSA signature verification
    const timestampPayload = timestamp + payload
    const verify = crypto.createVerify('sha256')
    verify.update(timestampPayload)
    verify.end()
    
    const publicKeyFormatted = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`
    return verify.verify(publicKeyFormatted, signature, 'base64')
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error)
    return false
  }
}

// Extract user context from event data
function extractUserContext(event: SendGridEvent): { userId: string | null; campaignId: string | null; senderEmail: string | null } {
  // Try to extract user_id from different possible locations
  // SendGrid sends custom_args as top-level properties in webhook events
  let userId = event.user_id || event.unique_args?.user_id || (event as any).user_id || null
  let campaignId = event.campaign_id || event.unique_args?.campaign_id || (event as any).campaign_id || null
  let senderEmail = event.sender_email || event.unique_args?.sender_email || (event as any).sender_email || null
  
  // If sender_email not in event, try to extract from categories or other fields
  if (!senderEmail && event.category) {
    // Look for sender email in categories (if you encode it there)
    for (const cat of event.category) {
      if (cat.includes('@')) {
        senderEmail = cat
        break
      }
    }
  }
  
  // If still no sender email, try to infer from smtp_id or other patterns
  if (!senderEmail && event.smtp_id) {
    // Some implementations encode sender info in smtp_id
    const smtpMatch = event.smtp_id.match(/(\w+@[\w.-]+)/);
    if (smtpMatch) {
      senderEmail = smtpMatch[1]
    }
  }
  
  return { userId, campaignId, senderEmail }
}

// Process a single SendGrid event
async function processSendGridEvent(event: SendGridEvent): Promise<void> {
  try {
    const { userId, campaignId, senderEmail } = extractUserContext(event)
    
    // Try to get user_id from sender_email if not provided
    if (!userId && senderEmail) {
      console.log(`🔍 No user_id provided, attempting to lookup from sender_email: ${senderEmail}`)
      
      try {
        const { data: senderAccount, error } = await supabaseServer
          .from('sender_accounts')
          .select('user_id')
          .eq('email', senderEmail)
          .single()
        
        if (!error && senderAccount) {
          userId = senderAccount.user_id
          console.log(`✅ Found user_id from sender lookup: ${userId}`)
        }
      } catch (lookupError) {
        console.warn('⚠️ Could not lookup user_id from sender_email:', lookupError)
      }
    }

    if (!userId) {
      console.warn('⚠️ Skipping event without user_id and failed sender lookup:', event.sg_message_id)
      return
    }

    if (!senderEmail) {
      console.warn('⚠️ Skipping event without sender_email:', event.sg_message_id)
      return
    }

    // Generate unique event ID if not provided
    const eventId = event.sg_event_id || `${event.sg_message_id}_${event.event}_${event.timestamp}`
    
    // Prepare event data for database insertion
    const eventData = {
      user_id: userId,
      campaign_id: campaignId,
      sg_message_id: event.sg_message_id,
      sg_event_id: eventId,
      event_type: event.event,
      email: event.email,
      timestamp: new Date(event.timestamp * 1000).toISOString(),
      event_data: {
        sender_email: senderEmail,
        smtp_id: event.smtp_id,
        category: event.category,
        asm_group_id: event.asm_group_id,
        reason: event.reason,
        status: event.status,
        url: event.url,
        user_agent: event.useragent,
        ip: event.ip,
        unique_args: event.unique_args,
        ...event // Include any additional fields
      },
      smtp_id: event.smtp_id,
      category: event.category,
      asm_group_id: event.asm_group_id,
      reason: event.reason,
      status: event.status,
      url: event.url,
      user_agent: event.useragent,
      ip: event.ip
    }

    console.log('📥 Processing SendGrid event:', {
      event_type: event.event,
      email: event.email,
      sender_email: senderEmail,
      user_id: userId,
      campaign_id: campaignId,
      sg_message_id: event.sg_message_id
    })

    // Insert event into database (this will trigger the metrics update functions)
    const { error } = await supabaseServer
      .from('sendgrid_events')
      .insert(eventData)

    if (error) {
      // Handle duplicate events gracefully
      if (error.code === '23505') { // Unique constraint violation
        console.log('ℹ️ Duplicate event ignored:', eventId)
        return
      }
      
      console.error('❌ Error inserting SendGrid event:', error)
      throw error
    }

    console.log('✅ SendGrid event processed successfully:', eventId)

  } catch (error) {
    console.error('❌ Error processing SendGrid event:', error)
    console.error('Event data:', event)
    throw error
  }
}

// POST - Receive SendGrid webhook events
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const signature = headersList.get('x-twilio-email-event-webhook-signature')
    const timestamp = headersList.get('x-twilio-email-event-webhook-timestamp')
    
    console.log('📨 Received SendGrid events webhook request')
    
    // Get raw body for signature verification
    const rawBody = await request.text()
    
    if (!rawBody) {
      console.error('❌ Empty webhook payload')
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 })
    }

    // Verify webhook signature if configured
    if (signature && timestamp) {
      const isValid = verifyWebhookSignature(rawBody, signature, timestamp)
      if (!isValid) {
        console.error('❌ Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
      console.log('✅ Webhook signature verified')
    } else {
      console.warn('⚠️ No signature headers found, proceeding without verification')
    }

    // Parse events from JSON
    let events: SendGridEvent[]
    try {
      events = JSON.parse(rawBody)
    } catch (error) {
      console.error('❌ Invalid JSON payload:', error)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!Array.isArray(events)) {
      console.error('❌ Payload is not an array of events')
      return NextResponse.json({ error: 'Expected array of events' }, { status: 400 })
    }

    console.log(`📊 Processing ${events.length} SendGrid events`)

    // Process each event
    const results = {
      processed: 0,
      errors: 0,
      skipped: 0
    }

    for (const event of events) {
      try {
        await processSendGridEvent(event)
        results.processed++
      } catch (error) {
        console.error('❌ Error processing individual event:', error)
        results.errors++
      }
    }

    console.log('📈 Webhook processing complete:', results)

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} events`,
      results
    })

  } catch (error) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Health check endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'SendGrid events webhook endpoint is healthy',
    endpoint: '/api/webhooks/sendgrid/events',
    purpose: 'Receives outbound email events from SendGrid for health score calculation',
    timestamp: new Date().toISOString()
  })
}

// Handle other methods
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}