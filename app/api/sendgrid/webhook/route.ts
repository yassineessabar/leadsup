import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// SendGrid Event Types
interface SendGridEvent {
  sg_event_id: string
  sg_message_id: string
  event: string
  email: string
  timestamp: number
  smtp_id?: string
  category?: string[]
  asm_group_id?: number
  
  // Bounce/Block specific
  reason?: string
  status?: string
  
  // Click specific
  url?: string
  url_offset?: {
    index: number
    type: string
  }
  
  // Open specific
  useragent?: string
  ip?: string
  
  // Additional metadata
  [key: string]: any
}

// Verify SendGrid webhook signature
function verifySignature(payload: string, signature: string, timestamp: string): boolean {
  const webhookSecret = process.env.SENDGRID_WEBHOOK_SECRET
  
  if (!webhookSecret) {
    console.warn("⚠️ SENDGRID_WEBHOOK_SECRET not configured, skipping signature verification")
    return true // Allow in development, but should be required in production
  }
  
  try {
    // SendGrid signature format: t=timestamp,v1=signature
    const elements = signature.split(',')
    const timestampElement = elements.find(element => element.startsWith('t='))
    const signatureElement = elements.find(element => element.startsWith('v1='))
    
    if (!timestampElement || !signatureElement) {
      return false
    }
    
    const extractedTimestamp = timestampElement.split('=')[1]
    const extractedSignature = signatureElement.split('=')[1]
    
    // Check timestamp (should be within 10 minutes)
    const now = Math.floor(Date.now() / 1000)
    const eventTimestamp = parseInt(extractedTimestamp)
    
    if (Math.abs(now - eventTimestamp) > 600) { // 10 minutes
      console.error("❌ Webhook timestamp too old")
      return false
    }
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(extractedTimestamp + payload)
      .digest('base64')
    
    return crypto.timingSafeEqual(
      Buffer.from(extractedSignature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    )
  } catch (error) {
    console.error("❌ Error verifying SendGrid signature:", error)
    return false
  }
}

// Extract campaign and user info from custom headers or message metadata
async function extractCampaignInfo(event: SendGridEvent): Promise<{userId?: string, campaignId?: string}> {
  try {
    // Method 1: Check for custom headers/categories that contain campaign info
    if (event.category && event.category.length > 0) {
      for (const category of event.category) {
        if (category.startsWith('campaign_')) {
          const campaignId = category.replace('campaign_', '')
          
          // Look up campaign to get user_id
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('user_id')
            .eq('id', campaignId)
            .single()
          
          if (campaign) {
            return { userId: campaign.user_id, campaignId }
          }
        }
        
        if (category.startsWith('user_')) {
          const userId = category.replace('user_', '')
          return { userId }
        }
      }
    }
    
    // Method 2: Look up by email in campaign_senders or email_tracking
    const { data: emailTracking } = await supabase
      .from('email_tracking')
      .select('user_id, campaign_id')
      .eq('sg_message_id', event.sg_message_id)
      .single()
    
    if (emailTracking) {
      return { 
        userId: emailTracking.user_id, 
        campaignId: emailTracking.campaign_id 
      }
    }
    
    // Method 3: Look up by email in contacts table
    const { data: contact } = await supabase
      .from('contacts')
      .select('user_id, campaign_id')
      .eq('email', event.email)
      .single()
    
    if (contact) {
      return { 
        userId: contact.user_id, 
        campaignId: contact.campaign_id 
      }
    }
    
    return {}
  } catch (error) {
    console.error("❌ Error extracting campaign info:", error)
    return {}
  }
}

// Process individual SendGrid event
async function processEvent(event: SendGridEvent) {
  try {
    // Extract campaign and user information
    const { userId, campaignId } = await extractCampaignInfo(event)
    
    if (!userId) {
      console.warn(`⚠️ Could not determine user for event ${event.sg_event_id}`)
      return { success: false, reason: 'user_not_found' }
    }
    
    // Check for duplicate events
    const { data: existingEvent } = await supabase
      .from('sendgrid_events')
      .select('id')
      .eq('sg_event_id', event.sg_event_id)
      .single()
    
    if (existingEvent) {
      return { success: true, reason: 'duplicate_skipped' }
    }
    
    // Prepare event data for storage
    const eventData = {
      user_id: userId,
      campaign_id: campaignId || null,
      sg_message_id: event.sg_message_id,
      sg_event_id: event.sg_event_id,
      event_type: event.event,
      email: event.email,
      timestamp: new Date(event.timestamp * 1000).toISOString(),
      smtp_id: event.smtp_id || null,
      category: event.category || [],
      asm_group_id: event.asm_group_id || null,
      reason: event.reason || null,
      status: event.status || null,
      url: event.url || null,
      user_agent: event.useragent || null,
      ip: event.ip || null,
      event_data: {
        ...event,
        // Remove fields we store separately to avoid duplication
        sg_event_id: undefined,
        sg_message_id: undefined,
        event: undefined,
        email: undefined,
        timestamp: undefined
      }
    }
    
    // Insert event into database
    const { error } = await supabase
      .from('sendgrid_events')
      .insert(eventData)
    
    if (error) {
      console.error("❌ Error inserting SendGrid event:", error)
      return { success: false, reason: 'database_error', error: error.message }
    }
    
    return { success: true, reason: 'processed' }
  } catch (error) {
    console.error("❌ Error processing SendGrid event:", error)
    return { success: false, reason: 'processing_error', error }
  }
}

// POST - Handle SendGrid webhook events
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    
    // Verify webhook signature if secret is configured
    const signature = request.headers.get('X-Twilio-Email-Event-Webhook-Signature')
    const timestamp = request.headers.get('X-Twilio-Email-Event-Webhook-Timestamp')
    
    if (signature && timestamp) {
      if (!verifySignature(rawBody, signature, timestamp)) {
        console.error("❌ Invalid SendGrid webhook signature")
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
    
    // Parse events from body
    let events: SendGridEvent[]
    try {
      events = JSON.parse(rawBody)
    } catch (error) {
      console.error("❌ Invalid JSON in SendGrid webhook:", error)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    
    if (!Array.isArray(events)) {
      console.error("❌ SendGrid webhook body is not an array")
      return NextResponse.json({ error: 'Expected array of events' }, { status: 400 })
    }
    
    console.log(`📬 Received ${events.length} SendGrid events`)
    
    // Process events in batches to avoid overwhelming the database
    const batchSize = 10
    const results = {
      processed: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[]
    }
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (event) => {
        const result = await processEvent(event)
        
        if (result.success) {
          if (result.reason === 'duplicate_skipped') {
            results.skipped++
          } else {
            results.processed++
          }
        } else {
          results.failed++
          results.errors.push({
            event_id: event.sg_event_id,
            error: result.reason,
            details: result.error
          })
        }
        
        return result
      })
      
      await Promise.allSettled(batchPromises)
    }
    
    console.log(`✅ SendGrid webhook processing complete:`, results)
    
    // Return success response (required by SendGrid)
    return NextResponse.json({
      success: true,
      processed: results.processed,
      skipped: results.skipped,
      failed: results.failed,
      ...(results.errors.length > 0 && { errors: results.errors })
    })
    
  } catch (error) {
    console.error("❌ Error handling SendGrid webhook:", error)
    
    // Always return 200 to SendGrid to prevent retries for our errors
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 200 })
  }
}

// GET - Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoint: 'SendGrid Event Webhook'
  })
}