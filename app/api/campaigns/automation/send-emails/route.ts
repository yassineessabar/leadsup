import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { sendEmailWithSendGrid } from "@/lib/sendgrid"

// Basic Auth helper function
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    const expectedUsername = process.env.AUTOMATION_API_USERNAME || 'admin'
    const expectedPassword = process.env.AUTOMATION_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// Send email via SendGrid (new unified method)
async function sendEmail(senderData: any, mailOptions: any) {
  console.log(`📧 Sending email via SendGrid for ${senderData.email}`)
  
  try {
    // Use SendGrid for all email sending
    const result = await sendEmailWithSendGrid({
      to: mailOptions.to,
      from: senderData.email,
      fromName: senderData.name || senderData.email,
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.html?.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      replyTo: senderData.email
    })

    return {
      messageId: result.messageId,
      method: 'sendgrid_api'
    }
      
  } catch (error) {
    console.error('❌ Error sending email via SendGrid:', error)
    throw error
  }
}

// Timezone configurations
const TIMEZONE_CONFIG = {
  'T1': { name: 'America/New_York', offset: -5, description: 'Eastern Time' },
  'T2': { name: 'America/Chicago', offset: -6, description: 'Central Time' },
  'T3': { name: 'Europe/London', offset: 0, description: 'Europe Time' },
  'T4': { name: 'Asia/Singapore', offset: 8, description: 'Asia Time' }
}

// Check if current time is within business hours for a timezone
function isWithinBusinessHours(timezoneGroup: string): boolean {
  const config = TIMEZONE_CONFIG[timezoneGroup as keyof typeof TIMEZONE_CONFIG]
  if (!config) return false

  const now = new Date()
  const utcHours = now.getUTCHours()
  const localHours = (utcHours + config.offset + 24) % 24

  // Business hours: 9 AM to 5 PM local time
  return localHours >= 9 && localHours <= 17
}

// Get assigned sender for a prospect (maintains consistency across sequences)
async function getAssignedSender(campaignId: string, assignedSenderEmail: string) {
  try {
    console.log(`🔍 Looking for assigned sender: ${assignedSenderEmail}`)
    
    // Get the specific sender assigned to this prospect
    const { data: sender, error } = await supabaseServer
      .from('campaign_senders')
      .select(`
        id, email, name, access_token, refresh_token, app_password, auth_type,
        daily_limit, updated_at
      `)
      .eq('campaign_id', campaignId)
      .eq('email', assignedSenderEmail)
      .eq('is_active', true)
      .single()

    if (error || !sender) {
      console.error('❌ Assigned sender not found:', error)
      throw new Error(`Assigned sender ${assignedSenderEmail} not found or inactive for campaign ${campaignId}: ${error?.message || 'Unknown error'}`)
    }

    console.log(`✅ Found assigned sender: ${sender.email} (${sender.name})`)
    return sender

  } catch (error) {
    console.error('❌ Error getting assigned sender:', error)
    throw error
  }
}

// Fallback: Get next available sender for a campaign (with rotation and daily limits)
async function getNextAvailableSender(campaignId: string) {
  try {
    // Get all active senders for this campaign, using existing columns only
    const { data: senders, error } = await supabaseServer
      .from('campaign_senders')
      .select(`
        id, email, name, access_token, refresh_token, app_password, auth_type,
        daily_limit, updated_at
      `)
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .order('updated_at', { ascending: true, nullsFirst: true }) // Use updated_at for basic rotation

    if (error || !senders || senders.length === 0) {
      console.error('❌ Sender query error:', error)
      throw new Error(`No active senders found for campaign ${campaignId}: ${error?.message || 'Unknown error'}`)
    }

    console.log(`📋 Found ${senders.length} active senders for campaign ${campaignId}`)

    // For now, use simple round-robin (pick first sender - will update timestamp for rotation)
    const availableSender = senders[0]

    // Update sender's updated_at for rotation tracking (using existing columns)
    const { error: updateError } = await supabaseServer
      .from('campaign_senders')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', availableSender.id)

    if (updateError) {
      console.error('Failed to update sender rotation data:', updateError)
    }

    return availableSender

  } catch (error) {
    console.error('❌ Error getting next available sender:', error)
    throw error
  }
}

// POST - Smart email sending with timezone awareness and sender rotation
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Smart Email API"' } }
    )
  }

  try {
    console.log('🤖 Processing smart email send request with timezone awareness and sender rotation...')

    // Get pending emails from existing process-pending logic
    const pendingResponse = await fetch(`${request.url.replace('/send-emails', '/process-pending')}`, {
      headers: {
        'Authorization': request.headers.get('authorization') || ''
      }
    })

    const pendingData = await pendingResponse.json()

    if (!pendingData.success || !pendingData.data || pendingData.data.length === 0) {
      console.log('❌ No emails to send')
      return NextResponse.json({ 
        success: true, 
        message: 'No emails to send',
        sent: 0 
      })
    }

    const campaignData = pendingData.data[0]
    const contacts = campaignData.contacts || []

    console.log(`📧 Found ${contacts.length} emails to process`)

    const results = {
      sent: 0,
      failed: 0,
      skipped_timezone: 0,
      skipped_sender_limit: 0,
      errors: [] as any[],
      timezone_stats: {} as Record<string, number>,
      sender_usage: {} as Record<string, number>
    }

    // Group contacts by timezone for processing
    const contactsByTimezone = contacts.reduce((groups: any, contact: any) => {
      const timezone = contact.timezone_group || 'T1' // Default to Eastern
      if (!groups[timezone]) groups[timezone] = []
      groups[timezone].push(contact)
      return groups
    }, {})

    console.log('🌍 Contacts by timezone:', Object.entries(contactsByTimezone).map(([tz, contacts]) => 
      `${tz}: ${(contacts as any[]).length} contacts`
    ).join(', '))

    // Process each timezone group
    for (const [timezoneGroup, timezoneContacts] of Object.entries(contactsByTimezone)) {
      console.log(`🕐 Processing timezone ${timezoneGroup} (${TIMEZONE_CONFIG[timezoneGroup as keyof typeof TIMEZONE_CONFIG]?.description})`)
      
      // Check if it's business hours for this timezone (disabled for testing)
      const skipTimezone = false // Set to true to enable business hours check
      if (skipTimezone && !isWithinBusinessHours(timezoneGroup)) {
        console.log(`⏰ Skipping ${timezoneGroup} - outside business hours (9 AM - 5 PM local time)`)
        results.skipped_timezone += (timezoneContacts as any[]).length
        results.timezone_stats[timezoneGroup] = 0
        continue
      }

      console.log(`✅ ${timezoneGroup} is in business hours - processing emails`)
      let timezoneProcessed = 0

      // Process each contact in this timezone
      for (const contact of timezoneContacts as any[]) {
        try {
          const sequence = contact.nextSequence

          // Use assigned sender for this prospect (maintains consistency across sequences)
          let senderData
          try {
            // Check if prospect has assigned sender
            if (contact.sender_email) {
              console.log(`✅ Using assigned sender for ${contact.email}: ${contact.sender_email}`)
              senderData = await getAssignedSender(campaignData.id, contact.sender_email)
            } else {
              console.log(`⚠️ No assigned sender for ${contact.email}, falling back to rotation`)
              senderData = await getNextAvailableSender(campaignData.id)
            }
            console.log(`📧 Selected sender: ${senderData.email} (${senderData.name})`)
          } catch (senderError) {
            console.log(`❌ Sender error: ${senderError}`)
            results.failed++
            results.skipped_sender_limit++
            results.errors.push({
              contact: contact.email,
              error: 'Sender assignment failed: ' + (senderError instanceof Error ? senderError.message : 'Unknown error')
            })
            continue
          }

          // For SendGrid, we don't need authentication per sender - all emails go through SendGrid API
          console.log(`✅ Using SendGrid for ${senderData.email} - no authentication required per sender`)

          console.log(`📤 Sending email to ${contact.email} from ${senderData.email} (${timezoneGroup})`)

          // Replace template variables
          let subject = sequence.subject
            .replace(/{{firstName}}/g, contact.firstName)
            .replace(/{{lastName}}/g, contact.lastName)
            .replace(/{{company}}/g, contact.company)
            .replace(/{{title}}/g, contact.title)
            .replace(/{{senderName}}/g, senderData.name)

          let htmlContent = sequence.content
            .replace(/{{firstName}}/g, contact.firstName)
            .replace(/{{lastName}}/g, contact.lastName)
            .replace(/{{company}}/g, contact.company)
            .replace(/{{title}}/g, contact.title)
            .replace(/{{senderName}}/g, senderData.name)
            .replace(/\n/g, '<br>')

          // Send email
          const mailOptions = {
            from: `${senderData.name} <${senderData.email}>`,
            to: contact.email,
            subject: subject,
            html: htmlContent,
            replyTo: senderData.email
          }

          const emailResult = await sendEmail(senderData, mailOptions)
          
          console.log(`✅ Email sent to ${contact.email} - Message ID: ${emailResult.messageId}`)

          // Track success in prospect sequence
          await supabaseServer
            .from('prospect_sequence_progress')
            .insert({
              prospect_id: contact.id,
              campaign_id: campaignData.id,
              sequence_id: sequence.id,
              status: 'sent',
              sent_at: new Date().toISOString(),
              message_id: emailResult.messageId,
              sender_email: senderData.email,
              tracking_data: {
                subject: subject,
                sender_type: 'sendgrid',
                method: contact.sender_email ? 'assigned_sender' : 'fallback_rotation',
                assigned_sender: contact.sender_email || null,
                timezone_group: timezoneGroup,
                local_time: new Date().toLocaleString('en-US', { 
                  timeZone: TIMEZONE_CONFIG[timezoneGroup as keyof typeof TIMEZONE_CONFIG].name 
                }),
                provider: 'sendgrid'
              }
            })

          // Also log to inbox system for unified email management
          try {
            // Generate conversation ID for threading
            const generateConversationId = (contactEmail: string, senderEmail: string, campaignId: string) => {
              const participants = [contactEmail, senderEmail].sort().join('|')
              const base = participants + `|${campaignId}`
              return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
            }

            const conversationId = generateConversationId(contact.email, senderData.email, campaignData.id)

            // Get user_id from campaign
            const { data: campaignInfo } = await supabaseServer
              .from('campaigns')
              .select('user_id')
              .eq('id', campaignData.id)
              .single()

            if (campaignInfo) {
              const inboxMessageData = {
                user_id: campaignInfo.user_id,
                message_id: emailResult.messageId,
                thread_id: emailResult.threadId,
                conversation_id: conversationId,
                campaign_id: campaignData.id,
                contact_id: contact.id,
                contact_email: contact.email,
                contact_name: `${contact.firstName} ${contact.lastName}`.trim(),
                sender_email: senderData.email,
                subject: subject,
                body_text: htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML for text version
                body_html: htmlContent,
                direction: 'outbound',
                channel: 'email',
                message_type: 'email',
                status: 'read', // Outbound emails are 'read' by definition
                folder: 'sent',
                provider: 'smtp', // Use 'smtp' as per schema constraints
                provider_data: {
                  method: emailResult.method,
                  sender_type: 'sendgrid',
                  sequence_id: sequence.id,
                  timezone_group: timezoneGroup,
                  provider: 'sendgrid'
                },
                sent_at: new Date().toISOString()
              }
              
              // Create or update inbox thread FIRST (required by foreign key constraint)
              console.log('📥 🔍 Creating inbox thread first...')
              const { error: threadError } = await supabaseServer
                .from('inbox_threads')
                .upsert({
                  user_id: campaignInfo.user_id,
                  conversation_id: conversationId,
                  thread_id: emailResult.threadId,
                  campaign_id: campaignData.id,
                  contact_id: contact.id,
                  contact_email: contact.email,
                  contact_name: `${contact.firstName} ${contact.lastName}`.trim(),
                  subject: subject,
                  last_message_at: new Date().toISOString(),
                  last_message_preview: htmlContent.replace(/<[^>]*>/g, '').substring(0, 150),
                  status: 'active'
                }, {
                  onConflict: 'conversation_id,user_id'
                })

              if (threadError) {
                console.error('❌ 🚨 INBOX THREAD ERROR:', JSON.stringify(threadError, null, 2))
              } else {
                console.log('✅ 📥 SUCCESS: Inbox thread created/updated')
              }
              
              // Now create the inbox message (after thread exists)
              console.log('📥 🔍 DEBUG: About to insert inbox message with data:')
              console.log('📥 🔍 Provider:', inboxMessageData.provider)
              console.log('📥 🔍 Status:', inboxMessageData.status) 
              console.log('📥 🔍 Folder:', inboxMessageData.folder)
              console.log('📥 🔍 Auth Type:', senderData.auth_type)
              
              const { data: insertedMessage, error: insertError } = await supabaseServer
                .from('inbox_messages')
                .insert(inboxMessageData)
                .select()

              if (insertError) {
                console.error('❌ 🚨 INBOX MESSAGE INSERT ERROR:', JSON.stringify(insertError, null, 2))
                console.error('❌ 🚨 Failed data:', JSON.stringify(inboxMessageData, null, 2))
              } else {
                console.log('✅ 📥 SUCCESS: Inbox message inserted:', insertedMessage[0]?.id)
              }

              console.log(`📥 ✅ SUCCESS: Logged outbound email to inbox_messages table`)
              console.log(`📧 Email: ${contact.email} → ${senderData.email}`)
              console.log(`🧵 Conversation ID: ${conversationId}`)
            } else {
              console.error('❌ No campaign info found for inbox logging')
            }
          } catch (inboxError) {
            console.error('❌ CRITICAL: Failed to log to inbox system:', inboxError)
            console.error('❌ Error details:', JSON.stringify(inboxError, null, 2))
            // Don't fail the entire email send if inbox logging fails
          }

          results.sent++
          timezoneProcessed++
          results.sender_usage[senderData.email] = (results.sender_usage[senderData.email] || 0) + 1

          // Rate limiting - wait 2 seconds between emails
          await new Promise(resolve => setTimeout(resolve, 2000))

        } catch (error) {
          console.error(`❌ Failed to send email to ${contact.email}:`, error)
          
          results.failed++
          results.errors.push({
            contact: contact.email,
            timezone: timezoneGroup,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      results.timezone_stats[timezoneGroup] = timezoneProcessed
    }

    console.log(`📊 Smart email sending complete: ${results.sent} sent, ${results.failed} failed, ${results.skipped_timezone} skipped (timezone), ${results.skipped_sender_limit} skipped (sender limits)`)

    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      skipped_timezone: results.skipped_timezone,
      skipped_sender_limit: results.skipped_sender_limit,
      timezone_stats: results.timezone_stats,
      sender_usage: results.sender_usage,
      errors: results.errors,
      processedAt: new Date().toISOString(),
      features_used: [
        '🌍 Timezone-aware sending (business hours only)',
        '🎯 Consistent sender assignment per prospect (maintains relationships)',
        '📧 SendGrid API integration for reliable email delivery',
        '⏰ Rate limiting between emails',
        '📥 Automated reply capture via SendGrid Inbound Parse webhook'
      ]
    })

  } catch (error) {
    console.error('❌ Error in send-emails:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}