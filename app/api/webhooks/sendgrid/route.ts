import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

/**
 * SendGrid Inbound Parse Webhook Handler
 * 
 * This endpoint receives emails forwarded by SendGrid when someone
 * replies to your campaign emails sent to your parse domain.
 */

// Decode quoted-printable encoding
function decodeQuotedPrintable(text: string): string {
  if (!text) return text
  
  return text
    // Decode soft line breaks (=\n)
    .replace(/=\r?\n/g, '')
    // Decode hex-encoded characters (=XX)
    .replace(/=([0-9A-F]{2})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
    // Clean up any remaining quoted-printable artifacts
    .replace(/=$/gm, '')
}

// Extract actual reply content from email
function extractActualReply(text: string): string {
  if (!text) return ''
  
  let cleanText = text
  
  // First, decode quoted-printable
  cleanText = decodeQuotedPrintable(cleanText)
  
  // Remove "Content-Transfer-Encoding" lines and other headers
  cleanText = cleanText.replace(/Content-Transfer-Encoding: .+?\n/gi, '')
  cleanText = cleanText.replace(/Content-Type: .+?\n/gi, '')
  cleanText = cleanText.replace(/MIME-Version: .+?\n/gi, '')
  
  // Find the actual reply by splitting on "On ... wrote:" pattern
  const onWroteMatch = cleanText.match(/(.*?)On .+? wrote:/is)
  if (onWroteMatch) {
    cleanText = onWroteMatch[1].trim()
  }
  
  // Remove quoted lines (lines starting with >)
  const lines = cleanText.split('\n')
  const replyLines = lines.filter(line => {
    const trimmed = line.trim()
    return trimmed && !trimmed.startsWith('>')
  })
  
  let result = replyLines.join('\n').trim()
  
  // Final cleanup - remove any remaining header-like content at the start
  const finalLines = result.split('\n')
  const contentLines = []
  let pastHeaders = false
  
  for (const line of finalLines) {
    const trimmed = line.trim()
    
    // Skip header-like lines at the start
    if (!pastHeaders) {
      if (trimmed === '' || trimmed.includes('Content-') || trimmed.includes('MIME-') || 
          (trimmed.includes(':') && trimmed.length < 50 && !trimmed.includes(' '))) {
        continue
      }
      pastHeaders = true
    }
    
    contentLines.push(trimmed)
  }
  
  return contentLines.join('\n').trim()
}

// Parse raw email content to extract message body
function parseRawEmail(rawEmail: string): { text: string; html: string } {
  try {
    console.log('🔍 Parsing raw email for content extraction...')
    
    // Split email into sections by double newlines (typical email structure)
    const sections = rawEmail.split('\n\n')
    
    let textContent = ''
    let htmlContent = ''
    let inBody = false
    let currentContentType = ''
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      
      // Check if this section contains content-type headers
      if (section.includes('Content-Type:')) {
        if (section.includes('text/plain')) {
          currentContentType = 'text'
          inBody = true
          continue
        } else if (section.includes('text/html')) {
          currentContentType = 'html'
          inBody = true
          continue
        } else {
          inBody = false
          currentContentType = ''
        }
      }
      
      // If we're in the body section and it's not headers, extract content
      if (inBody && section.trim() && 
          !section.includes('Content-Type:') && 
          !section.includes('Received:') &&
          !section.includes('DKIM-Signature:') &&
          !section.includes('Return-Path:') &&
          !section.startsWith('--')) { // Skip MIME boundaries
        
        if (currentContentType === 'text' && !textContent) {
          textContent = section.trim()
          console.log(`✅ Extracted text content: "${textContent.substring(0, 100)}..."`)
        } else if (currentContentType === 'html' && !htmlContent) {
          htmlContent = section.trim()
          console.log(`✅ Extracted HTML content: "${htmlContent.substring(0, 100)}..."`)
        }
      }
    }
    
    // If no structured content found, try simple extraction
    if (!textContent && !htmlContent) {
      console.log('🔍 No structured content found, trying simple extraction...')
      
      // Look for lines that don't look like headers
      const lines = rawEmail.split('\n')
      let bodyLines: string[] = []
      let pastHeaders = false
      
      for (const line of lines) {
        // Skip header section
        if (!pastHeaders) {
          if (line.trim() === '') {
            pastHeaders = true
          }
          continue
        }
        
        // Skip lines that look like email infrastructure
        if (!line.includes('Received:') && 
            !line.includes('DKIM-Signature:') &&
            !line.includes('Content-Type:') &&
            !line.includes('Return-Path:') &&
            !line.startsWith('--') &&
            line.trim().length > 0) {
          bodyLines.push(line)
        }
      }
      
      if (bodyLines.length > 0) {
        textContent = bodyLines.join('\n').trim()
        console.log(`✅ Extracted simple text: "${textContent.substring(0, 100)}..."`)
      }
    }
    
    return { text: textContent, html: htmlContent }
    
  } catch (error) {
    console.error('❌ Error parsing raw email:', error)
    return { text: '', html: '' }
  }
}

// Parse multipart form data from SendGrid
async function parseFormData(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Debug: Log all form fields that SendGrid sent
    console.log('📝 ALL SendGrid form fields:')
    console.log('========================================')
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        console.log(`🔍 Field: ${key}`)
        console.log(`   Type: string`)
        console.log(`   Length: ${value.length}`)
        console.log(`   Content: "${value.substring(0, 200)}${value.length > 200 ? '...' : ''}"`)
        console.log('')
      } else {
        console.log(`🔍 Field: ${key}`)
        console.log(`   Type: File object`)
        console.log('')
      }
    }
    console.log('========================================')
    
    // Extract all the fields SendGrid sends
    const envelope = formData.get('envelope') as string
    const parsedEnvelope = envelope ? JSON.parse(envelope) : {}
    
    // Check for SendGrid's standard parsed fields first
    let textContent = (formData.get('text') as string) || ''
    let htmlContent = (formData.get('html') as string) || ''
    
    console.log(`📋 Standard SendGrid fields:`)
    console.log(`   text field: ${textContent.length} characters`)
    console.log(`   html field: ${htmlContent.length} characters`)
    
    // If standard fields are empty, check if SendGrid is using "Send Raw" mode
    const rawEmail = formData.get('email') as string
    if ((!textContent && !htmlContent) && rawEmail) {
      console.log('🔍 Standard fields empty, checking raw email field...')
      console.log(`   Raw email field: ${rawEmail.length} characters`)
      
      // Parse the raw email to extract the actual message content
      const parsedContent = parseRawEmail(rawEmail)
      textContent = parsedContent.text
      htmlContent = parsedContent.html
      
      console.log('📧 Parsed from raw email:')
      console.log(`   Extracted text: ${textContent.length} characters`)
      console.log(`   Extracted HTML: ${htmlContent.length} characters`)
    }
    
    // If still no content, try alternative field names
    if (!textContent && !htmlContent) {
      console.log('🔍 No content in standard or raw fields, checking alternatives...')
      
      const possibleTextFields = [
        'body', 'plain', 'body-plain', 'stripped-text', 'stripped-plain',
        'body_text', 'text_body', 'content', 'message', 'reply',
        'stripped-signature', 'body_stripped'
      ]
      
      const possibleHtmlFields = [
        'body-html', 'html-body', 'stripped-html', 'body_html', 
        'html_body', 'content_html', 'message_html'
      ]
      
      // Try to find text content in alternative fields
      for (const field of possibleTextFields) {
        const value = formData.get(field) as string
        if (value && value.trim()) {
          textContent = value
          console.log(`✅ Found text content in field: ${field}`)
          break
        }
      }
      
      // Try to find HTML content in alternative fields  
      for (const field of possibleHtmlFields) {
        const value = formData.get(field) as string
        if (value && value.trim()) {
          htmlContent = value
          console.log(`✅ Found HTML content in field: ${field}`)
          break
        }
      }
    }
    
    // If still no content, try extracting from any field that contains actual message content
    if (!textContent && !htmlContent) {
      console.log('🔍 No content in standard fields, checking all fields for actual message content...')
      
      // Fields to exclude - these contain metadata, not actual email content
      const excludedFields = [
        'envelope', 'headers', 'spam_report', 'charsets', 'attachments',
        'dkim', 'spf', 'spam_score', 'from', 'to', 'subject', 'cc', 'bcc'
      ]
      
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string' && value.length > 10 && 
            !excludedFields.includes(key.toLowerCase())) {
          
          // Check if this looks like email headers vs actual content
          const looksLikeHeaders = value.includes('Received: from') || 
                                   value.includes('Return-Path:') ||
                                   value.includes('DKIM-Signature:') ||
                                   value.includes('X-Google-DKIM-Signature:') ||
                                   value.match(/^[A-Za-z-]+:\s/m) // Starts with header pattern
          
          if (!looksLikeHeaders) {
            console.log(`🔍 Potential message content in field "${key}": "${value.substring(0, 100)}..."`)
            if (!textContent && value.length > 0) {
              textContent = value
              console.log(`✅ Using message content from field: ${key}`)
            }
          } else {
            console.log(`⏭️ Skipping field "${key}" - contains email headers, not message content`)
          }
        }
      }
      
      // If we still have no content, log all available fields for debugging
      if (!textContent && !htmlContent) {
        console.log('🚨 No content found in any field. Available fields:')
        for (const [key, value] of formData.entries()) {
          if (typeof value === 'string') {
            console.log(`   ${key}: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`)
          }
        }
      }
    }
    
    console.log('🔍 Content extraction:')
    console.log(`   text length: ${textContent.length}`)
    console.log(`   html length: ${htmlContent.length}`)
    console.log(`   text preview: "${textContent.substring(0, 100)}"`)
    console.log(`   html preview: "${htmlContent.substring(0, 100)}"`)
    
    return {
      from: formData.get('from') as string || '',
      to: formData.get('to') as string || '',
      subject: formData.get('subject') as string || '',
      text: textContent,
      html: htmlContent,
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
  try {
    console.log(`📝 generateConversationId called with:`)
    console.log(`   contactEmail: "${contactEmail}" (${typeof contactEmail})`)
    console.log(`   senderEmail: "${senderEmail}" (${typeof senderEmail})`)
    console.log(`   campaignId: "${campaignId}" (${typeof campaignId})`)
    
    // Ensure we have valid string inputs
    const safeContactEmail = String(contactEmail || '')
    const safeSenderEmail = String(senderEmail || '')
    const safeCampaignId = String(campaignId || '')
    
    const participants = [safeContactEmail, safeSenderEmail].sort().join('|')
    const base = participants + (safeCampaignId ? `|${safeCampaignId}` : '')
    const base64 = Buffer.from(base).toString('base64')
    const cleaned = base64.replace(/[^a-zA-Z0-9]/g, '')
    
    // Ensure we have at least 32 characters, pad if necessary
    const padded = cleaned.length >= 32 ? cleaned : cleaned.padEnd(32, '0')
    const result = String(padded).substring(0, 32)
    
    console.log(`📝 Conversation ID steps:`)
    console.log(`   participants: "${participants}"`)
    console.log(`   base: "${base}"`)
    console.log(`   base64: "${base64}"`)
    console.log(`   cleaned: "${cleaned}"`)
    console.log(`   result: "${result}" (length: ${result.length})`)
    
    // Validate result
    if (typeof result !== 'string' || result.length !== 32) {
      throw new Error(`Invalid conversation ID generated: "${result}" (type: ${typeof result}, length: ${result?.length})`)
    }
    
    return result
  } catch (error) {
    console.error('❌ Error in generateConversationId:', error)
    // Fallback to a simple hash
    const fallback = `fallback${Date.now()}`.substring(0, 32).padEnd(32, '0')
    console.log(`🚨 Using fallback conversation ID: "${fallback}"`)
    return fallback
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 SendGrid Inbound Parse webhook received')
    
    // Parse the form data from SendGrid
    const emailData = await parseFormData(request)
    
    console.log('📧 SendGrid parsed data:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasText: !!emailData.text,
      hasHtml: !!emailData.html,
      attachments: emailData.attachments
    })
    
    // Extract clean email addresses
    const fromEmail = extractEmail(emailData.envelope.from || emailData.from)
    const toEmails = emailData.envelope.to || [extractEmail(emailData.to)]
    const toEmail = Array.isArray(toEmails) ? toEmails[0] : toEmails
    
    console.log(`📧 Processing email from ${fromEmail} to ${toEmail}`)
    console.log(`   Subject: "${emailData.subject}"`)
    
    // Find which campaign sender this email is responding to
    console.log(`🔍 Looking for campaign_sender with email: "${toEmail}"`)
    const { data: campaignSenders, error: senderError } = await supabaseServer
      .from('campaign_senders')
      .select('id, user_id, campaign_id')
      .eq('email', toEmail)
    
    console.log('🔍 Campaign sender query result:', { campaignSenders, senderError })
    
    if (senderError || !campaignSenders || campaignSenders.length === 0) {
      console.log(`⏭️ Email to ${toEmail} is not for a campaign sender, ignoring`)
      // Return success to SendGrid so it doesn't retry
      return NextResponse.json({ 
        success: true, 
        message: 'Not a campaign email, ignored' 
      })
    }
    
    // Use the first campaign sender if multiple exist
    const campaignSender = campaignSenders[0]
    if (campaignSenders.length > 1) {
      console.log(`⚠️ Multiple campaign senders found for ${toEmail}, using first one: Campaign ${campaignSender.campaign_id}`)
    }
    
    console.log(`✅ Found campaign sender: User ${campaignSender.user_id}, Campaign ${campaignSender.campaign_id}`)
    
    // Check if this contact exists
    let contactId = null
    try {
      const { data: contact, error: contactError } = await supabaseServer
        .from('contacts')
        .select('id')
        .eq('email', fromEmail)
        .single()
      
      console.log(`🔍 Contact lookup result:`, { contact, contactError })
      
      // Validate that contact ID is a proper UUID or null
      if (contact?.id && typeof contact.id === 'string' && contact.id.length === 36) {
        contactId = contact.id
      } else {
        console.log(`⚠️ Invalid or missing contact ID: ${contact?.id}`)
        contactId = null
      }
    } catch (contactError) {
      console.log(`⚠️ Contact lookup failed:`, contactError)
      contactId = null
    }
    
    console.log(`📋 Final contactId: ${contactId} (type: ${typeof contactId})`)
    
    // Generate conversation ID for threading
    console.log(`🔍 Generating conversation ID for:`)
    console.log(`   fromEmail: ${fromEmail}`)
    console.log(`   toEmail: ${toEmail}`) 
    console.log(`   campaignId: ${campaignSender.campaign_id} (type: ${typeof campaignSender.campaign_id})`)
    
    const conversationId = generateConversationId(fromEmail, toEmail, campaignSender.campaign_id.toString())
    const messageId = `sendgrid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`🔗 Generated Conversation ID: "${conversationId}" (type: ${typeof conversationId}, length: ${conversationId?.length})`)
    
    // Check spam score
    const spamScore = parseFloat(emailData.spam_score || '0')
    if (spamScore > 5) {
      console.log(`⚠️ High spam score: ${spamScore}`)
    }
    
    // Create or update thread FIRST (required for foreign key constraint)
    // Ensure all UUIDs are strings and valid
    const safeUserId = String(campaignSender.user_id)
    const safeCampaignId = String(campaignSender.campaign_id)
    const safeContactId = contactId ? String(contactId) : null
    
    const threadInsertData = {
      user_id: safeUserId,
      conversation_id: String(conversationId), // Ensure string
      campaign_id: safeCampaignId,
      contact_id: safeContactId,
      contact_email: String(fromEmail),
      subject: String(emailData.subject || ''),
      last_message_at: new Date().toISOString(),
      last_message_preview: String(extractActualReply(emailData.text) || emailData.text || '').substring(0, 150),
      status: 'active' as const
    }
    
    console.log(`🧵 Creating thread with data:`)
    Object.entries(threadInsertData).forEach(([key, value]) => {
      console.log(`   ${key}: "${value}" (${typeof value})`)
    })
    
    const { data: threadData, error: threadError } = await supabaseServer
      .from('inbox_threads')
      .upsert(threadInsertData, {
        onConflict: 'conversation_id,user_id'
      })
    
    if (threadError) {
      console.error('❌ Error creating thread:', threadError)
      console.error('❌ Full thread error details:', JSON.stringify(threadError, null, 2))
      
      // Try to continue without thread creation for debugging
      console.log('🚨 Attempting to proceed without thread creation for debugging...')
      
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create thread',
        debug: threadError.message,
        threadData: threadInsertData,
        conversationId: conversationId,
        fullError: threadError
      }, { status: 500 })
    }
    
    console.log(`✅ Thread created/updated for conversation ${conversationId}`)
    
    // Store the inbound message
    const messageInsertData = {
      user_id: safeUserId,
      message_id: String(messageId),
      conversation_id: String(conversationId),
      campaign_id: safeCampaignId,
      contact_id: safeContactId,
      contact_email: String(fromEmail),
      sender_id: String(campaignSender.id),
      sender_email: String(toEmail),
      subject: String(emailData.subject || ''),
      body_text: String(extractActualReply(emailData.text) || emailData.text || ''),
      body_html: String(extractActualReply(emailData.html) || emailData.html || ''),
      direction: 'inbound' as const,
      channel: 'email' as const,
      status: 'unread' as const,
      folder: 'inbox' as const,
      has_attachments: parseInt(String(emailData.attachments || '0')) > 0,
      provider: 'smtp' as const,
      provider_data: {
        spam_score: spamScore,
        spam_report: String(emailData.spam_report || ''),
        headers: String(emailData.headers || ''),
        envelope: emailData.envelope || {},
        charsets: JSON.parse(String(emailData.charsets || '{}'))
      },
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString()
    }
    
    console.log(`📨 Creating message with data:`)
    Object.entries(messageInsertData).forEach(([key, value]) => {
      console.log(`   ${key}: "${JSON.stringify(value)}" (${typeof value})`)
    })
    
    const { data: message, error: insertError } = await supabaseServer
      .from('inbox_messages')
      .insert(messageInsertData)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Error storing message:', insertError)
      console.error('❌ Insert error details:', JSON.stringify(insertError, null, 2))
      // Return success to SendGrid anyway to prevent retries
      return NextResponse.json({ 
        success: false,
        error: 'Failed to store message but acknowledged',
        debug: insertError.message
      })
    }
    
    console.log(`✅ Message stored successfully: ${message.id}`)
    
    // Update thread with latest message info
    await supabaseServer
      .from('inbox_threads')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: (extractActualReply(emailData.text) || emailData.text || '').substring(0, 150),
        status: 'active'
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', campaignSender.user_id)
    
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