import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"
import { sendEmailWithSendGrid } from "@/lib/sendgrid"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()
    
    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    console.error("Error in getUserIdFromSession:", err)
    return null
  }
}

// POST - Send a test email from campaign sender
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { senderEmail, testEmail, campaignId } = body

    if (!senderEmail || !testEmail) {
      return NextResponse.json({ 
        success: false, 
        error: "Sender email and test email are required" 
      }, { status: 400 })
    }

    console.log(`🧪 Sending test email from ${senderEmail} to ${testEmail}`)

    // Get sender information - try multiple approaches
    let senderData
    try {
      console.log(`🔍 Looking for sender: ${senderEmail}, campaign: ${campaignId}`)

      // Try 1: Get sender from campaign_senders for this specific campaign
      if (campaignId) {
        const { data: campaignSender, error: campaignError } = await supabaseServer
          .from('campaign_senders')
          .select(`id, email, name, access_token, refresh_token, app_password, auth_type, daily_limit, updated_at`)
          .eq('campaign_id', campaignId)
          .eq('email', senderEmail)
          .eq('is_active', true)
          .single()

        if (!campaignError && campaignSender) {
          console.log('✅ Found sender in campaign_senders for this campaign')
          senderData = campaignSender
        }
      }

      // Try 2: Get sender from campaign_senders for any campaign
      if (!senderData) {
        console.log('🔍 Trying to find sender in any campaign...')
        const { data: anySender, error: anyError } = await supabaseServer
          .from('campaign_senders')
          .select(`id, email, name, access_token, refresh_token, app_password, auth_type, daily_limit, updated_at`)
          .eq('email', senderEmail)
          .eq('is_active', true)
          .limit(1)
          .single()

        if (!anyError && anySender) {
          console.log('✅ Found sender in campaign_senders for any campaign')
          senderData = anySender
        }
      }

      // Try 3: Get sender from sender_accounts table (fallback)
      if (!senderData) {
        console.log('🔍 Trying to find sender in sender_accounts...')
        const { data: senderAccount, error: senderAccountError } = await supabaseServer
          .from('sender_accounts')
          .select(`id, email, display_name as name, daily_limit`)
          .eq('email', senderEmail)
          .limit(1)
          .single()

        if (!senderAccountError && senderAccount) {
          console.log('✅ Found sender in sender_accounts')
          senderData = {
            ...senderAccount,
            auth_type: 'sendgrid', // Default for test emails
            access_token: null,
            refresh_token: null,
            app_password: null,
            updated_at: new Date().toISOString()
          }
        }
      }

      // Try 4: Create a temporary sender object if we still don't have one
      if (!senderData) {
        console.log('⚠️ Creating temporary sender object for test email')
        senderData = {
          id: `temp-${Date.now()}`,
          email: senderEmail,
          name: senderEmail.split('@')[0], // Use email prefix as name
          auth_type: 'sendgrid',
          daily_limit: 50,
          access_token: null,
          refresh_token: null,
          app_password: null,
          updated_at: new Date().toISOString()
        }
      }

    } catch (senderError) {
      console.error('❌ Error finding sender:', senderError)
      return NextResponse.json({ 
        success: false, 
        error: `Error searching for sender: ${senderError instanceof Error ? senderError.message : 'Unknown error'}` 
      }, { status: 500 })
    }

    console.log(`✅ Using sender: ${senderData.email} (${senderData.name || 'No name'})`)

    // Get the first sequence from this campaign to use as test content
    console.log(`🔍 Looking for campaign sequences for campaign: ${campaignId}`)
    
    let sequenceContent = null
    let sequenceSubject = null
    
    if (campaignId) {
      const { data: sequences, error: seqError } = await supabaseServer
        .from('campaign_sequences')
        .select('subject, content')
        .eq('campaign_id', campaignId)
        .order('step_number', { ascending: true })
        .limit(1)
        .single()
        
      if (!seqError && sequences) {
        sequenceContent = sequences.content
        sequenceSubject = sequences.subject
        console.log(`✅ Found sequence: ${sequenceSubject}`)
      } else {
        console.log(`⚠️ No sequences found for campaign, using generic content`)
      }
    }
    
    const timestamp = new Date().toLocaleTimeString()
    
    // Use sequence content if available, otherwise fallback to generic
    let subject, htmlContent
    
    if (sequenceContent && sequenceSubject) {
      // Use actual sequence content
      subject = sequenceSubject
      htmlContent = sequenceContent
      
      // Replace common variables with test values
      const testVariables = {
        firstName: 'John',
        lastName: 'Doe', 
        company: 'Acme Corp',
        title: 'Marketing Manager',
        senderName: senderData.name || senderEmail.split('@')[0]
      }
      
      // Apply variable replacements
      console.log(`🔍 Original sequence content before replacement:`, sequenceContent)
      Object.entries(testVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        subject = subject.replace(regex, value)
        htmlContent = htmlContent.replace(regex, value)
      })
      
      // Convert plain text line breaks to HTML breaks - handle multiple line break formats
      console.log(`🔍 Content has <br> tags:`, htmlContent.includes('<br>'))
      console.log(`🔍 Content has <br/> tags:`, htmlContent.includes('<br/>'))  
      console.log(`🔍 Content has <p> tags:`, htmlContent.includes('<p>'))
      console.log(`🔍 Content includes \\n characters:`, htmlContent.includes('\n'))
      console.log(`🔍 Content raw representation:`, JSON.stringify(htmlContent))
      
      // Always convert line breaks for email compatibility - be more aggressive
      // Handle double line breaks (paragraphs) and single line breaks
      htmlContent = htmlContent
        .replace(/\r\n/g, '\n')  // Convert Windows line breaks
        .replace(/\r/g, '\n')    // Convert Mac line breaks
        .replace(/\n\n+/g, '<br/><br/>')  // Convert paragraph breaks (double+ newlines)
        .replace(/\n/g, '<br/>')  // Convert remaining single newlines
        
      console.log(`🔄 After line break conversion:`, JSON.stringify(htmlContent))
      
      console.log(`🔍 Final HTML content after replacement:`, htmlContent)
      
      // Add test indicator to subject
      subject = `[TEST] ${subject} - ${timestamp}`
      
      // Add test notice to content and ensure proper HTML structure
      htmlContent = `
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
            <strong>🧪 TEST EMAIL:</strong> This is a test of your campaign sequence sent at ${timestamp}. Reply to test the capture functionality!
          </div>
          <div style="margin: 20px 0;">
            ${htmlContent}
          </div>
        </body>
        </html>
      `
      
    } else {
      // Fallback to generic test content
      subject = `Test Email from ${senderData.name || senderEmail} - ${timestamp}`
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🧪 Test Email from LeadsUp Campaign</h2>
          <p>Hi there,</p>
          <p>This is a test email from your LeadsUp campaign system to verify the email integration is working correctly.</p>
          
          <div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">📧 Test Details:</h3>
            <p><strong>Sent from:</strong> ${senderEmail}</p>
            <p><strong>Sender name:</strong> ${senderData.name || 'N/A'}</p>
            <p><strong>Time:</strong> ${timestamp}</p>
            <p><strong>Campaign ID:</strong> ${campaignId || 'N/A'}</p>
          </div>
          
          <p><strong>Please reply to this email to test the reply capture functionality!</strong></p>
          <p>When you reply, your message should appear in both the "Sent" and "Inbox" folders of your LeadsUp dashboard.</p>
          
          <hr style="margin: 20px 0;">
          <p>Best regards,<br>${senderData.name || senderEmail}</p>
          <p style="font-size: 12px; color: #666;">This is an automated test email from LeadsUp Campaign System</p>
        </div>
      `
    }

    try {
      // Get dynamic Reply-To address based on sender domain
      const senderDomain = senderEmail.split('@')[1]
      let replyToEmail = senderEmail // fallback to sender email
      
      try {
        console.log(`🔍 Looking up domain config for: ${senderDomain}`)
        const { data: domainConfig, error: domainError } = await supabaseServer
          .from('domains')
          .select('reply_to_email, domain, dns_records')
          .eq('domain', senderDomain)
          .eq('status', 'verified')
          .single()
          
        console.log(`🔍 Domain query result:`, { domainConfig, domainError })
        
        if (domainConfig && !domainError) {
          const oldReplyTo = replyToEmail
          
          // Use reply_to_email if set, otherwise construct from DNS records
          if (domainConfig.reply_to_email) {
            replyToEmail = domainConfig.reply_to_email
          } else {
            // Look for reply subdomain in DNS records (MX record for reply routing)
            const replyMxRecord = domainConfig.dns_records?.find(record => 
              record.host === 'reply' && record.type === 'MX'
            )
            if (replyMxRecord) {
              replyToEmail = `reply@reply.${domainConfig.domain}`
            }
          }
          
          console.log(`📧 Dynamic Reply-To: ${oldReplyTo} → ${replyToEmail} for domain: ${senderDomain}`)
          console.log(`📧 Domain config:`, domainConfig)
        } else {
          console.log(`⚠️ No verified domain config found for ${senderDomain}, using sender email as Reply-To: ${replyToEmail}`)
          console.log(`⚠️ Domain error:`, domainError)
        }
      } catch (error) {
        console.log(`⚠️ Error fetching domain config for ${senderDomain}:`, error.message)
      }
      
      // ✅ ADD TRACKING TO TEST EMAIL
      const { addEmailTracking, generateTrackingId } = await import('@/lib/email-tracking')
      const trackingId = generateTrackingId()
      
      console.log(`🔍 HTML before tracking (first 500 chars):`, htmlContent.substring(0, 500))
      
      // Add tracking to HTML content
      const trackedHtmlContent = addEmailTracking(htmlContent, { trackingId })
      
      console.log(`📊 Added tracking to test email: ${trackingId}`)
      console.log(`🔍 HTML after tracking (last 500 chars):`, trackedHtmlContent.substring(trackedHtmlContent.length - 500))
      console.log(`✅ Tracking pixel present:`, trackedHtmlContent.includes(`/api/track/open?id=${trackingId}`))
      
      // Send email via SendGrid WITH TRACKING
      const result = await sendEmailWithSendGrid({
        to: testEmail,
        from: senderEmail,
        fromName: senderData.name || senderEmail,
        subject: subject,
        html: trackedHtmlContent, // Use tracked HTML
        text: htmlContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''), // Convert br tags to line breaks, then strip HTML
        replyTo: replyToEmail // Use dynamic reply address based on domain config
      })

      // ✅ LOG TO EMAIL_TRACKING TABLE
      try {
        const trackingInsert = {
          id: trackingId,
          user_id: userId,
          campaign_id: campaignId || null,
          contact_id: null,
          sequence_id: null,
          email: testEmail,
          sg_message_id: result.messageId || `test_${Date.now()}`,
          subject: subject,
          status: 'sent',
          sent_at: new Date().toISOString(),
          category: ['test_email', 'manual_test']
        }
        
        console.log('📊 Inserting tracking record:', trackingInsert)
        
        const { error: insertError } = await supabaseServer
          .from('email_tracking')
          .insert(trackingInsert)
        
        if (insertError) {
          console.error('❌ Error inserting tracking record:', insertError)
        } else {
          console.log(`📊 Logged test email to tracking table: ${trackingId}`)
        }
      } catch (trackingError) {
        console.error('⚠️ Failed to log test email to tracking table:', trackingError)
      }

      console.log(`✅ Test email sent - Message ID: ${result.messageId}`)

      // Log to inbox system for tracking
      try {
        // Generate conversation ID for threading - use replyTo address for consistency
        const generateConversationId = (contactEmail: string, replyToEmail: string) => {
          const participants = [contactEmail, replyToEmail].sort().join('|')
          const base = participants + '|test'
          return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
        }

        // Use dynamic replyTo for conversation ID since that's where replies go
        const conversationId = generateConversationId(testEmail, replyToEmail)

        const inboxMessageData = {
          user_id: userId, // Use current session user_id
          message_id: result.messageId,
          // provider_message_id: result.messageId, // Column doesn't exist, removed
          conversation_id: conversationId,
          campaign_id: campaignId || null,
          contact_email: testEmail,
          contact_name: 'Test Contact',
          sender_email: senderEmail,
          subject: subject,
          body_text: htmlContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''), // Convert br tags to line breaks, then strip HTML
          body_html: htmlContent,
          direction: 'outbound',
          channel: 'email',
          message_type: 'email',
          status: 'read', // Outbound emails are 'read' by definition
          folder: 'sent',
          provider: 'smtp', // Use 'smtp' as per schema constraints
          provider_data: {
            method: 'sendgrid_api',
            sender_type: 'sendgrid',
            test_email: true,
            provider: 'sendgrid'
          },
          sent_at: new Date().toISOString()
        }
        
        // Create inbox thread first
        const { error: threadError } = await supabaseServer
          .from('inbox_threads')
          .upsert({
            user_id: userId,
            conversation_id: conversationId,
            campaign_id: campaignId || null,
            contact_email: testEmail,
            contact_name: 'Test Contact',
            subject: subject,
            last_message_at: new Date().toISOString(),
            last_message_preview: htmlContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').substring(0, 150),
            status: 'active'
          }, {
            onConflict: 'conversation_id,user_id'
          })

        if (threadError) {
          console.error('❌ Error creating inbox thread:', threadError)
        }
        
        // Create inbox message
        const { error: insertError } = await supabaseServer
          .from('inbox_messages')
          .insert(inboxMessageData)

        if (insertError) {
          console.error('❌ Error logging test email to inbox:', insertError)
        } else {
          console.log('✅ Test email logged to inbox system')
        }
      } catch (inboxError) {
        console.error('❌ Failed to log test email to inbox system:', inboxError)
        // Don't fail the API call if inbox logging fails
      }

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: `Test email sent successfully from ${senderEmail} to ${testEmail}`,
        details: {
          from: senderEmail,
          to: testEmail,
          subject: subject,
          timestamp: timestamp
        }
      })

    } catch (sendError) {
      console.error('❌ Error sending test email:', sendError)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to send test email: ${sendError instanceof Error ? sendError.message : 'Unknown error'}` 
      }, { status: 500 })
    }

  } catch (error) {
    console.error("❌ Error in test email API:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}