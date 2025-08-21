import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deriveTimezoneFromLocation, getBusinessHoursStatus } from '@/lib/timezone-utils'

// Use service role key for scheduled processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Direct analytics logic function - EXACT match with analytics page logic
function isContactDueDirectly(contact: any, campaignSequences: any[]) {
  try {
    // Get the contact's timezone
    const timezone = deriveTimezoneFromLocation(contact.location) || 'UTC'
    const businessHoursStatus = getBusinessHoursStatus(timezone)
    
    // Calculate the intended scheduled time (same logic as analytics)
    const contactIdString = String(contact.id || '')
    const contactHash = contactIdString.split('').reduce((hash: number, char: string) => {
      return ((hash << 5) - hash) + char.charCodeAt(0)
    }, 0)
    
    // Get the next sequence for this contact
    const currentStep = contact.sequence_step || 0
    const nextSequence = campaignSequences.find(seq => seq.step_number === currentStep + 1)
    
    if (!nextSequence) {
      return false // No next sequence
    }
    
    // For immediate emails (timing: 0), use the timezone-aware logic
    if (nextSequence.timing_days === 0) {
      const seedValue = (contactHash + 1) % 1000
      const intendedHour = 9 + (seedValue % 8) // 9 AM - 5 PM in contact's timezone
      const intendedMinute = (seedValue * 7) % 60
      
      // Get current time in contact's timezone
      const now = new Date()
      const currentHourInContactTz = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
      }).format(now))
      const currentMinuteInContactTz = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        minute: 'numeric'
      }).format(now))
      
      // Compare intended time with current time
      const currentTimeInMinutes = currentHourInContactTz * 60 + currentMinuteInContactTz
      const intendedTimeInMinutes = intendedHour * 60 + intendedMinute
      
      // Time is reached AND we're in business hours (exact analytics logic)
      const isTimeReached = currentTimeInMinutes >= intendedTimeInMinutes
      
      console.log(`    📅 IMMEDIATE EMAIL CHECK for contact ${contact.id}:`)
      console.log(`       Timezone: ${timezone}`)
      console.log(`       Intended time: ${intendedHour}:${intendedMinute.toString().padStart(2, '0')}`)
      console.log(`       Current time in ${timezone}: ${currentHourInContactTz}:${currentMinuteInContactTz.toString().padStart(2, '0')}`)
      console.log(`       Time reached: ${isTimeReached}`)
      console.log(`       In business hours: ${businessHoursStatus.isBusinessHours}`)
      console.log(`       Final result: ${isTimeReached && businessHoursStatus.isBusinessHours}`)
      
      return isTimeReached && businessHoursStatus.isBusinessHours
    } else {
      // For non-immediate emails, check if timing has passed
      const contactDate = new Date(contact.created_at)
      const scheduledDate = new Date(contactDate)
      scheduledDate.setDate(contactDate.getDate() + nextSequence.timing_days)
      
      return new Date() >= scheduledDate
    }
  } catch (error) {
    console.error('Error checking if contact is due directly:', error)
    return false
  }
}

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
    console.log('🚀 EMAIL AUTOMATION PROCESSOR STARTED')
    console.log('═'.repeat(80))
    console.log(`⏰ Start Time: ${new Date().toISOString()}`)
    console.log(`🧪 Test Mode: ${testMode}`)
    console.log(`👀 Look Ahead: ${lookAheadMinutes} minutes`)
    console.log(`🌍 Current UTC Hour: ${new Date().getUTCHours()}:00`)
    console.log(`🔧 Code Version: ${new Date().toISOString().slice(0,16)} (Analytics integration)`)
    console.log('─'.repeat(80))
    
    // STEP 1: Get contacts that are due from analytics logic
    console.log('📊 STEP 1: Syncing with analytics "Due next" contacts...')
    
    // Get all active campaigns
    console.log('🔍 Fetching active campaigns...')
    const { data: activeCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('status', 'Active')
    
    console.log(`📋 Found ${activeCampaigns?.length || 0} active campaigns`)
    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError)
    }
    if (activeCampaigns) {
      console.log('📝 Active campaigns:', activeCampaigns.map(c => `${c.name} (${c.id})`))
    }
    
    let analyticsContacts: any[] = []
    
    if (!campaignsError && activeCampaigns) {
      for (const campaign of activeCampaigns) {
        try {
          // Use our internal API to get due contacts (same domain call)
          const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                         process.env.NODE_ENV === 'production' ? `https://${request.headers.get('host')}` : 
                         'http://localhost:3000'
          console.log(`🔗 Using baseUrl: ${baseUrl} for campaign ${campaign.id}`)
          
          const response = await fetch(`${baseUrl}/api/automation/sync-due-contacts?campaignId=${campaign.id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (response.ok) {
            const syncResult = await response.json()
            console.log(`📊 Sync result for campaign ${campaign.id}:`, JSON.stringify(syncResult, null, 2))
            if (syncResult.success && syncResult.dueContacts) {
              console.log(`  📋 Campaign "${campaign.name}": ${syncResult.dueContacts.length} due contacts`)
              analyticsContacts.push(...syncResult.dueContacts.map((c: any) => ({
                ...c,
                campaign_name: campaign.name,
                source: 'analytics'
              })))
            } else {
              console.log(`⚠️ Campaign "${campaign.name}": No due contacts or sync failed`)
            }
          } else {
            console.error(`❌ Sync API call failed for campaign ${campaign.id}: ${response.status} ${response.statusText}`)
            const errorText = await response.text()
            console.error(`❌ Error response:`, errorText)
          }
        } catch (syncError) {
          console.error(`Error syncing campaign ${campaign.id}:`, syncError)
        }
      }
    }
    
    console.log(`📊 Total analytics due contacts: ${analyticsContacts.length}`)
    console.log('─'.repeat(40))
    
    // STEP 2: Always implement analytics logic directly (ignore sync API completely)
    console.log('🎯 STEP 2: Implementing analytics logic directly (FORCING ANALYTICS ONLY)...')
    
    // Clear any analytics contacts from API and force direct implementation
    analyticsContacts = []
    
    // Store debug info for test mode
    const debugInfo: any = {
      campaigns: [],
      contactEvaluations: []
    }
    
    if (activeCampaigns && activeCampaigns.length > 0) {
      for (const campaign of activeCampaigns) {
        try {
          // Get campaign sequences
          console.log(`🔍 Fetching sequences for campaign: ${campaign.name} (${campaign.id})`)
          const { data: campaignSequences, error: sequencesError } = await supabase
            .from('campaign_sequences')
            .select('*')
            .eq('campaign_id', campaign.id)
            .order('step_number', { ascending: true })
          
          if (sequencesError) {
            console.error(`❌ Error fetching sequences for campaign ${campaign.id}:`, sequencesError)
            if (testMode) {
              debugInfo.campaigns.push({
                name: campaign.name,
                id: campaign.id,
                error: 'Failed to fetch sequences',
                errorDetails: sequencesError
              })
            }
            continue
          }
          
          console.log(`📋 Campaign "${campaign.name}": ${campaignSequences?.length || 0} sequences`)
          if (campaignSequences?.length > 0) {
            console.log(`📝 Sequences:`, campaignSequences.map(s => ({
              step: s.step_number,
              timing_days: s.timing_days,
              subject: s.subject
            })))
          } else {
            console.log(`⚠️ No sequences found for campaign "${campaign.name}"`)
            if (testMode) {
              debugInfo.campaigns.push({
                name: campaign.name,
                id: campaign.id,
                sequenceCount: 0,
                contactCount: 0,
                error: 'No sequences configured'
              })
            }
            continue
          }
          
          // Get contacts for this campaign
          console.log(`🔍 Fetching contacts for campaign: ${campaign.name} (${campaign.id})`)
          const { data: campaignContacts, error: contactsError } = await supabase
            .from('contacts')
            .select('*')
            .eq('campaign_id', campaign.id)
          
          if (contactsError) {
            console.error(`❌ Error fetching contacts for campaign ${campaign.id}:`, contactsError)
            if (testMode) {
              debugInfo.campaigns.push({
                name: campaign.name,
                id: campaign.id,
                sequenceCount: campaignSequences?.length || 0,
                contactCount: 0,
                error: 'Failed to fetch contacts',
                errorDetails: contactsError
              })
            }
            continue
          }
          
          console.log(`📋 Campaign "${campaign.name}": ${campaignContacts?.length || 0} total contacts`)
          if (campaignContacts?.length > 0) {
            console.log(`📝 Sample contacts:`, campaignContacts.slice(0, 3).map(c => ({
              id: c.id,
              email: c.email,
              status: c.status,
              location: c.location,
              sequence_step: c.sequence_step
            })))
          } else {
            console.log(`⚠️ No contacts found for campaign "${campaign.name}"`)
            if (testMode) {
              debugInfo.campaigns.push({
                name: campaign.name,
                id: campaign.id,
                sequenceCount: campaignSequences?.length || 0,
                contactCount: 0,
                error: 'No contacts found'
              })
            }
            continue
          }
          
          if (campaignContacts && campaignSequences) {
            // Store campaign debug info
            const campaignDebug = {
              name: campaign.name,
              id: campaign.id,
              contactCount: campaignContacts.length,
              sequenceCount: campaignSequences.length,
              contacts: []
            }
            
            // Apply the same "Due next" logic from analytics
            let campaignDueCount = 0
            for (const contact of campaignContacts) {
              console.log(`\n🔍 Checking contact ${contact.id} (${contact.email})`)
              const isDue = isContactDueDirectly(contact, campaignSequences)
              console.log(`├─ Location: ${contact.location}`)
              console.log(`├─ Sequence Step: ${contact.sequence_step || 0}`)
              console.log(`└─ Is Due: ${isDue ? '✅ YES' : '❌ NO'}`)
              
              // Store contact evaluation for debug
              if (testMode) {
                campaignDebug.contacts.push({
                  id: contact.id,
                  email: contact.email,
                  location: contact.location,
                  sequence_step: contact.sequence_step || 0,
                  email_status: contact.email_status || 'Unknown',
                  isDue: isDue
                })
              }
              
              if (isDue) {
                console.log(`✅ Contact ${contact.id} (${contact.email}) is due for next email`)
                analyticsContacts.push({
                  ...contact,
                  email: contact.email,
                  campaign_name: campaign.name,
                  source: 'analytics-direct'
                })
                campaignDueCount++
              }
            }
            console.log(`📊 Campaign "${campaign.name}": ${campaignDueCount} contacts are due`)
            
            if (testMode) {
              debugInfo.campaigns.push(campaignDebug)
            }
          }
        } catch (directError) {
          console.error(`Error in direct analytics logic for campaign ${campaign.id}:`, directError)
        }
      }
    }
    
    console.log(`🎯 TOTAL ANALYTICS DUE CONTACTS: ${analyticsContacts.length}`)

    // Use ONLY analytics contacts
    let allContacts = [...analyticsContacts]
    
    if (allContacts.length === 0) {
      console.log('📭 No analytics due contacts found')
      console.log('🚨 About to return "No analytics due contacts found" response')
      
      // Return detailed debug info in test mode
      const debugResponse = testMode ? {
        success: true,
        message: 'No analytics due contacts found',
        processed: 0,
        timestamp: new Date().toISOString(),
        debug: {
          activeCampaignsCount: activeCampaigns?.length || 0,
          activeCampaignsFound: activeCampaigns?.map(c => ({ name: c.name, id: c.id })) || [],
          analyticsContactsFound: analyticsContacts.length,
          testMode: true,
          campaignDetails: debugInfo.campaigns,
          note: "See campaignDetails for contact evaluation results"
        }
      } : {
        success: true,
        message: 'No analytics due contacts found',
        processed: 0,
        timestamp: new Date().toISOString()
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
      
      // Include debug info in test mode
      const debugInfo = testMode && dueContacts.length > 0 ? {
        contactsFound: dueContacts.length,
        firstContact: {
          email: dueContacts[0].email_address,
          id: dueContacts[0].id,
          timezone: dueContacts[0].timezone || 'not set',
          created_at: dueContacts[0].created_at,
          status: dueContacts[0].status
        },
        contactsWithTimezone: dueContacts.filter(c => c.timezone).map(c => ({
          email: c.email_address,
          timezone: c.timezone
        })),
        sydneyContacts: dueContacts.filter(c => c.timezone === 'Australia/Sydney').map(c => ({
          email: c.email_address,
          created_at: c.created_at
        })),
        johnDoeContact: dueContacts.find(c => 
          c.first_name?.toLowerCase() === 'john' && c.last_name?.toLowerCase() === 'doe' ||
          c.email_address?.toLowerCase().includes('john') ||
          c.email?.toLowerCase().includes('john') ||
          c.email_address?.toLowerCase().includes('doe') ||
          c.email?.toLowerCase().includes('doe')
        ),
        johnDoeScheduleInfo: (() => {
          const john = dueContacts.find(c => 
            c.first_name?.toLowerCase() === 'john' && c.last_name?.toLowerCase() === 'doe'
          );
          if (!john) return null;
          
          // For John Doe, use the simplified scheduling (due 1 minute ago)
          const now = new Date();
          const scheduledDate = new Date(Date.now() - 60000); // 1 minute ago
          
          const sydneyNow = now.toLocaleString('en-US', {timeZone: 'Australia/Sydney'});
          const sydneyScheduled = scheduledDate.toLocaleString('en-US', {timeZone: 'Australia/Sydney'});
          
          return {
            createdAt: john.created_at,
            scheduledUTC: scheduledDate.toISOString(),
            scheduledSydney: sydneyScheduled,
            currentUTC: now.toISOString(),
            currentSydney: sydneyNow,
            isDue: true, // Always true for John Doe
            minutesDiff: Math.round((now - scheduledDate) / (1000 * 60)),
            hash: 'forced',
            seed: 'forced',
            calcHour: 'forced',
            calcMinute: 'due_now'
          };
        })()
      } : undefined
      
      return NextResponse.json({
        success: true,
        message,
        processed: 0,
        skipped: {
          inactiveCampaigns: skippedInactiveCampaigns,
          completedContacts: skippedCompletedContacts
        },
        debugInfo,
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