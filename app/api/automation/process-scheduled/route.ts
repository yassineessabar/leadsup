import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deriveTimezoneFromLocation, getBusinessHoursStatus } from '@/lib/timezone-utils'

// Use service role key for scheduled processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  console.log('🚨 AUTOMATION STARTED - Function entry point reached')
  console.log('🚨 Request URL:', request.url)
  console.log('🚨 Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  })
  
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('testMode') === 'true' || process.env.EMAIL_SIMULATION_MODE === 'true'
    const lookAheadMinutes = parseInt(searchParams.get('lookAhead') || '15') // Default 15 minutes lookahead
    
    console.log('🚨 Parameters parsed:', { testMode, lookAheadMinutes })
    
    console.log('═'.repeat(80))
    console.log('🚀 EMAIL AUTOMATION PROCESSOR STARTED - ULTRA VERBOSE DEBUG MODE')
    console.log('═'.repeat(80))
    console.log(`⏰ Start Time: ${new Date().toISOString()}`)
    console.log(`🧪 Test Mode: ${testMode}`)
    console.log(`👀 Look Ahead: ${lookAheadMinutes} minutes`)
    console.log(`🌍 Current UTC Hour: ${new Date().getUTCHours()}:${new Date().getUTCMinutes().toString().padStart(2, '0')}`)
    console.log(`🔧 Code Version: DEBUG-${Date.now()}`)
    console.log(`🔗 Request URL: ${request.url}`)
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`📡 Vercel URL: ${process.env.VERCEL_URL || 'not set'}`)
    console.log('─'.repeat(80))
    
    // STEP 1: Get contacts that are due from analytics logic
    console.log('📊 STEP 1: Syncing with analytics "Due next" contacts...')
    
    // Get all active campaigns
    console.log('🔍 STEP 1.1: Fetching active campaigns from database...')
    console.log(`   📊 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
    console.log(`   🔑 Has Service Key: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`)
    
    const { data: activeCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, status, created_at, updated_at')
      .eq('status', 'Active')
    
    console.log(`   ✅ Query executed: SELECT * FROM campaigns WHERE status = 'Active'`)
    
    console.log(`📋 Found ${activeCampaigns?.length || 0} active campaigns`)
    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError)
    }
    if (activeCampaigns) {
      console.log('📝 Active campaigns found:')
      activeCampaigns.forEach((c, i) => {
        console.log(`   ${i + 1}. Campaign: "${c.name}"`)
        console.log(`      ID: ${c.id}`)
        console.log(`      Status: ${c.status}`)
        console.log(`      Created: ${c.created_at}`)
        console.log(`      Updated: ${c.updated_at}`)
      })
    }
    
    let analyticsContacts: any[] = []
    
    if (!campaignsError && activeCampaigns) {
      console.log('🔄 STEP 1.2: Processing each campaign for due contacts...')
      for (const [index, campaign] of activeCampaigns.entries()) {
        console.log(`\n📌 Processing Campaign ${index + 1}/${activeCampaigns.length}: "${campaign.name}"`)
        console.log('─'.repeat(60))
        
        try {
          // BYPASS CACHED ENDPOINT - QUERY DATABASE DIRECTLY
          console.log(`🔍 BYPASSING sync-due-contacts endpoint due to cache issues`)
          console.log(`📊 Querying database directly for campaign ${campaign.id}`)
          
          // Query contacts table directly
          const { data: contactsData, error: contactsError } = await supabase
            .from('contacts')
            .select('*')
            .eq('campaign_id', campaign.id)
            .neq('email_status', 'Completed')
            .neq('email_status', 'Replied') 
            .neq('email_status', 'Unsubscribed')
            .neq('email_status', 'Bounced')
          
          console.log(`   ✅ Direct query result: ${contactsData?.length || 0} contacts found`)
          
          if (contactsError) {
            console.error(`   ❌ Query error:`, contactsError)
            continue
          }
          
          if (contactsData && contactsData.length > 0) {
            console.log(`   📝 Sample contacts found:`)
            contactsData.slice(0, 3).forEach(c => {
              console.log(`      - ${c.email} (${c.first_name} ${c.last_name}) - Location: ${c.location}`)
            })
            
            // Add all contacts to analytics array for processing
            // We'll check if they're "due" in the main processing loop
            const campaignContacts = contactsData.map((c: any) => ({
              ...c,
              email_address: c.email || c.email_address, // Normalize email field
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              source: 'direct-db'
            }))
            
            analyticsContacts.push(...campaignContacts)
            
            console.log(`  📋 Campaign "${campaign.name}": Added ${campaignContacts.length} contacts to processing queue`)
            console.log(`     Contact emails: ${campaignContacts.map((c: any) => c.email).slice(0, 5).join(', ')}${campaignContacts.length > 5 ? '...' : ''}`)
          } else {
            console.log(`  ⚠️ Campaign "${campaign.name}": No contacts found in database`)
          }
          
        } catch (directError) {
          console.error(`❌ Direct database query failed for campaign ${campaign.id}:`, directError)
        }
      }
    }
    
    console.log(`📊 Total analytics due contacts: ${analyticsContacts.length}`)
    console.log('─'.repeat(40))
    
    // STEP 2: Use analytics results from sync-due-contacts (TRUST THE CORRECTED SYNC API)
    console.log('🎯 STEP 2: Using analytics results from corrected sync-due-contacts endpoint...')
    
    // Keep the analytics contacts from the sync API - they're already correctly determined
    console.log(`🎯 TOTAL ANALYTICS DUE CONTACTS: ${analyticsContacts.length}`)

    // Use ONLY analytics contacts
    let allContacts = [...analyticsContacts]
    
    if (allContacts.length === 0) {
      console.log('📭 No analytics due contacts found')
      console.log('🚨 About to return "No analytics due contacts found" response')
      
      // Return detailed debug info in test mode
      const debugResponse = testMode ? {
        success: true,
        message: analyticsContacts.length > 0 ? 'Found contacts via direct DB query - VERSION 3.0' : 'No analytics due contacts found - VERSION 3.0 DIRECT-DB',
        processed: 0,
        timestamp: new Date().toISOString(),
        version: 'DEBUG-3.0-DIRECT-DB-' + Date.now(),
        debug: {
          activeCampaignsCount: activeCampaigns?.length || 0,
          activeCampaignsFound: activeCampaigns?.map(c => ({ name: c.name, id: c.id })) || [],
          analyticsContactsFound: analyticsContacts.length,
          contactsFromDirectDB: analyticsContacts.length,
          sampleContactEmails: analyticsContacts.slice(0, 5).map(c => c.email || c.email_address),
          testMode: true,
          note: "VERSION 3.0 - BYPASSED CACHED ENDPOINT - DIRECT DB QUERY - " + new Date().toISOString(),
          deploymentCheck: "Should show contacts now via direct database query!"
        }
      } : {
        success: true,
        message: 'No analytics due contacts found - VERSION 2.0',
        processed: 0,
        timestamp: new Date().toISOString(),
        version: 'DEBUG-2.0'
      }
      
      return NextResponse.json(debugResponse)
    }

    console.log(`🎯 Processing ${allContacts.length} ANALYTICS-ONLY contacts`)
    console.log(`  📊 All contacts are from analytics logic`)
    console.log(`  🚫 Legacy processing disabled`)
    
    // Since all contacts are already determined to be "due" by analytics logic, process them directly
    const emailsDue = []
    let skippedInactiveCampaigns = 0
    let skippedCompletedContacts = 0
    
    for (const contact of allContacts) {
      const contactEmail = contact.email || contact.email_address
      if (!contactEmail || !contact.campaign_id) continue
      
      console.log(`\n🎯 PROCESSING ANALYTICS DUE CONTACT: ${contactEmail}`)
      console.log(`├─ Contact ID: ${contact.id}`)
      console.log(`├─ Campaign: ${contact.campaign_name}`)
      console.log(`├─ Email Status: ${contact.email_status || 'Unknown'}`)
      console.log(`├─ Source: ${contact.source}`)
      
      // Skip contacts with completed email status (shouldn't happen with analytics logic but safety check)
      if (['Completed', 'Replied', 'Unsubscribed', 'Bounced'].includes(contact.email_status)) {
        console.log(`└─ ⏭️ SKIPPED: Contact has email_status ${contact.email_status}`)
        skippedCompletedContacts++
        continue
      }
      
      // Get basic campaign info (already validated by analytics logic)
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('id, name, status, user_id')
        .eq('id', contact.campaign_id)
        .single()
      
      if (!campaign || campaign.status !== 'Active') {
        console.log(`⏸️ SKIPPED: Campaign not found or inactive`)
        skippedInactiveCampaigns++
        continue
      }
      
      // Get campaign sequences
      const { data: campaignSequences } = await supabase
        .from('campaign_sequences')
        .select('*')
        .eq('campaign_id', contact.campaign_id)
        .order('step_number', { ascending: true })
      
      if (!campaignSequences || campaignSequences.length === 0) {
        console.log(`❌ No sequences found for campaign`)
        continue
      }
      
      // Use sequence_step from contact record (analytics already determined this correctly)
      const currentStep = contact.sequence_step || 0
      const nextSequence = campaignSequences[currentStep]
      
      if (!nextSequence) {
        console.log(`❌ No sequence found for step ${currentStep + 1}`)
        continue
      }
      
      console.log(`├─ Next Sequence: Step ${currentStep + 1} - "${nextSequence.subject}"`)
      console.log(`└─ ✅ ANALYTICS DETERMINED: Contact is DUE - Adding to email queue`)
      
      // Analytics already determined this contact is due - add directly to queue
      emailsDue.push({
        contact,
        campaign,
        sequence: nextSequence,
        scheduledFor: new Date().toISOString(), // Use current time since analytics says it's due
        currentStep: currentStep + 1, // Next step number
        totalSequences: campaignSequences.length
      })
      
      console.log(`📧 Added to queue: ${contactEmail} - Step ${currentStep + 1} (${nextSequence.subject})`)
    }
    
    // Check if we have emails to process
    if (emailsDue.length === 0) {
      let skipSummary = []
      if (skippedInactiveCampaigns > 0) skipSummary.push(`${skippedInactiveCampaigns} inactive campaigns`)
      if (skippedCompletedContacts > 0) skipSummary.push(`${skippedCompletedContacts} completed contacts`)
      
      const message = skipSummary.length > 0 
        ? `No analytics due contacts ready for processing (skipped: ${skipSummary.join(', ')})`
        : 'No analytics due contacts ready for processing'
      
      console.log(`✅ ${message}`)
      
      return NextResponse.json({
        success: true,
        message,
        processed: 0,
        skipped: {
          inactiveCampaigns: skippedInactiveCampaigns,
          completedContacts: skippedCompletedContacts
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
        console.log(`🏷️  Contact Email Status: ${contact.email_status || 'Active'}`)
        console.log(`🧪 Test Mode: ${testMode}`)
        
        // Skip if contact has final email status
        if (['Completed', 'Replied', 'Unsubscribed', 'Bounced'].includes(contact.email_status)) {
          console.log(`🚫 STATUS BLOCK: Contact email_status is "${contact.email_status}" - SKIPPING EMAIL`)
          console.log(`📝 Reason: Final status prevents further emails`)
          skippedCount++
          results.push({
            contactId: contact.id,
            contactEmail: contact.email_address,
            status: 'skipped',
            reason: `Contact email_status: ${contact.email_status}`
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
          const isUUID = String(contact.id).includes('-')
          
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
            contactId: isUUID ? contact.id : parseInt(String(contact.id)),
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
            campaignName: contact.campaign_name,
            sequenceStep: currentStep,
            status: 'sent',
            messageId: sendResult.messageId,
            testMode,
            scheduledFor
          })
          
          // Update analytics contact status if this came from analytics
          if (contact.source === 'analytics') {
            try {
              const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                             process.env.NODE_ENV === 'production' ? `https://${request.headers.get('host')}` : 
                             'http://localhost:3000'
              
              const updateResponse = await fetch(`${baseUrl}/api/automation/sync-due-contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contactId: contact.id,
                  campaignId: contact.campaign_id,
                  sequenceStep: currentStep - 1, // Current step before increment
                  success: true
                })
              })
              
              if (updateResponse.ok) {
                console.log(`📊 Updated analytics contact ${contact.id} after successful send`)
              } else {
                console.error(`❌ Failed to update analytics contact ${contact.id}`)
              }
            } catch (syncError) {
              console.error(`❌ Error updating analytics contact ${contact.id}:`, syncError)
            }
          }
          
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
            contactId: isUUID ? contact.id : parseInt(String(contact.id)),
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
          
          // Update analytics contact status if this came from analytics (failed case)
          if (contact.source === 'analytics') {
            try {
              const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                             process.env.NODE_ENV === 'production' ? `https://${request.headers.get('host')}` : 
                             'http://localhost:3000'
              
              const updateResponse = await fetch(`${baseUrl}/api/automation/sync-due-contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contactId: contact.id,
                  campaignId: contact.campaign_id,
                  sequenceStep: currentStep - 1, // Current step before increment
                  success: false,
                  errorMessage: sendResult.error
                })
              })
              
              if (updateResponse.ok) {
                console.log(`📊 Updated analytics contact ${contact.id} after failed send`)
              } else {
                console.error(`❌ Failed to update analytics contact ${contact.id} (failed case)`)
              }
            } catch (syncError) {
              console.error(`❌ Error updating analytics contact ${contact.id} (failed case):`, syncError)
            }
          }
          
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
    
    console.log('═'.repeat(80))
    console.log('📊 AUTOMATION SUMMARY')
    console.log('─'.repeat(80))
    console.log(`⏱️ Execution Time: ${executionTime}ms`)
    console.log(`📧 Emails Sent: ${sentCount}`)
    console.log(`⏭️ Emails Skipped: ${skippedCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    
    // Group results by campaign for summary
    const campaignSummary: any = {}
    results.forEach((result: any) => {
      const campaignName = result.campaignName || 'Unknown'
      if (!campaignSummary[campaignName]) {
        campaignSummary[campaignName] = { sent: [], skipped: [], failed: [] }
      }
      if (result.status === 'sent') {
        campaignSummary[campaignName].sent.push(result.contactId)
      } else if (result.status === 'skipped') {
        campaignSummary[campaignName].skipped.push(result.contactId)
      } else {
        campaignSummary[campaignName].failed.push(result.contactId)
      }
    })
    
    console.log('\n📋 Results by Campaign:')
    Object.entries(campaignSummary).forEach(([campaign, stats]: any) => {
      console.log(`   ${campaign}:`)
      if (stats.sent.length > 0) console.log(`      ✅ Sent: ${stats.sent.join(', ')}`)
      if (stats.skipped.length > 0) console.log(`      ⏭️ Skipped: ${stats.skipped.join(', ')}`)
      if (stats.failed.length > 0) console.log(`      ❌ Failed: ${stats.failed.join(', ')}`)
    })
    console.log('═'.repeat(80))
    
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
              replyToEmail = `reply@${domainConfig.domain}`
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
        replyTo: replyToEmail,
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