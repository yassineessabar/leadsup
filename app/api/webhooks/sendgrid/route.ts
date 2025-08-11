import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

/**
 * SendGrid Inbound Parse Webhook Handler
 * 
 * This endpoint receives emails forwarded by SendGrid when someone
 * replies to your campaign emails sent to your parse domain.
 */

// Parse multipart form data from SendGrid
async function parseFormData(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract all the fields SendGrid sends
    const envelope = formData.get('envelope') as string
    const parsedEnvelope = envelope ? JSON.parse(envelope) : {}
    
    return {
      from: formData.get('from') as string || '',
      to: formData.get('to') as string || '',
      subject: formData.get('subject') as string || '',
      text: formData.get('text') as string || '',
      html: formData.get('html') as string || '',
      headers: formData.get('headers') as string || '',
      envelope: parsedEnvelope,
      spam_score: formData.get('spam_score') as string || '0',
      spam_report: formData.get('spam_report') as string || '',
      attachments: formData.get('attachments') as string || '0',
      charsets: formData.get('charsets') as string || '{}',
    }
  } catch (error) {
    console.error('Error parsing form data:', error)
    throw error
  }
}

// Extract email address from "Name <email>" format
function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/)
  return match ? match[1].toLowerCase() : emailString.toLowerCase()
}

// Generate deterministic conversation ID
function generateConversationId(contactEmail: string, senderEmail: string, campaignId?: string): string {
  const participants = [contactEmail, senderEmail].sort().join('|')
  const base = participants + (campaignId ? `|${campaignId}` : '')
  return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 SendGrid Inbound Parse webhook received')
    
    // Parse the form data from SendGrid
    const emailData = await parseFormData(request)
    
    // Extract clean email addresses
    const fromEmail = extractEmail(emailData.envelope.from || emailData.from)
    const toEmails = emailData.envelope.to || [extractEmail(emailData.to)]
    const toEmail = Array.isArray(toEmails) ? toEmails[0] : toEmails
    
    console.log(`📧 Processing email from ${fromEmail} to ${toEmail}`)
    console.log(`   Subject: "${emailData.subject}"`)
    
    // Find which campaign sender this email is responding to
    const { data: campaignSender, error: senderError } = await supabaseServer
      .from('campaign_senders')
      .select('user_id, campaign_id')
      .eq('email', toEmail)
      .single()
    
    if (senderError || !campaignSender) {
      console.log(`⏭️ Email to ${toEmail} is not for a campaign sender, ignoring`)
      // Return success to SendGrid so it doesn't retry
      return NextResponse.json({ 
        success: true, 
        message: 'Not a campaign email, ignored' 
      })
    }
    
    console.log(`✅ Found campaign sender: User ${campaignSender.user_id}, Campaign ${campaignSender.campaign_id}`)
    
    // Check if this contact exists
    const { data: contact } = await supabaseServer
      .from('contacts')
      .select('id')
      .eq('email', fromEmail)
      .single()
    
    const contactId = contact?.id || null
    
    // Generate conversation ID for threading
    const conversationId = generateConversationId(fromEmail, toEmail, campaignSender.campaign_id)
    const messageId = `sendgrid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`🔗 Conversation ID: ${conversationId}`)
    
    // Check spam score
    const spamScore = parseFloat(emailData.spam_score || '0')
    if (spamScore > 5) {
      console.log(`⚠️ High spam score: ${spamScore}`)
    }
    
    // Store the inbound message
    const { data: message, error: insertError } = await supabaseServer
      .from('inbox_messages')
      .insert({
        user_id: campaignSender.user_id,
        message_id: messageId,
        conversation_id: conversationId,
        campaign_id: campaignSender.campaign_id,
        contact_id: contactId,
        contact_email: fromEmail,
        sender_email: toEmail,
        subject: emailData.subject,
        body_text: emailData.text,
        body_html: emailData.html,
        direction: 'inbound',
        channel: 'email',
        status: 'unread',
        folder: 'inbox',
        has_attachments: parseInt(emailData.attachments) > 0,
        provider: 'sendgrid',
        provider_data: {
          spam_score: spamScore,
          spam_report: emailData.spam_report,
          headers: emailData.headers,
          envelope: emailData.envelope,
          charsets: JSON.parse(emailData.charsets || '{}')
        },
        sent_at: new Date().toISOString(),
        received_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Error storing message:', insertError)
      // Return success to SendGrid anyway to prevent retries
      return NextResponse.json({ 
        success: false,
        error: 'Failed to store message but acknowledged' 
      })
    }
    
    console.log(`✅ Message stored successfully: ${message.id}`)
    
    // Update or create thread
    await supabaseServer
      .from('inbox_threads')
      .upsert({
        user_id: campaignSender.user_id,
        conversation_id: conversationId,
        campaign_id: campaignSender.campaign_id,
        contact_id: contactId,
        contact_email: fromEmail,
        subject: emailData.subject,
        last_message_at: new Date().toISOString(),
        last_message_preview: (emailData.text || '').substring(0, 150),
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })
    
    console.log(`✅ Thread updated for conversation ${conversationId}`)
    
    // Log for monitoring
    console.log('📊 Email capture summary:')
    console.log(`   - From: ${fromEmail}`)
    console.log(`   - To: ${toEmail}`)
    console.log(`   - Subject: ${emailData.subject}`)
    console.log(`   - Spam Score: ${spamScore}`)
    console.log(`   - Has Attachments: ${parseInt(emailData.attachments) > 0}`)
    console.log(`   - Stored as: ${message.id}`)
    
    // Return success to SendGrid
    return NextResponse.json({ 
      success: true,
      messageId: message.id,
      conversationId,
      processed: true,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ SendGrid webhook error:', error)
    // Return success to prevent SendGrid retries for malformed data
    return NextResponse.json({ 
      success: false,
      error: 'Processing failed but acknowledged',
      timestamp: new Date().toISOString()
    })
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'SendGrid Inbound Parse webhook active',
    endpoint: '/api/webhooks/sendgrid',
    method: 'POST',
    contentType: 'multipart/form-data',
    provider: 'SendGrid Inbound Parse',
    documentation: 'https://docs.sendgrid.com/for-developers/parsing-email/inbound-email',
    timestamp: new Date().toISOString()
  })
}