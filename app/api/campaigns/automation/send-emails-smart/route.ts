import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

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
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
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

// Get next available sender for a campaign (with rotation and daily limits)
async function getNextAvailableSender(campaignId: string) {
  try {
    // Get all active senders for this campaign, ordered by rotation priority and last used
    const { data: senders, error } = await supabaseServer
      .from('campaign_senders')
      .select(`
        id, email, name, access_token, refresh_token, app_password, auth_type,
        rotation_priority, last_used_at, emails_sent_today, daily_limit
      `)
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .order('rotation_priority', { ascending: true })
      .order('last_used_at', { ascending: true, nullsFirst: true })

    if (error || !senders || senders.length === 0) {
      throw new Error(`No active senders found for campaign ${campaignId}`)
    }

    // Find sender who hasn't hit daily limit
    const availableSender = senders.find(sender => 
      (sender.emails_sent_today || 0) < (sender.daily_limit || 50)
    )

    if (!availableSender) {
      throw new Error('All senders have reached their daily email limits')
    }

    // Update sender's last_used_at and increment emails_sent_today
    const today = new Date().toISOString().split('T')[0]
    const { error: updateError } = await supabaseServer
      .from('campaign_senders')
      .update({ 
        last_used_at: new Date().toISOString(),
        emails_sent_today: (availableSender.emails_sent_today || 0) + 1
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

// Send email via Gmail API (OAuth2) or SMTP (App Passwords)
async function sendEmail(senderData: any, mailOptions: any) {
  console.log(`📧 Sending email via ${senderData.auth_type === 'oauth2' ? 'Gmail API' : 'SMTP'} for ${senderData.email}`)
  
  try {
    if (senderData.auth_type === 'oauth2' && senderData.access_token) {
      console.log('🔐 Using Gmail API with OAuth2')
      
      // Use nodemailer to create proper email structure, then extract raw for Gmail API
      const nodemailer = require('nodemailer')
      
      // Create a test transport to generate the email
      const testTransport = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      })
      
      // Generate the email using nodemailer
      const info = await testTransport.sendMail(mailOptions)
      const emailMessage = info.message.toString()
      
      // Encode email message in base64url format for Gmail API
      const encodedMessage = Buffer.from(emailMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')

      // Send via Gmail API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${senderData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gmail API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      return {
        messageId: result.id,
        threadId: result.threadId,
        method: 'gmail_api'
      }
      
    } else if (senderData.auth_type === 'app_password' && senderData.app_password) {
      console.log('🔑 Using SMTP with App Password')
      
      const nodemailer = require('nodemailer')
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: senderData.email,
          pass: senderData.app_password
        }
      })
      
      const result = await transporter.sendMail(mailOptions)
      return {
        messageId: result.messageId,
        method: 'smtp'
      }
      
    } else {
      throw new Error(`No valid authentication method available (auth_type: ${senderData.auth_type})`)
    }
  } catch (error) {
    console.error('❌ Error sending email:', error)
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
    const pendingResponse = await fetch(`${request.url.replace('/send-emails-smart', '/process-pending')}`, {
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
      
      // Check if it's business hours for this timezone
      if (!isWithinBusinessHours(timezoneGroup)) {
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

          // Get next available sender with rotation
          let senderData
          try {
            senderData = await getNextAvailableSender(campaignData.id)
            console.log(`🔄 Using rotated sender: ${senderData.email} (sent today: ${senderData.emails_sent_today || 0}/${senderData.daily_limit || 50})`)
          } catch (senderError) {
            console.log(`❌ No available senders: ${senderError}`)
            results.failed++
            results.skipped_sender_limit++
            results.errors.push({
              contact: contact.email,
              error: 'No available senders (daily limits reached)'
            })
            continue
          }

          // Determine authentication method
          if (senderData.access_token && senderData.refresh_token) {
            senderData.auth_type = 'oauth2'
          } else if (senderData.app_password) {
            senderData.auth_type = 'app_password'
          } else {
            console.log(`❌ No valid auth method for ${senderData.email}`)
            results.failed++
            results.errors.push({
              contact: contact.email,
              sender: senderData.email,
              error: 'No valid authentication configured'
            })
            continue
          }

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
            replyTo: 'test@reply.leadsup.io' // All replies go to webhook for capture
          }

          const emailResult = await sendEmail(senderData, mailOptions)
          
          console.log(`✅ Email sent to ${contact.email} - Message ID: ${emailResult.messageId}`)

          // Track success
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
                sender_type: senderData.auth_type,
                method: 'smart_rotation',
                timezone_group: timezoneGroup,
                local_time: new Date().toLocaleString('en-US', { 
                  timeZone: TIMEZONE_CONFIG[timezoneGroup as keyof typeof TIMEZONE_CONFIG].name 
                })
              }
            })

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
        '🔄 Smart sender rotation with daily limits',
        '📧 OAuth Gmail API integration',
        '⏰ Rate limiting between emails'
      ]
    })

  } catch (error) {
    console.error('❌ Error in smart email sending:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}