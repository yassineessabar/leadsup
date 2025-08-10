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

// POST - Send emails directly with JavaScript (no n8n dependency)
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Email API"' } }
    )
  }

  try {
    console.log('📧 Processing email send request...')

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

    console.log(`📧 Found ${contacts.length} emails to send`)

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as any[]
    }

    // Process each contact
    for (const contact of contacts) {
      try {
        const sequence = contact.nextSequence
        const sender = contact.sender

        console.log(`📤 Sending email to ${contact.email} from ${sender.email}`)

        // Get sender OAuth/SMTP credentials from database
        const { data: senderData, error: senderError } = await supabaseServer
          .from('campaign_senders')
          .select(`
            email,
            name,
            access_token,
            refresh_token,
            app_password,
            auth_type,
            token_expires_at
          `)
          .eq('email', sender.email)
          .eq('is_active', true)
          .limit(1)
          .single()

        if (senderError || !senderData) {
          console.log(`❌ No sender data found for ${sender.email}`)
          results.failed++
          results.errors.push({
            contact: contact.email,
            sender: sender.email,
            error: 'Sender not found or inactive'
          })
          continue
        }

        // Replace template variables
        let subject = sequence.subject
          .replace(/{{firstName}}/g, contact.firstName)
          .replace(/{{lastName}}/g, contact.lastName)
          .replace(/{{company}}/g, contact.company)
          .replace(/{{title}}/g, contact.title)
          .replace(/{{senderName}}/g, sender.name)

        let htmlContent = sequence.content
          .replace(/{{firstName}}/g, contact.firstName)
          .replace(/{{lastName}}/g, contact.lastName)
          .replace(/{{company}}/g, contact.company)
          .replace(/{{title}}/g, contact.title)
          .replace(/{{senderName}}/g, sender.name)
          .replace(/\n/g, '<br>')

        // Determine authentication method - prioritize OAuth2 (Gmail API)
        if (senderData.access_token && senderData.refresh_token) {
          console.log(`🔐 Using OAuth2 Gmail API for ${sender.email} (from frontend authentication)`)
          senderData.auth_type = 'oauth2'
        } else if (senderData.app_password) {
          console.log(`🔑 Using App Password SMTP for ${sender.email}`)
          senderData.auth_type = 'app_password'
        } else {
          console.log(`❌ No valid auth method for ${sender.email}`)
          console.log(`   - Has access_token: ${!!senderData.access_token}`)
          console.log(`   - Has refresh_token: ${!!senderData.refresh_token}`)
          console.log(`   - Has app_password: ${!!senderData.app_password}`)
          console.log(`   - Auth type: ${senderData.auth_type}`)
          results.failed++
          results.errors.push({
            contact: contact.email,
            sender: sender.email,
            error: 'No valid authentication configured'
          })
          continue
        }

        console.log(`🐛 DEBUG: Sender ${sender.email} auth method: ${senderData.auth_type}`)
        console.log(`🐛 DEBUG: Will use ${senderData.auth_type === 'oauth2' ? 'Gmail API (OAuth2)' : 'SMTP (App Password)'}`)

        // Send email via Gmail API or SMTP
        const mailOptions = {
          from: `${sender.name} <${sender.email}>`,
          to: contact.email,
          subject: subject,
          html: htmlContent,
          replyTo: sender.email
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
            sender_email: sender.email,
            tracking_data: {
              subject: subject,
              sender_type: senderData.auth_type || 'smtp',
              method: 'nodejs'
            }
          })

        results.sent++

        // Rate limiting - wait 2 seconds between emails
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`❌ Failed to send email to ${contact.email}:`, error)
        
        results.failed++
        results.errors.push({
          contact: contact.email,
          sender: contact.sender?.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        // Track failure
        try {
          await supabaseServer
            .from('prospect_sequence_progress')
            .insert({
              prospect_id: contact.id,
              campaign_id: campaignData.id,
              sequence_id: contact.nextSequence.id,
              status: 'failed',
              sent_at: new Date().toISOString(),
              error_message: error instanceof Error ? error.message : 'Unknown error',
              sender_email: contact.sender?.email,
              tracking_data: {
                method: 'nodejs',
                error_type: 'send_failure'
              }
            })
        } catch (trackError) {
          console.error('❌ Failed to track error:', trackError)
        }
      }
    }

    console.log(`📊 Email sending complete: ${results.sent} sent, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
      processedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in send-emails:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}