import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for scheduled processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('testMode') === 'true' || process.env.EMAIL_SIMULATION_MODE === 'true'
    const lookAheadMinutes = parseInt(searchParams.get('lookAhead') || '15') // Default 15 minutes lookahead
    
    console.log('═'.repeat(80))
    console.log('🚀 EMAIL AUTOMATION PROCESSOR STARTED')
    console.log('═'.repeat(80))
    console.log(`⏰ Start Time: ${new Date().toISOString()}`)
    console.log(`🧪 Test Mode: ${testMode}`)
    console.log(`👀 Look Ahead: ${lookAheadMinutes} minutes`)
    console.log(`🌍 Current UTC Hour: ${new Date().getUTCHours()}:00`)
    console.log(`🔧 Code Version: ${new Date().toISOString().slice(0,16)} (Fixed campaignSequences scope)`)
    console.log('─'.repeat(80))
    
    // Get emails that are due within the next 15 minutes (or specified lookahead)
    const now = new Date()
    const lookAheadTime = new Date(now.getTime() + (lookAheadMinutes * 60 * 1000))
    
    // Try to get prospects first (new table with UUID IDs)
    let { data: dueContacts, error: fetchError } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50)

    // Also check contacts table for additional contacts
    console.log('📋 Checking contacts table for additional contacts...')
    
    // Try contacts table (legacy with integer IDs)
    const { data: legacyContacts, error: legacyError } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50)
    
    if (!legacyError && legacyContacts && legacyContacts.length > 0) {
      console.log(`📋 Found ${legacyContacts.length} additional contacts in legacy table`)
      // Convert contacts to prospect format and add to the list
      const convertedContacts = legacyContacts.map(contact => ({
        ...contact,
        email_address: contact.email, // Contacts table uses 'email' field
        id: contact.id.toString(), // Convert integer ID to string
        current_step: contact.sequence_step || 0
      }))
      
      // Merge with existing prospects (avoid duplicates by email)
      if (dueContacts && dueContacts.length > 0) {
        const existingEmails = new Set(dueContacts.map(c => c.email_address))
        const newContacts = convertedContacts.filter(c => !existingEmails.has(c.email_address))
        dueContacts = [...dueContacts, ...newContacts]
        console.log(`📋 Added ${newContacts.length} new contacts from legacy table`)
      } else {
        dueContacts = convertedContacts
      }
    }

    if (!dueContacts || dueContacts.length === 0) {
      console.log('✅ No contacts found for processing')
      return NextResponse.json({
        success: true,
        message: 'No contacts found',
        processed: 0,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`📧 Processing ${dueContacts.length} contacts (${dueContacts[0].id.includes('-') ? 'UUID' : 'Integer'} IDs)`)
    console.log(`🔍 DEBUG: All contacts found:`, dueContacts.map(c => ({ id: c.id, email: c.email_address, campaign: c.campaign_id })))
    
    // Filter contacts who are actually due for their next email
    const emailsDue = []
    let skippedInactiveCampaigns = 0
    let skippedCompletedContacts = 0
    let skippedNotDue = 0
    let skippedTimezone = 0
    let skippedDateCondition = 0
    
    for (const contact of dueContacts) {
      if (!contact.email_address || !contact.campaign_id) continue
      
      // Skip contacts with completed status early
      if (['Completed', 'Replied', 'Unsubscribed', 'Bounced'].includes(contact.status)) {
        console.log(`⏭️ SKIPPED: ${contact.email_address} has status ${contact.status}`)
        skippedCompletedContacts++
        continue
      }
      
      // Get campaign details and ensure it's active
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('id, name, status, user_id')
        .eq('id', contact.campaign_id)
        .single()
      
      if (!campaign) {
        console.log(`❌ Campaign ${contact.campaign_id} not found for ${contact.email_address}`)
        continue
      }
      
      if (campaign.status !== 'Active') {
        console.log(`⏸️ SKIPPED: Campaign "${campaign.name}" is ${campaign.status}, not Active - Contact: ${contact.email_address}`)
        skippedInactiveCampaigns++
        continue
      }
      
      // Get campaign sequences
      const { data: campaignSequences } = await supabase
        .from('campaign_sequences')
        .select('*')
        .eq('campaign_id', contact.campaign_id)
        .order('step_number', { ascending: true })
      
      if (!campaignSequences || campaignSequences.length === 0) continue
      
      // Determine current step based on sent emails from progression records
      let currentStep = 0
      let lastSentAt = null
      const isUUID = contact.id.includes('-')
      
      if (isUUID) {
        // For UUID contacts (prospects table), read from progression records
        const { data: sentProgress } = await supabase
          .from('prospect_sequence_progress')
          .select('*')
          .eq('prospect_id', contact.id)
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })
        
        currentStep = sentProgress?.length || 0
        lastSentAt = sentProgress?.[0]?.sent_at || null
        console.log(`📊 Contact ${contact.email_address}: Found ${currentStep} sent emails, last sent: ${lastSentAt}`)
      } else {
        // For integer contacts (legacy table), check email_tracking for actual sent emails
        const { data: emailTracking } = await supabase
          .from('email_tracking')
          .select('*')
          .eq('contact_id', contact.id.toString())
          .eq('campaign_id', contact.campaign_id)
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })
        
        currentStep = emailTracking?.length || 0
        lastSentAt = emailTracking?.[0]?.sent_at || null
        console.log(`📊 Contact ${contact.email_address}: Found ${currentStep} sent emails in tracking, last sent: ${lastSentAt}`)
      }
      
      // Check if sequence is complete
      if (currentStep >= campaignSequences.length) {
        console.log(`✅ Contact ${contact.email_address}: Sequence complete (${currentStep}/${campaignSequences.length})`)
        continue
      }
      
      // Get the next sequence to send
      const nextSequence = campaignSequences[currentStep]
      if (!nextSequence) {
        console.log(`❌ No sequence found for step ${currentStep + 1}`)
        continue
      }
      
      // Calculate when this specific email should be sent
      let scheduledDate
      const nextSequenceTiming = nextSequence.timing_days || 0
      
      if (currentStep === 0) {
        // First email: schedule based on contact creation + timing_days
        scheduledDate = new Date(contact.created_at)
        scheduledDate.setDate(scheduledDate.getDate() + nextSequenceTiming)
      } else if (lastSentAt) {
        // Subsequent emails: schedule based on last email sent + timing_days
        scheduledDate = new Date(lastSentAt)
        scheduledDate.setDate(scheduledDate.getDate() + nextSequenceTiming)
      } else {
        console.log(`⚠️ No last sent date found for ${contact.email_address}, cannot calculate timing`)
        continue
      }
      
      // Add business hours (9-17, avoid weekends) with timezone awareness
      const contactHash = String(contact.id).split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0)
      }, 0)
      const seedValue = (contactHash + (currentStep + 1)) % 1000
      const hour = 9 + (seedValue % 8) // 9-16
      const minute = (seedValue * 7) % 60
      scheduledDate.setHours(hour, minute, 0, 0)
      
      // Check if contact is in a timezone where it's currently outside business hours
      let skipForTimezone = false
      let timezoneReason = ''
      const now = new Date()
      const currentHour = now.getUTCHours()
      
      // Define timezone mappings for major locations (using August offsets - daylight saving time)
      const timezoneMap = {
        'Tokyo': { offset: 9, name: 'JST' },
        'Sydney': { offset: 10, name: 'AEST' }, // August is winter in Sydney (AEST, not AEDT)
        'London': { offset: 1, name: 'BST' }, // British Summer Time in August
        'New York': { offset: -4, name: 'EDT' }, // Eastern Daylight Time in August
        'Los Angeles': { offset: -7, name: 'PDT' }, // Pacific Daylight Time in August
        'Chicago': { offset: -5, name: 'CDT' }, // Central Daylight Time in August
        'Boston': { offset: -4, name: 'EDT' }, // Eastern Daylight Time in August
        'Seattle': { offset: -7, name: 'PDT' }, // Pacific Daylight Time in August
        'Miami': { offset: -4, name: 'EDT' }, // Eastern Daylight Time in August
        'Denver': { offset: -6, name: 'MDT' }, // Mountain Daylight Time in August
        'Phoenix': { offset: -7, name: 'MST' } // Arizona doesn't observe DST
      }
      
      // Find timezone info for contact's location
      let timezoneInfo = null
      if (contact.location) {
        // Check for exact matches or partial matches
        for (const [city, info] of Object.entries(timezoneMap)) {
          if (contact.location.includes(city)) {
            timezoneInfo = { city, ...info }
            break
          }
        }
      }
      
      if (timezoneInfo) {
        // Calculate local time for the contact's location
        const localHour = (currentHour + timezoneInfo.offset + 24) % 24
        timezoneReason = `${timezoneInfo.city} timezone: ${localHour}:00 ${timezoneInfo.name} (business hours: 8-18)`
        
        if (localHour < 8 || localHour >= 18) {
          skipForTimezone = true
          console.log(`🌏 TIMEZONE BLOCK: ${contact.email_address} - ${timezoneReason} - OUTSIDE business hours`)
        } else {
          console.log(`🌏 TIMEZONE OK: ${contact.email_address} - ${timezoneReason} - INSIDE business hours`)
        }
      } else {
        // For unknown locations, assume friendly timezone (US Eastern Daylight Time as default)
        const defaultHour = (currentHour - 4 + 24) % 24 // EDT = UTC-4 in August
        timezoneReason = `Location: ${contact.location || 'Unknown'} - defaulting to US Eastern: ${defaultHour}:00 EDT`
        
        if (defaultHour < 8 || defaultHour >= 18) {
          skipForTimezone = true
          console.log(`🌏 TIMEZONE BLOCK: ${contact.email_address} - ${timezoneReason} - OUTSIDE business hours`)
        } else {
          console.log(`🌍 TIMEZONE DEFAULT: ${contact.email_address} - ${timezoneReason} - INSIDE business hours`)
        }
      }
      
      // Skip weekends
      const dayOfWeek = scheduledDate.getDay()
      if (dayOfWeek === 0) scheduledDate.setDate(scheduledDate.getDate() + 1)
      if (dayOfWeek === 6) scheduledDate.setDate(scheduledDate.getDate() + 2)
      
      // Check if email is due (scheduled date/time has passed)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of today
      const emailDate = new Date(scheduledDate)
      emailDate.setHours(0, 0, 0, 0) // Start of email date
      const emailDateIsDueOrPast = emailDate <= today // Email is due if scheduled date is today or in the past
      
      // Check if it's time to send this email
      const shouldProcess = !skipForTimezone && scheduledDate <= now && emailDateIsDueOrPast
      
      console.log(`\n📋 PROCESSING DECISION FOR: ${contact.email_address}`)
      console.log(`├─ Current Step: ${currentStep + 1}/${campaignSequences.length}`)
      const totalSequences = campaignSequences.length
      console.log(`├─ Timing Days: ${nextSequenceTiming} days`)
      console.log(`├─ Scheduled Date: ${scheduledDate.toISOString()}`)
      console.log(`├─ Current Time: ${now.toISOString()}`)
      console.log(`├─ Is Due: ${scheduledDate <= now ? '✅ YES' : '❌ NO'} (${Math.round((now - scheduledDate) / (1000 * 60))} minutes ${scheduledDate <= now ? 'overdue' : 'remaining'})`)
      console.log(`├─ Email Date Check: ${emailDateIsDueOrPast ? '✅ DUE OR PAST' : '❌ NOT DUE YET'} (${emailDate.toDateString()} vs ${today.toDateString()})`)
      console.log(`├─ Timezone Check: ${skipForTimezone ? '❌ BLOCKED' : '✅ OK'} (${timezoneReason})`)
      console.log(`├─ Weekend Check: ${dayOfWeek === 0 || dayOfWeek === 6 ? '⚠️ WEEKEND' : '✅ WEEKDAY'}`)
      console.log(`└─ FINAL DECISION: ${shouldProcess ? '✅ PROCESS (ADD TO QUEUE)' : '❌ SKIP'}`)
      
      if (shouldProcess) {
        emailsDue.push({
          contact,
          campaign,
          sequence: nextSequence,
          scheduledFor: scheduledDate.toISOString(),
          currentStep: currentStep + 1, // Next step number
          totalSequences: totalSequences
        })
        console.log(`📧 Added to queue: ${contact.email_address} - Step ${currentStep + 1} (${nextSequence.subject}) - Timing: ${nextSequenceTiming} days`)
      } else {
        if (skipForTimezone) {
          skippedTimezone++
        } else if (!emailDateIsDueOrPast) {
          console.log(`📅 DATE CONDITION FAILED: ${contact.email_address} - Email date ${emailDate.toDateString()} is scheduled for future (after today ${today.toDateString()})`)
          skippedDateCondition++
        } else {
          console.log(`⏰ NOT DUE: ${contact.email_address} - Step ${currentStep + 1} scheduled for ${scheduledDate.toISOString()} (${nextSequenceTiming} days after ${lastSentAt || contact.created_at})`)
          skippedNotDue++
        }
      }
    }
    
    if (emailsDue.length === 0) {
      let skipSummary = []
      if (skippedInactiveCampaigns > 0) skipSummary.push(`${skippedInactiveCampaigns} inactive campaigns`)
      if (skippedCompletedContacts > 0) skipSummary.push(`${skippedCompletedContacts} completed contacts`)
      if (skippedTimezone > 0) skipSummary.push(`${skippedTimezone} timezone restrictions`)
      if (skippedDateCondition > 0) skipSummary.push(`${skippedDateCondition} date condition failed`)
      if (skippedNotDue > 0) skipSummary.push(`${skippedNotDue} not due yet`)
      
      const message = skipSummary.length > 0 
        ? `No emails due for processing (skipped: ${skipSummary.join(', ')})`
        : 'No emails due for processing'
      
      console.log(`✅ ${message}`)
      return NextResponse.json({
        success: true,
        message,
        processed: 0,
        skipped: {
          inactiveCampaigns: skippedInactiveCampaigns,
          completedContacts: skippedCompletedContacts,
          timezone: skippedTimezone,
          dateCondition: skippedDateCondition,
          notDue: skippedNotDue
        },
        timestamp: new Date().toISOString()
      })
    }
    
    console.log(`📧 Found ${emailsDue.length} emails due for processing`)
    
    let processedCount = 0
    let sentCount = 0
    let skippedCount = 0
    let errorCount = 0
    const results: any[] = []
    
    for (const emailJob of emailsDue) {
      try {
        processedCount++
        const { contact, campaign, sequence, scheduledFor, currentStep, totalSequences } = emailJob
        
        console.log(`\n🎯 SENDING EMAIL ${processedCount}/${emailsDue.length}`)
        console.log('═'.repeat(60))
        console.log(`📧 Contact: ${contact.email_address}`)
        console.log(`👤 Name: ${contact.first_name} ${contact.last_name}`)
        console.log(`🏢 Company: ${contact.company || 'N/A'}`)
        console.log(`📍 Location: ${contact.location || 'N/A'}`)
        console.log(`📊 Sequence Step: ${currentStep} of ${totalSequences || 'unknown'}`)
        console.log(`📝 Email Subject: "${sequence.subject}"`)
        console.log(`⏰ Originally Scheduled: ${scheduledFor}`)
        console.log(`🏷️  Contact Status: ${contact.status || 'Active'}`)
        console.log(`🧪 Test Mode: ${testMode}`)
        
        // Skip if contact has final status
        if (['Completed', 'Replied', 'Unsubscribed', 'Bounced'].includes(contact.status)) {
          console.log(`🚫 STATUS BLOCK: Contact status is "${contact.status}" - SKIPPING EMAIL`)
          console.log(`📝 Reason: Final status prevents further emails`)
          skippedCount++
          results.push({
            contactId: contact.id,
            contactEmail: contact.email_address,
            status: 'skipped',
            reason: `Contact status: ${contact.status}`
          })
          continue
        }
        
        // Get a sender for this campaign (simple round-robin for now)
        const { data: senders } = await supabase
          .from('campaign_senders')
          .select('email')
          .eq('campaign_id', contact.campaign_id)
          .eq('is_active', true)
          .eq('is_selected', true)
          .limit(1)
        
        if (!senders || senders.length === 0) {
          errorCount++
          results.push({
            contactId: contact.id,
            contactEmail: contact.email,
            status: 'failed',
            reason: 'No active senders'
          })
          continue
        }
        
        // Send the email
        const sendResult = await sendSequenceEmail({
          contact,
          sequence,
          senderEmail: senders[0].email,
          testMode
        })
        
        if (sendResult.success) {
          // Update sequence progression using proper API
          // Check if we have a UUID (prospects) or integer (contacts) ID
          const isUUID = contact.id.includes('-')
          
          if (isUUID) {
            // Use prospect sequence progression for UUID IDs
            await updateSequenceProgression({
              campaignId: contact.campaign_id,
              contactId: contact.id,
              sequenceId: sequence.id,
              status: 'sent',
              sentAt: new Date().toISOString(),
              messageId: sendResult.messageId,
              autoProgressNext: true
            })
          } else {
            // For integer IDs from contacts table, update both legacy table AND create progression record
            await supabase
              .from('contacts')
              .update({
                sequence_step: currentStep,
                updated_at: new Date().toISOString()
              })
              .eq('id', parseInt(contact.id))
            
            // Also create a progression record so the frontend can track it
            const { error: progressError } = await supabase
              .from('prospect_sequence_progress')
              .upsert({
                campaign_id: contact.campaign_id,
                prospect_id: contact.id, // Use string ID
                sequence_id: sequence.id,
                status: 'sent',
                sent_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'campaign_id,prospect_id,sequence_id'
              })
            
            if (progressError) {
              console.error(`❌ Failed to create progression record for contact ${contact.id}:`, progressError)
            } else {
              console.log(`📝 Updated contact ${contact.id} to step ${currentStep} and created progression record`)
            }
          }
          
          
          // Log email tracking for account logs
          await logEmailTracking({
            contactId: isUUID ? contact.id : parseInt(contact.id),
            contactEmail: contact.email_address,
            campaignId: contact.campaign_id,
            sequenceId: sequence.id,
            sequenceStep: currentStep,
            messageId: sendResult.messageId,
            senderEmail: senders[0].email,
            status: 'sent',
            testMode: testMode || sendResult.simulation
          })

          // Add to inbox sent folder for unified email management
          await logToInbox({
            userId: campaign.user_id,
            messageId: sendResult.messageId,
            contactEmail: contact.email_address,
            contactName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email_address,
            senderEmail: senders[0].email,
            subject: sequence.subject || `Email ${currentStep}`,
            bodyText: sequence.content || '',
            bodyHtml: sequence.content || '',
            campaignId: contact.campaign_id,
            sequenceStep: currentStep,
            testMode: testMode || sendResult.simulation
          })
          
          sentCount++
          results.push({
            contactId: contact.id,
            contactEmail: contact.email_address,
            sequenceStep: currentStep,
            status: 'sent',
            messageId: sendResult.messageId,
            testMode,
            scheduledFor
          })
          
          console.log(`   ✅ ${testMode ? '[TEST] ' : ''}EMAIL SENT successfully!`)
          console.log(`      From: ${senders[0].email}`)
          console.log(`      To: ${contact.email_address}`)
          console.log(`      Step: ${currentStep}`)
          console.log(`      Subject: ${sequence.subject}`)
          console.log(`      Message ID: ${sendResult.messageId}`)
          console.log(`      Test Mode: ${testMode || sendResult.simulation}`)
        } else {
          // Log failed email attempt
          await logEmailTracking({
            contactId: isUUID ? contact.id : parseInt(contact.id),
            contactEmail: contact.email_address,
            campaignId: contact.campaign_id,
            sequenceId: sequence.id,
            sequenceStep: currentStep,
            messageId: null,
            senderEmail: senders[0].email,
            status: 'failed',
            errorMessage: sendResult.error,
            testMode: testMode
          })
          
          errorCount++
          results.push({
            contactId: contact.id,
            contactEmail: contact.email_address,
            status: 'failed',
            error: sendResult.error
          })
          
          console.error(`❌ Email failed: ${contact.email_address} - ${sendResult.error}`)
        }
        
      } catch (error) {
        console.error(`❌ Error processing contact ${emailJob.contact.id}:`, error)
        errorCount++
        results.push({
          contactId: emailJob.contact.id,
          contactEmail: emailJob.contact.email_address,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    const executionTime = Date.now() - startTime
    const summary = {
      success: true,
      processed: processedCount,
      sent: sentCount,
      skipped: skippedCount,
      errors: errorCount,
      executionTimeMs: executionTime,
      testMode,
      timestamp: new Date().toISOString(),
      lookAheadMinutes,
      results
    }
    
    console.log(`🎯 Processing complete: ${sentCount} sent, ${skippedCount} skipped, ${errorCount} errors (${executionTime}ms)`)
    
    return NextResponse.json(summary)
    
  } catch (error) {
    console.error('❌ Fatal error processing scheduled emails:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime
    }, { status: 500 })
  }
}

async function sendSequenceEmail({ contact, sequence, senderEmail, testMode }: any) {
  try {
    if (testMode) {
      // Simulate email sending
      return {
        success: true,
        messageId: `test_${Date.now()}_${contact.id}`,
        simulation: true
      }
    }
    
    // Check if we should send via SendGrid or simulate
    const SIMULATION_MODE = process.env.EMAIL_SIMULATION_MODE !== 'false'
    
    if (SIMULATION_MODE) {
      console.log(`🧪 SIMULATED SEQUENCE EMAIL:`)
      console.log(`   From: ${senderEmail}`)
      console.log(`   To: ${contact.email_address}`)
      console.log(`   Subject: ${sequence.subject}`)
      console.log(`   Step: ${sequence.step_number}`)
      
      return {
        success: true,
        messageId: `simulated_${Date.now()}_${contact.id}`,
        simulation: true
      }
    }
    
    // Real email sending via SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      
      // Personalize content
      const personalizedSubject = sequence.subject
        .replace(/\{\{firstName\}\}/g, contact.first_name || 'there')
        .replace(/\{\{lastName\}\}/g, contact.last_name || '')
        .replace(/\{\{company\}\}/g, contact.company || 'your company')
      
      const personalizedContent = sequence.content
        .replace(/\{\{firstName\}\}/g, contact.first_name || 'there')
        .replace(/\{\{lastName\}\}/g, contact.last_name || '')
        .replace(/\{\{company\}\}/g, contact.company || 'your company')
      
      const msg = {
        to: contact.email_address,
        from: {
          email: senderEmail,
          name: senderEmail.split('@')[0]
        },
        replyTo: 'info@leadsup.io',
        subject: personalizedSubject,
        html: personalizedContent,
        text: personalizedContent.replace(/<[^>]*>/g, '') // Strip HTML
      }
      
      console.log(`📧 SENDING SEQUENCE EMAIL:`)
      console.log(`   From: ${senderEmail}`)
      console.log(`   To: ${contact.email}`)
      console.log(`   Subject: ${personalizedSubject}`)
      console.log(`   Step: ${sequence.step_number}`)
      
      const result = await sgMail.send(msg)
      
      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id'] || `sg_${Date.now()}_${contact.id}`,
        simulation: false
      }
    }
    
    // Fallback: simulation if no email service
    console.log(`⚠️  No SendGrid API key. Simulating email send.`)
    return {
      success: true,
      messageId: `fallback_${Date.now()}_${contact.id}`,
      simulation: true
    }
    
  } catch (error) {
    console.error('❌ Error sending sequence email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

async function updateSequenceProgression({
  campaignId,
  contactId,
  sequenceId,
  status,
  sentAt,
  messageId,
  autoProgressNext
}: {
  campaignId: string
  contactId: string
  sequenceId: string
  status: 'sent' | 'scheduled' | 'failed'
  sentAt: string
  messageId: string
  autoProgressNext: boolean
}) {
  try {
    // Call our sequence progression API internally
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
    const username = process.env.N8N_API_USERNAME || 'admin'
    const password = process.env.N8N_API_PASSWORD || 'password'
    
    const response = await fetch(`${baseUrl}/api/sequences/progress-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      },
      body: JSON.stringify({
        campaignId,
        contactId, // Already a string UUID
        sequenceId,
        status,
        sentAt,
        messageId,
        autoProgressNext
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ Sequence progression API error (${response.status}):`, error)
      return { success: false, error }
    }

    const result = await response.json()
    console.log(`✅ Sequence progression updated: Contact ${contactId}, Sequence ${sequenceId}, Status: ${status}`)
    return { success: true, result }
    
  } catch (error) {
    console.error('❌ Error calling sequence progression API:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function updateContactSequenceProgress(contactId: number, sequenceStep: number) {
  try {
    // Update contact with latest sequence step and last contacted time
    const { error } = await supabase
      .from('contacts')
      .update({
        sequence_step: sequenceStep,
        last_contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
    
    if (error) {
      console.error('Error updating contact progress:', error)
    } else {
      console.log(`📝 Updated contact ${contactId} to step ${sequenceStep}`)
    }
  } catch (error) {
    console.error('Error in updateContactSequenceProgress:', error)
  }
}

async function logEmailTracking({
  contactId,
  contactEmail,
  campaignId,
  sequenceId,
  sequenceStep,
  messageId,
  senderEmail,
  status,
  errorMessage = null,
  testMode = false
}: {
  contactId: number | string
  contactEmail: string
  campaignId: string
  sequenceId: string
  sequenceStep: number
  messageId: string | null
  senderEmail: string
  status: 'sent' | 'failed' | 'bounced' | 'delivered'
  errorMessage?: string | null
  testMode?: boolean
}) {
  try {
    const now = new Date().toISOString()
    
    const logEntry = {
      campaign_id: campaignId,
      contact_id: contactId.toString(),
      sequence_id: sequenceId,
      sequence_step: sequenceStep,
      status: status,
      sent_at: now,
      message_id: messageId,
      sender_type: testMode ? 'simulation' : 'sendgrid',
      sender_email: senderEmail,
      recipient_email: contactEmail,
      subject: `Step ${sequenceStep} - Automation Email`,
      error_message: errorMessage,
      delivered_at: status === 'sent' ? now : null,
      created_at: now
    }
    
    console.log(`📧 Creating email tracking record for ${contactEmail} (Step ${sequenceStep})...`)
    
    const { error } = await supabase
      .from('email_tracking')
      .insert(logEntry)
    
    if (error) {
      console.error('❌ Error logging email tracking:', error)
      console.error('❌ Log entry that failed:', JSON.stringify(logEntry, null, 2))
    } else {
      console.log(`✅ Successfully logged email tracking: ${status} - ${contactEmail} (Step ${sequenceStep})`)
      console.log(`   📋 Contact ID: ${contactId}`)
      console.log(`   📧 Message ID: ${messageId}`)
      console.log(`   👤 Sender: ${senderEmail}`)
      console.log(`   🎯 Test Mode: ${testMode}`)
    }
  } catch (error) {
    console.error('❌ Error in logEmailTracking:', error)
  }
}

async function logToInbox({
  userId,
  messageId,
  contactEmail,
  contactName,
  senderEmail,
  subject,
  bodyText,
  bodyHtml,
  campaignId,
  sequenceStep,
  testMode = false
}: {
  userId: string
  messageId: string
  contactEmail: string
  contactName: string
  senderEmail: string
  subject: string
  bodyText: string
  bodyHtml: string
  campaignId: string
  sequenceStep: number
  testMode?: boolean
}) {
  try {
    // Generate conversation ID (same logic as manual send-email)
    const generateConversationId = (contactEmail: string, senderEmail: string) => {
      const participants = [contactEmail, senderEmail].sort().join('|')
      return Buffer.from(participants).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
    }

    const conversationId = generateConversationId(contactEmail, senderEmail)
    const now = new Date().toISOString()
    
    const inboxEntry = {
      user_id: userId,
      message_id: messageId,
      conversation_id: conversationId,
      contact_email: contactEmail,
      contact_name: contactName,
      sender_email: senderEmail,
      subject: subject,
      body_text: bodyText,
      body_html: bodyHtml,
      direction: 'outbound',
      channel: 'email',
      message_type: 'email',
      status: 'read', // Outbound emails are 'read' by definition
      folder: 'sent',
      provider: 'smtp',
      provider_data: {
        campaign_id: campaignId,
        sequence_step: sequenceStep
      },
      sent_at: now,
      created_at: now,
      updated_at: now
    }
    
    console.log(`📥 Adding automation email to inbox sent folder: ${contactEmail} (Step ${sequenceStep})...`)
    
    // Create or update inbox thread first
    await supabase
      .from('inbox_threads')
      .upsert({
        user_id: userId,
        conversation_id: conversationId,
        contact_email: contactEmail,
        contact_name: contactName,
        subject: subject,
        last_message_at: now,
        last_message_preview: bodyText.substring(0, 150),
        status: 'active'
      }, {
        onConflict: 'conversation_id,user_id'
      })

    const { error } = await supabase
      .from('inbox_messages')
      .insert(inboxEntry)
    
    if (error) {
      console.error('❌ Error logging to inbox:', error)
      console.error('❌ Inbox entry that failed:', JSON.stringify(inboxEntry, null, 2))
    } else {
      console.log(`✅ Successfully added to inbox sent folder: ${contactEmail} (Step ${sequenceStep})`)
      console.log(`   📧 Message ID: ${messageId}`)
      console.log(`   💬 Conversation ID: ${conversationId}`)
      console.log(`   👤 Sender: ${senderEmail}`)
      console.log(`   🎯 Test Mode: ${testMode}`)
    }
  } catch (error) {
    console.error('❌ Error in logToInbox:', error)
  }
}