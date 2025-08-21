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
      
      console.log(`\n🔍 EVALUATING CONTACT: ${contact.email_address}`)
      console.log(`├─ Contact ID: ${contact.id}`)
      console.log(`├─ Campaign ID: ${contact.campaign_id}`)
      console.log(`├─ Status: ${contact.status}`)
      console.log(`├─ Created At: ${contact.created_at}`)
      console.log(`├─ Timezone: ${contact.timezone || 'not set'}`)
      console.log(`├─ Location: ${contact.location || 'not set'}`)
      
      // Skip contacts with completed status early
      if (['Completed', 'Replied', 'Unsubscribed', 'Bounced'].includes(contact.status)) {
        console.log(`└─ ⏭️ SKIPPED: Contact has status ${contact.status}`)
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
      
      console.log(`├─ Contact ID Type: ${isUUID ? 'UUID (prospects table)' : 'Integer (contacts table)'}`)
      
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
        console.log(`├─ 📊 Progress Records: Found ${currentStep} sent emails`)
        console.log(`├─ Last Sent At: ${lastSentAt || 'Never sent'}`)
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
        console.log(`├─ 📊 Email Tracking: Found ${currentStep} sent emails`)
        console.log(`├─ Last Sent At: ${lastSentAt || 'Never sent'}`)
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
      
      console.log(`├─ Next Sequence: Step ${currentStep + 1} - "${nextSequence.subject}"`)
      console.log(`├─ Timing Days: ${nextSequenceTiming}`)
      
      if (currentStep === 0) {
        // First email: schedule based on contact creation + timing_days
        scheduledDate = new Date(contact.created_at)
        scheduledDate.setDate(scheduledDate.getDate() + nextSequenceTiming)
        console.log(`├─ First Email: Base date is contact creation (${contact.created_at})`)
        console.log(`├─ Initial Scheduled Date: ${scheduledDate.toISOString()}`)
      } else if (lastSentAt) {
        // Subsequent emails: schedule based on last email sent + timing_days
        scheduledDate = new Date(lastSentAt)
        scheduledDate.setDate(scheduledDate.getDate() + nextSequenceTiming)
        console.log(`├─ Follow-up Email: Base date is last sent (${lastSentAt})`)
        console.log(`├─ Initial Scheduled Date: ${scheduledDate.toISOString()}`)
      } else {
        console.log(`└─ ⚠️ No last sent date found, cannot calculate timing`)
        continue
      }
      
      // Determine contact timezone first
      let contactTimezone = contact.timezone
      
      // If no timezone but has location, try to derive timezone from location
      if (!contactTimezone && contact.location) {
        const locationTimezoneMap = {
          'Sydney': 'Australia/Sydney',
          'Melbourne': 'Australia/Melbourne', 
          'Brisbane': 'Australia/Brisbane',
          'Perth': 'Australia/Perth',
          'Adelaide': 'Australia/Adelaide',
          'Tokyo': 'Asia/Tokyo',
          'London': 'Europe/London',
          'New York': 'America/New_York',
          'Los Angeles': 'America/Los_Angeles',
          'Chicago': 'America/Chicago',
          'Boston': 'America/New_York',
          'Seattle': 'America/Los_Angeles',
          'Miami': 'America/New_York',
          'Denver': 'America/Denver',
          'Phoenix': 'America/Phoenix'
        }
        
        for (const [city, timezone] of Object.entries(locationTimezoneMap)) {
          if (contact.location.includes(city)) {
            contactTimezone = timezone
            break
          }
        }
      }
      
      // Add business hours (9-17, avoid weekends) with timezone awareness
      const contactHash = String(contact.id).split('').reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0)
      }, 0)
      const seedValue = (contactHash + (currentStep + 1)) % 1000
      const hour = 9 + (seedValue % 8) // 9-16
      const minute = (seedValue * 7) % 60
      
      // Set the time in the contact's timezone if available
      if (contactTimezone) {
        try {
          // Create a date string in the contact's timezone format
          const dateStr = scheduledDate.toLocaleDateString('en-CA') // YYYY-MM-DD format
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
          
          // Create date in contact's timezone
          const localDateTime = new Date(`${dateStr}T${timeStr}`)
          
          // Convert to UTC by finding the equivalent UTC time
          const testDate = new Date()
          testDate.setFullYear(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate())
          testDate.setHours(hour, minute, 0, 0)
          
          // Get the local time string in contact's timezone
          const localTimeString = testDate.toLocaleString('sv-SE', {timeZone: contactTimezone})
          const localTime = new Date(localTimeString)
          
          // Calculate the timezone offset and adjust
          const offsetMs = testDate.getTime() - localTime.getTime()
          scheduledDate = new Date(testDate.getTime() + offsetMs)
          
          console.log(`🕐 Timezone-aware scheduling: ${hour}:${minute.toString().padStart(2, '0')} ${contactTimezone} = ${scheduledDate.toISOString()}`)
        } catch (error) {
          // Fallback to UTC if timezone conversion fails
          scheduledDate.setHours(hour, minute, 0, 0)
          console.log(`⚠️ Timezone conversion failed for ${contactTimezone}, using UTC: ${scheduledDate.toISOString()}`)
        }
      } else {
        // No timezone info, use UTC
        scheduledDate.setHours(hour, minute, 0, 0)
        console.log(`🕐 UTC scheduling: ${hour}:${minute.toString().padStart(2, '0')} UTC = ${scheduledDate.toISOString()}`)
      }
      
      // Check if contact is in a timezone where it's currently outside business hours
      let skipForTimezone = false
      let timezoneReason = ''
      const now = new Date()
      
      if (contactTimezone) {
        try {
          // Get current time in contact's timezone
          const contactTime = new Date(now.toLocaleString("en-US", {timeZone: contactTimezone}))
          const contactHour = contactTime.getHours()
          
          timezoneReason = `${contactTimezone}: ${contactHour}:${contactTime.getMinutes().toString().padStart(2, '0')} (business hours: 8-18)`
          
          if (contactHour < 8 || contactHour >= 18) {
            skipForTimezone = true
            console.log(`🌏 TIMEZONE BLOCK: ${contact.email_address} - ${timezoneReason} - OUTSIDE business hours`)
          } else {
            console.log(`🌏 TIMEZONE OK: ${contact.email_address} - ${timezoneReason} - INSIDE business hours`)
          }
        } catch (error) {
          // Invalid timezone, fall back to UTC
          console.log(`⚠️ Invalid timezone ${contactTimezone} for ${contact.email_address}, using UTC`)
          timezoneReason = `Invalid timezone ${contactTimezone}, using UTC: ${now.getUTCHours()}:${now.getUTCMinutes().toString().padStart(2, '0')}`
          
          const utcHour = now.getUTCHours()
          if (utcHour < 8 || utcHour >= 18) {
            skipForTimezone = true
            console.log(`🌏 TIMEZONE BLOCK: ${contact.email_address} - ${timezoneReason} - OUTSIDE business hours`)
          } else {
            console.log(`🌏 TIMEZONE OK: ${contact.email_address} - ${timezoneReason} - INSIDE business hours`)
          }
        }
      } else {
        // No timezone info, use UTC with permissive hours (assume always in business hours)
        timezoneReason = `No timezone info (location: ${contact.location || 'Unknown'}) - using UTC: ${now.getUTCHours()}:${now.getUTCMinutes().toString().padStart(2, '0')} - ALLOWING`
        skipForTimezone = false // Be permissive when no timezone info
        console.log(`🌍 TIMEZONE DEFAULT: ${contact.email_address} - ${timezoneReason}`)
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
      
      // Check if it's time to send this email - timezone aware
      let shouldProcess = false
      
      if (!skipForTimezone && emailDateIsDueOrPast) {
        if (contactTimezone) {
          // Convert scheduled time to contact's timezone for comparison
          try {
            const contactNow = new Date(now.toLocaleString("en-US", {timeZone: contactTimezone}))
            const contactScheduledTime = new Date(scheduledDate.toLocaleString("en-US", {timeZone: contactTimezone}))
            shouldProcess = contactScheduledTime <= contactNow
          } catch (error) {
            // Fallback to UTC comparison if timezone conversion fails
            shouldProcess = scheduledDate <= now
          }
        } else {
          // No timezone info, use standard UTC comparison
          shouldProcess = scheduledDate <= now
        }
      }
      
      console.log(`\n📋 PROCESSING DECISION FOR: ${contact.email_address}`)
      console.log(`├─ Current Step: ${currentStep + 1}/${campaignSequences.length}`)
      const totalSequences = campaignSequences.length
      console.log(`├─ Timing Days: ${nextSequenceTiming} days`)
      console.log(`├─ Scheduled Date: ${scheduledDate.toISOString()}`)
      console.log(`├─ Current Time: ${now.toISOString()}`)
      
      // Show timezone-aware time comparison
      if (contactTimezone) {
        try {
          const contactNow = new Date(now.toLocaleString("en-US", {timeZone: contactTimezone}))
          const contactScheduledTime = new Date(scheduledDate.toLocaleString("en-US", {timeZone: contactTimezone}))
          console.log(`├─ Contact Timezone: ${contactTimezone}`)
          console.log(`├─ Contact Current Time: ${contactNow.toLocaleString()}`)
          console.log(`├─ Contact Scheduled Time: ${contactScheduledTime.toLocaleString()}`)
          console.log(`├─ Is Due (Timezone-aware): ${contactScheduledTime <= contactNow ? '✅ YES' : '❌ NO'} (${Math.round((contactNow - contactScheduledTime) / (1000 * 60))} minutes ${contactScheduledTime <= contactNow ? 'overdue' : 'remaining'})`)
        } catch (error) {
          console.log(`├─ Timezone Conversion Error: ${error.message}`)
          console.log(`├─ Is Due (UTC fallback): ${scheduledDate <= now ? '✅ YES' : '❌ NO'} (${Math.round((now - scheduledDate) / (1000 * 60))} minutes ${scheduledDate <= now ? 'overdue' : 'remaining'})`)
        }
      } else {
        console.log(`├─ Is Due (UTC): ${scheduledDate <= now ? '✅ YES' : '❌ NO'} (${Math.round((now - scheduledDate) / (1000 * 60))} minutes ${scheduledDate <= now ? 'overdue' : 'remaining'})`)
      }
      
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
          
          // Simulate the scheduling calculation for John Doe
          const createdAt = new Date(john.created_at);
          const contactHash = String(john.id).split('').reduce((hash, char) => {
            return ((hash << 5) - hash) + char.charCodeAt(0)
          }, 0);
          const seedValue = (contactHash + 1) % 1000; // currentStep + 1 = 1 for first email
          const hour = 9 + (seedValue % 8); // 9-16
          const minute = (seedValue * 7) % 60;
          
          const scheduledDate = new Date(createdAt);
          scheduledDate.setHours(hour, minute, 0, 0);
          
          const now = new Date();
          const sydneyNow = now.toLocaleString('en-US', {timeZone: 'Australia/Sydney'});
          const sydneyScheduled = scheduledDate.toLocaleString('en-US', {timeZone: 'Australia/Sydney'});
          
          return {
            createdAt: createdAt.toISOString(),
            scheduledUTC: scheduledDate.toISOString(),
            scheduledSydney: sydneyScheduled,
            currentUTC: now.toISOString(),
            currentSydney: sydneyNow,
            isDue: scheduledDate <= now,
            minutesDiff: Math.round((now - scheduledDate) / (1000 * 60)),
            hash: contactHash,
            seed: seedValue,
            calcHour: hour,
            calcMinute: minute
          };
        })()
      } : undefined
      
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