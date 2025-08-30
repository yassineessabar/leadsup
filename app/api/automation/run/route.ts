import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { v4 as uuidv4 } from 'uuid'
import { deriveTimezoneFromLocation, getBusinessHoursStatusWithActiveDays } from "@/lib/timezone-utils"

interface AutomationConfig {
  runId: string
  testMode?: boolean
  campaignId?: string
  forceUnhealthySenders?: boolean
}

interface ContactWithTimezone {
  id: number
  email: string
  first_name: string
  last_name: string
  company: string
  timezone?: string
  last_contacted_at?: string | null
  sequence_step?: number
  campaign_id: string
  tags?: string[]
}

// Main automation run endpoint
export async function POST(request: NextRequest) {
  const runId = uuidv4()
  const startTime = Date.now()
  
  try {
    const { testMode = false, campaignId, forceUnhealthySenders = false } = await request.json() as AutomationConfig
    
    // Log automation run start
    await logEvent({
      runId,
      logType: 'run_start',
      status: 'success',
      message: `Automation run started ${testMode ? '(TEST MODE)' : ''}${forceUnhealthySenders ? ' - FORCE UNHEALTHY SENDERS' : ''}`,
      details: { testMode, campaignId, forceUnhealthySenders }
    })

    // Step 0: Active Check
    const activeCampaigns = await getActiveCampaigns(campaignId)
    
    await logEvent({
      runId,
      logType: 'active_check',
      status: 'success',
      message: `✅ Active Check: Found ${activeCampaigns.length} active campaign(s)`,
      details: {
        activeCampaigns: activeCampaigns.length,
        campaignNames: activeCampaigns.map(c => c.name)
      }
    })
    
    if (activeCampaigns.length === 0) {
      await logEvent({
        runId,
        logType: 'run_complete',
        status: 'skipped',
        message: 'No active campaigns found',
        executionTimeMs: Date.now() - startTime
      })
      
      return NextResponse.json({ 
        success: true, 
        runId,
        message: 'No active campaigns to process',
        stats: { processed: 0, sent: 0, skipped: 0 }
      })
    }

    let totalStats = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: 0
    }

    // Process each active campaign
    for (const campaign of activeCampaigns) {
      const campaignStats = await processCampaign(campaign, runId, testMode, forceUnhealthySenders)
      totalStats.processed += campaignStats.processed
      totalStats.sent += campaignStats.sent
      totalStats.skipped += campaignStats.skipped
      totalStats.errors += campaignStats.errors
    }

    // Log run completion
    await logEvent({
      runId,
      logType: 'run_complete',
      status: 'success',
      message: `Automation run completed: ${totalStats.sent} sent, ${totalStats.skipped} skipped`,
      details: totalStats,
      executionTimeMs: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      runId,
      stats: totalStats
    })

  } catch (error) {
    console.error('❌ Automation run error:', error)
    
    await logEvent({
      runId,
      logType: 'error',
      status: 'failed',
      message: 'Automation run failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      executionTimeMs: Date.now() - startTime
    })

    return NextResponse.json(
      { success: false, error: 'Automation run failed' },
      { status: 500 }
    )
  }
}

async function processCampaign(campaign: any, runId: string, testMode: boolean, forceUnhealthySenders: boolean = false) {
  const stats = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: 0
  }

  try {
    // Step 1: Daily Cap Check
    const dailyCaps = await getDailyCaps(campaign.id)
    const sentToday = await getSentToday(campaign.id)
    
    await logEvent({
      runId,
      campaignId: campaign.id,
      logType: 'daily_cap_check',
      status: 'success',
      message: `📊 Daily Cap: ${sentToday}/${dailyCaps.maxDaily} emails sent today`,
      details: {
        sentToday,
        maxDaily: dailyCaps.maxDaily,
        remaining: dailyCaps.maxDaily - sentToday,
        maxSequence: dailyCaps.maxSequence
      }
    })
    
    if (sentToday >= dailyCaps.maxDaily) {
      await logEvent({
        runId,
        campaignId: campaign.id,
        logType: 'campaign_skipped',
        status: 'skipped',
        message: `❌ Daily cap reached (${sentToday}/${dailyCaps.maxDaily})`,
        skipReason: 'cap_reached'
      })
      
      stats.skipped = 1
      return stats
    }

    // Step 2: Contact Analysis
    const allContacts = await getAllContacts(campaign.id)
    const contacts = await getEligibleContacts(campaign.id)
    
    // Analyze contact types - use tags or default logic since sequence_step column doesn't exist
    const newContacts = contacts.filter(c => !c.last_contacted_at)
    const inSequenceContacts = contacts.filter(c => c.last_contacted_at)
    
    await logEvent({
      runId,
      campaignId: campaign.id,
      logType: 'contact_analysis',
      status: 'success',
      message: `👥 Contact Analysis: ${contacts.length} eligible (${newContacts.length} new, ${inSequenceContacts.length} in-sequence) out of ${allContacts.length} total`,
      details: {
        totalContacts: allContacts.length,
        eligibleContacts: contacts.length,
        newContacts: newContacts.length,
        inSequenceContacts: inSequenceContacts.length,
        contactBreakdown: {
          new: newContacts.map(c => ({ id: c.id, email: c.email, step: 0 })),
          inSequence: inSequenceContacts.map(c => ({ id: c.id, email: c.email, step: c.sequence_step || 1 }))
        }
      }
    })
    
    if (contacts.length === 0) {
      await logEvent({
        runId,
        campaignId: campaign.id,
        logType: 'campaign_complete',
        status: 'success',
        message: '🔍 No eligible contacts to process'
      })
      
      return stats
    }

    // Step 3: Sender Account Analysis
    const senders = await getHealthySenders(campaign.id, forceUnhealthySenders, runId)
    const senderDetails = await getSenderDetails(senders)
    
    await logEvent({
      runId,
      campaignId: campaign.id,
      logType: 'sender_analysis',
      status: senders.length > 0 ? 'success' : 'failed',
      message: forceUnhealthySenders 
        ? `📧 Account Senders: ${senders.length} sender(s) available (INCLUDING UNHEALTHY - FORCED)`
        : `📧 Account Senders: ${senders.length} healthy sender(s) available`,
      details: {
        totalSenders: senders.length,
        forceUnhealthySenders,
        debugInfo: {
          campaignId: campaign.id,
          campaignSendersFound: senders.length,
          senderEmails: senders.map(s => s.email)
        },
        senderAccounts: senderDetails.map(s => ({
          email: s.email,
          healthScore: s.healthScore || 'N/A',
          isActive: s.is_active,
          isSelected: s.is_selected,
          status: s.healthScore >= 70 ? 'Healthy' : 'Needs Attention',
          forcedIncluded: forceUnhealthySenders && s.healthScore < 70
        }))
      }
    })
    
    if (senders.length === 0) {
      await logEvent({
        runId,
        campaignId: campaign.id,
        logType: 'error',
        status: 'failed',
        message: '❌ No healthy senders available - Campaign requires sender configuration',
        skipReason: 'no_senders'
      })
      
      stats.errors = 1
      return stats
    }

    // Step 4: Process contacts with sender rotation
    let senderIndex = 0
    const remainingCapacity = dailyCaps.maxDaily - sentToday

    for (const contact of contacts) {
      if (stats.sent >= remainingCapacity) {
        await logEvent({
          runId,
          campaignId: campaign.id,
          contactId: contact.id,
          logType: 'email_skipped',
          status: 'skipped',
          message: 'Daily cap would be exceeded',
          skipReason: 'cap_reached'
        })
        
        stats.skipped++
        continue
      }

      stats.processed++

      // Check timezone eligibility using campaign_settings.active_days
      const campaignSettings = campaign.settings?.[0] || {} // Get first settings object from join
      const isBusinessHours = await checkBusinessHours(contact.timezone, campaignSettings)
      
      if (!isBusinessHours) {
        await logEvent({
          runId,
          campaignId: campaign.id,
          contactId: contact.id,
          logType: 'email_skipped',
          status: 'skipped',
          message: `Outside business hours for ${contact.timezone}`,
          skipReason: 'outside_hours',
          timezone: contact.timezone
        })
        
        stats.skipped++
        continue
      }

      // Check if contact is new or in-sequence
      const isNewContact = !contact.last_contacted_at
      const sequenceStep = isNewContact ? 1 : (contact.sequence_step ? contact.sequence_step + 1 : 1)
      
      // Get email template for this sequence step
      const template = await getEmailTemplate(campaign.id, sequenceStep)
      
      if (!template) {
        await logEvent({
          runId,
          campaignId: campaign.id,
          contactId: contact.id,
          logType: 'email_skipped',
          status: 'skipped',
          message: `No template found for step ${sequenceStep}`,
          skipReason: 'no_template'
        })
        
        stats.skipped++
        continue
      }

      // Select sender (round-robin)
      const sender = senders[senderIndex % senders.length]
      senderIndex++

      // Send email (or simulate in test mode)
      if (testMode) {
        await logEvent({
          runId,
          campaignId: campaign.id,
          contactId: contact.id,
          senderId: sender.sender_account_id || null,
          logType: 'email_sent',
          status: 'success',
          message: `✅ [TEST] Email would be sent to ${contact.email} (Step ${sequenceStep})`,
          emailSubject: template.subject,
          sequenceStep,
          timezone: contact.timezone,
          details: {
            testMode: true,
            sender: sender.email,
            template: template.subject,
            nextEmailIn: `${template.timing_days || 3} days`,
            campaignSenderId: sender.campaign_sender_id,
            contact: {
              email: contact.email,
              name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
              currentStep: contact.sequence_step || 0,
              newStep: sequenceStep,
              timezone: contact.timezone
            }
          }
        })

        // Simulate status update in test mode
        await logEvent({
          runId,
          campaignId: campaign.id,
          contactId: contact.id,
          logType: 'contact_status_update',
          status: 'success',
          message: `📝 Status Updated: ${contact.email} moved from step ${contact.sequence_step || 0} to step ${sequenceStep}`,
          details: {
            contactEmail: contact.email,
            previousStep: contact.sequence_step || 0,
            newStep: sequenceStep,
            nextEmailIn: `${template.timing_days || 3} days`,
            testMode: true
          }
        })
        
        stats.sent++
      } else {
        const emailSent = await sendEmail({
          from: sender,
          to: contact,
          template,
          campaign
        })

        if (emailSent.success) {
          const isSimulation = emailSent.simulation || emailSent.messageId?.startsWith('simulated_') || emailSent.messageId?.startsWith('placeholder_')
          
          await logEvent({
            runId,
            campaignId: campaign.id,
            contactId: contact.id,
            senderId: sender.sender_account_id || null,
            logType: 'email_sent',
            status: 'success',
            message: isSimulation 
              ? `🧪 [SIMULATED] Email simulated for ${contact.email} (Step ${sequenceStep}) - No actual email sent`
              : `✅ Email sent to ${contact.email} (Step ${sequenceStep})`,
            emailSubject: template.subject,
            sequenceStep,
            timezone: contact.timezone,
            details: {
              messageId: emailSent.messageId,
              sender: sender.email,
              nextEmailIn: `${template.timing_days || 3} days`,
              simulation: isSimulation,
              campaignSenderId: sender.campaign_sender_id,
              contact: {
                email: contact.email,
                name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                currentStep: contact.sequence_step || 0,
                newStep: sequenceStep,
                timezone: contact.timezone
              }
            }
          })

          // Update contact status
          await updateContactStatus(contact.id, sequenceStep, template.timing_days)
          
          // Log status update
          await logEvent({
            runId,
            campaignId: campaign.id,
            contactId: contact.id,
            logType: 'contact_status_update',
            status: 'success',
            message: `📝 Status Updated: ${contact.email} moved from step ${contact.sequence_step || 0} to step ${sequenceStep}`,
            details: {
              contactEmail: contact.email,
              previousStep: contact.sequence_step || 0,
              newStep: sequenceStep,
              nextEmailIn: `${template.timing_days || 3} days`
            }
          })
          
          stats.sent++
        } else {
          await logEvent({
            runId,
            campaignId: campaign.id,
            contactId: contact.id,
            senderId: sender.sender_account_id || null,
            logType: 'email_failed',
            status: 'failed',
            message: `❌ Failed to send email to ${contact.email}`,
            details: { 
              error: emailSent.error,
              campaignSenderId: sender.campaign_sender_id
            }
          })
          
          stats.errors++
        }
      }
    }

    // Log final campaign status
    await logEvent({
      runId,
      campaignId: campaign.id,
      logType: 'campaign_status_update',
      status: 'success',
      message: `✅ Status Updated: Campaign processed - ${stats.sent} emails sent, ${stats.skipped} skipped, ${stats.errors} errors`,
      details: {
        finalStats: stats,
        contactsProcessed: stats.processed,
        emailsSent: stats.sent,
        contactsSkipped: stats.skipped,
        errors: stats.errors
      }
    })

  } catch (error) {
    console.error(`❌ Error processing campaign ${campaign.id}:`, error)
    await logEvent({
      runId,
      campaignId: campaign.id,
      logType: 'error',
      status: 'failed',
      message: `Campaign processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
    stats.errors++
  }

  return stats
}

// Helper functions
async function getActiveCampaigns(campaignId?: string) {
  let query = supabaseServer
    .from('campaigns')
    .select(`
      *,
      settings:campaign_settings(*)
    `)
    .eq('status', 'Active')
  
  if (campaignId) {
    query = query.eq('id', campaignId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching active campaigns:', error)
    return []
  }
  
  return data || []
}

async function getAllContacts(campaignId: string) {
  const { data, error } = await supabaseServer
    .from('contacts')
    .select('*')
    .eq('campaign_id', campaignId)
  
  if (error) {
    console.error('Error fetching all contacts:', error)
    return []
  }
  
  return data || []
}

// Replicate the UI's "Due next" logic for automation
function calculateContactIsDue(contact: any, campaignSettings: any, campaignSequences: any[], timezone: string): boolean {
  if (!campaignSettings || !campaignSequences || campaignSequences.length === 0) {
    console.log(`🔍 AUTOMATION: Missing data for ${contact.email} - settings:${!!campaignSettings} sequences:${campaignSequences?.length || 0}`)
    return false
  }
  
  // Get current sequence step
  const currentStep = contact.sequence_step || 0
  
  // Check if sequence is complete
  if (currentStep >= campaignSequences.length) {
    console.log(`🔍 AUTOMATION: ${contact.email} sequence complete (step ${currentStep}/${campaignSequences.length})`)
    return false
  }
  
  // Get next sequence step (either step 1 for new contacts, or next step for in-sequence)
  const nextStep = currentStep === 0 ? 1 : currentStep + 1
  const sequence = campaignSequences.find(s => s.step_number === nextStep)
  
  if (!sequence) {
    console.log(`🔍 AUTOMATION: ${contact.email} no sequence found for step ${nextStep}`)
    return false
  }
  
  const timingDays = parseInt(sequence.timing_days || sequence.timing || '0')
  
  // Calculate when this email should be sent
  let scheduledDate: Date
  
  if (timingDays === 0) {
    // Immediate email - schedule for a consistent time today
    scheduledDate = new Date()
    scheduledDate.setHours(9, 0, 0, 0) // 9 AM consistent time
  } else {
    // Delayed email - calculate based on last contact date + timing
    if (!contact.last_contacted_at) {
      return false // Can't calculate timing without last contact date
    }
    
    const lastContactDate = new Date(contact.last_contacted_at)
    scheduledDate = new Date(lastContactDate)
    scheduledDate.setDate(scheduledDate.getDate() + timingDays)
    scheduledDate.setHours(9, 0, 0, 0) // 9 AM consistent time
  }
  
  // Check if scheduled time has passed (isTimeReached)
  const now = new Date()
  const nowInContactTz = new Date(now.toLocaleString("en-US", { timeZone: timezone }))
  const scheduledInContactTz = new Date(scheduledDate.toLocaleString("en-US", { timeZone: timezone }))
  
  const isTimeReached = nowInContactTz >= scheduledInContactTz
  
  // Check if it's business hours with campaign active_days
  const activeDays = campaignSettings?.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const businessStatus = getBusinessHoursStatusWithActiveDays(timezone, activeDays, 9, 17)
  
  const isDue = isTimeReached && businessStatus.isBusinessHours
  
  console.log(`🔍 AUTOMATION DUE CHECK: ${contact.email}`)
  console.log(`   Sequence step: ${currentStep} -> ${nextStep}`)
  console.log(`   Timing days: ${timingDays}`)
  console.log(`   Scheduled: ${scheduledDate.toLocaleString('en-US', { timeZone: timezone })}`)
  console.log(`   Current: ${now.toLocaleString('en-US', { timeZone: timezone })}`)
  console.log(`   isTimeReached: ${isTimeReached}`)
  console.log(`   activeDays: [${activeDays.join(',')}]`)
  console.log(`   businessStatus: ${JSON.stringify(businessStatus)}`)
  console.log(`   Final isDue: ${isDue}`)
  
  return isDue
}

async function getEligibleContacts(campaignId: string): Promise<ContactWithTimezone[]> {
  // Get campaign settings first to check active_days
  const { data: campaignSettings } = await supabaseServer
    .from('campaign_settings')
    .select('*')
    .eq('campaign_id', campaignId)
    .single()
    
  // Get campaign sequences for "Due next" calculation
  const { data: campaignSequences } = await supabaseServer
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('step_number', { ascending: true })
  
  const { data, error } = await supabaseServer
    .from('contacts')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })
    .limit(100)
  
  if (error) {
    console.error('Error fetching contacts:', error)
    return []
  }
  
  const allContacts = data || []
  
  // Filter contacts to only those that are "Due next" using same logic as UI
  const eligibleContacts = allContacts.filter(contact => {
    // Add derived timezone from location for each contact
    let timezone = contact.timezone || deriveTimezoneFromLocation(contact.location) || 'Australia/Sydney'
    
    // Override Perth with Sydney for correct business hours (same as UI)
    if (timezone === 'Australia/Perth') {
      timezone = 'Australia/Sydney'
    }
    
    // Calculate if this contact is "Due next" using UI logic
    const isDue = calculateContactIsDue(contact, campaignSettings, campaignSequences, timezone)
    
    console.log(`🔍 AUTOMATION: Contact ${contact.email} isDue: ${isDue}`)
    return isDue
  })
  
  // Add derived timezone to eligible contacts
  const contactsWithTimezones = eligibleContacts.map(contact => {
    let timezone = contact.timezone || deriveTimezoneFromLocation(contact.location) || 'Australia/Sydney'
    if (timezone === 'Australia/Perth') {
      timezone = 'Australia/Sydney'
    }
    return {
      ...contact,
      timezone
    }
  })
  
  console.log(`🔍 AUTOMATION: Filtered ${allContacts.length} total contacts down to ${eligibleContacts.length} "Due next" contacts`)
  
  return contactsWithTimezones as ContactWithTimezone[]
}

async function getHealthySenders(campaignId: string, forceUnhealthySenders: boolean = false, runId: string = 'unknown') {
  // Get campaign senders first
  const { data: campaignSenders, error } = await supabaseServer
    .from('campaign_senders')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_selected', true)
    .eq('is_active', true)
  
  if (error) {
    console.error('Error fetching campaign senders:', error)
    return []
  }
  
  if (!campaignSenders || campaignSenders.length === 0) {
    console.log(`No active senders found for campaign ${campaignId}`)
    return []
  }
  
  // Get corresponding sender accounts by email
  const senderEmails = campaignSenders.map(s => s.email)
  const { data: senderAccounts, error: senderAccountsError } = await supabaseServer
    .from('sender_accounts')
    .select('id, email, is_active')
    .in('email', senderEmails)
    
  // Get real health scores for sender accounts
  let healthScores: Record<string, any> = {}
  try {
    if (senderAccounts && senderAccounts.length > 0) {
      const senderIds = senderAccounts.map(sa => sa.id)
      const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sender-accounts/health-score?senderIds=${senderIds.join(',')}`, {
        headers: {
          'Cookie': 'internal-api-call=true' // Internal API call
        }
      })
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        if (healthData.success && healthData.healthScores) {
          healthScores = healthData.healthScores
        }
      }
    }
  } catch (error) {
    console.error('Error fetching health scores:', error)
  }

  // Debug log this critical step
  await logEvent({
    runId,
    campaignId,
    logType: 'debug',
    status: 'success',
    message: `🔍 DEBUG: Mapping campaign senders to accounts with health scores`,
    details: {
      campaignSendersEmails: senderEmails,
      senderAccountsFound: senderAccounts?.length || 0,
      senderAccountsEmails: senderAccounts?.map(sa => sa.email) || [],
      senderAccountsError: senderAccountsError?.message,
      healthScoresFetched: Object.keys(healthScores).length,
      healthScoreData: Object.entries(healthScores).map(([id, data]) => ({
        senderId: id,
        score: data?.score || 'unknown',
        email: senderAccounts?.find(sa => sa.id === id)?.email
      }))
    }
  })

  // Map campaign senders to their corresponding sender accounts with real health scores
  const allSenders = campaignSenders
    .map(campaignSender => {
      const senderAccount = senderAccounts?.find(sa => sa.email === campaignSender.email)
      if (senderAccount) {
        // Get real health score or default to low score (40) to be conservative
        const healthData = healthScores[senderAccount.id]
        const healthScore = healthData?.score || 40 // Conservative default for unknown health
        
        return {
          ...campaignSender,
          sender_account_id: senderAccount.id,
          campaign_sender_id: campaignSender.id,
          health_score: healthScore
        }
      }
      return null
    })
    .filter(Boolean)
  
  // Filter based on health scores unless forced
  const validSenders = forceUnhealthySenders 
    ? allSenders // Include all senders regardless of health
    : allSenders.filter(sender => (sender.health_score || 0) >= 70) // Only healthy senders
  
  const unhealthyCount = allSenders.length - validSenders.length
  
  console.log(`DEBUG: Campaign senders:`, campaignSenders?.length || 0, campaignSenders?.map(cs => cs.email))
  console.log(`DEBUG: Sender accounts found:`, senderAccounts?.length || 0, senderAccounts?.map(sa => sa.email))
  console.log(`DEBUG: Health scores fetched:`, Object.keys(healthScores).length, Object.entries(healthScores).map(([id, data]) => ({ id, score: data?.score })))
  console.log(`DEBUG: All mapped senders:`, allSenders.length, allSenders.map(s => ({ email: s.email, health_score: s.health_score, isHealthy: s.health_score >= 70 })))
  console.log(`DEBUG: Filtering - forceUnhealthySenders: ${forceUnhealthySenders}, threshold: 70`)
  console.log(`Found ${validSenders.length} ${forceUnhealthySenders ? 'total' : 'healthy'} senders for campaign ${campaignId}${unhealthyCount > 0 ? ` (${unhealthyCount} unhealthy ${forceUnhealthySenders ? 'included' : 'excluded'})` : ''}`)
  
  return validSenders
}

async function getSenderDetails(senders: any[]) {
  // For now, return sender info with mock health scores since sender_accounts relationship is not available
  return senders.map(sender => ({
    ...sender,
    healthScore: 85, // Mock health score - in production this would come from sender_accounts table
  }))
}

async function getDailyCaps(campaignId: string) {
  const { data } = await supabaseServer
    .from('campaign_settings')
    .select('daily_contacts_limit, daily_sequence_limit')
    .eq('campaign_id', campaignId)
    .single()
  
  return {
    maxDaily: data?.daily_contacts_limit || 35,
    maxSequence: data?.daily_sequence_limit || 100
  }
}

async function getSentToday(campaignId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count, error } = await supabaseServer
    .from('automation_logs')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('log_type', 'email_sent')
    .eq('status', 'success')
    .gte('created_at', today.toISOString())
  
  if (error) {
    console.error('Error counting sent emails:', error)
    return 0
  }
  
  return count || 0
}

async function checkBusinessHours(timezone: string, settings: any) {
  if (!timezone || !settings) return true // Default to true if no timezone
  
  try {
    // Get current time in contact's timezone
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short'
    })
    
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const weekday = parts.find(p => p.type === 'weekday')?.value
    
    // Check if today is an active day using campaign_settings.active_days
    const activeDays = settings.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    if (!activeDays.includes(weekday)) {
      console.log(`⏰ AUTOMATION: ${weekday} not in active_days [${activeDays.join(',')}] for timezone ${timezone}`)
      return false
    }
    
    // Check if within business hours (9 AM - 5 PM to match UI)
    const isWithinHours = hour >= 9 && hour < 17
    
    console.log(`⏰ AUTOMATION: Business hours check for ${timezone}:`)
    console.log(`   Current day: ${weekday}`)
    console.log(`   Active days: [${activeDays.join(',')}]`)
    console.log(`   Current hour: ${hour}`)
    console.log(`   Within hours (9-17): ${isWithinHours}`)
    console.log(`   Final result: ${isWithinHours}`)
    
    return isWithinHours
  } catch (error) {
    console.error('Error checking business hours:', error)
    return true // Default to true on error
  }
}

function parseTime(timeStr: string): number {
  const [time, period] = timeStr.split(' ')
  const [hours, minutes] = time.split(':').map(Number)
  
  let hour24 = hours
  if (period === 'PM' && hours !== 12) hour24 += 12
  if (period === 'AM' && hours === 12) hour24 = 0
  
  return hour24
}

async function getEmailTemplate(campaignId: string, sequenceStep: number) {
  const { data, error } = await supabaseServer
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('step_number', sequenceStep)
    .single()
  
  if (error) {
    console.error('Error fetching email template:', error)
    return null
  }
  
  return data
}

async function sendEmail({ from, to, template, campaign }: any) {
  // Check if we should actually send emails or just simulate
  const SIMULATION_MODE = process.env.EMAIL_SIMULATION_MODE !== 'false'
  
  try {
    if (SIMULATION_MODE) {
      // Simulate email sending for testing/development
      console.log(`🧪 SIMULATED EMAIL SEND:`)
      console.log(`   From: ${from.email}`)
      console.log(`   To: ${to.email}`)
      console.log(`   Subject: ${template.subject}`)
      console.log(`   Campaign: ${campaign.name}`)
      
      return {
        success: true,
        messageId: `simulated_${Date.now()}_${to.id}`,
        simulation: true
      }
    }
    
    // SendGrid integration for real email sending
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      
      // Personalize the template content
      const personalizedSubject = template.subject?.replace(/\{\{companyName\}\}/g, to.company || 'your company') || 'Email from LeadsUp'
      let personalizedContent = template.content?.replace(/\{\{companyName\}\}/g, to.company || 'your company')
        .replace(/\{\{firstName\}\}/g, to.first_name || 'there')
        .replace(/\{\{lastName\}\}/g, to.last_name || '') || 'Hello from LeadsUp!'
      
      // Convert line breaks to HTML for email display
      personalizedContent = personalizedContent
        .replace(/\r\n/g, '\n')  // Convert Windows line breaks
        .replace(/\r/g, '\n')    // Convert Mac line breaks
        .replace(/\n\n+/g, '<br/><br/>')  // Convert paragraph breaks (double+ newlines)
        .replace(/\n/g, '<br/>')  // Convert remaining single newlines
      
      const msg = {
        to: to.email,
        from: from.email,
        subject: personalizedSubject,
        html: personalizedContent,
        text: personalizedContent.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '') // Convert br tags to line breaks, then strip HTML
      }
      
      console.log(`📧 SENDING REAL EMAIL:`)
      console.log(`   From: ${from.email}`)
      console.log(`   To: ${to.email}`)
      console.log(`   Subject: ${personalizedSubject}`)
      
      const result = await sgMail.send(msg)
      
      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id'] || `sg_${Date.now()}_${to.id}`,
        simulation: false
      }
    }
    
    // Fallback: return simulation if no email service is configured
    console.log(`⚠️  No email service configured. Set SENDGRID_API_KEY to enable real email sending.`)
    return {
      success: true,
      messageId: `placeholder_${Date.now()}_${to.id}`,
      simulation: true
    }
    
  } catch (error) {
    console.error('❌ Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

async function updateContactStatus(contactId: number, sequenceStep: number, timingDays: number) {
  
  // Try to update contact with available fields only
  const updateData: any = {
    updated_at: new Date().toISOString()
  }
  
  // Check what columns exist by trying to select them
  const { data: contact } = await supabaseServer
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()
  
  if (contact) {
    // Only update fields that exist in the table
    if ('tags' in contact) {
      const currentTags = contact.tags || []
      const updatedTags = Array.from(new Set([...currentTags, 'in_sequence']))
      if (currentTags.includes('new')) {
        const index = updatedTags.indexOf('new')
        updatedTags.splice(index, 1)
      }
      updateData.tags = updatedTags
    }
    
    if ('sequence_step' in contact) {
      updateData.sequence_step = sequenceStep
    }
    
    if ('last_contacted_at' in contact) {
      updateData.last_contacted_at = new Date().toISOString()
    }
    
    
    if ('email_sent_count' in contact) {
      updateData.email_sent_count = (contact.email_sent_count || 0) + 1
    }
  }
  
  const { error } = await supabaseServer
    .from('contacts')
    .update(updateData)
    .eq('id', contactId)
  
  if (error) {
    console.error('Error updating contact status:', error)
  }
}

async function logEvent(logData: any) {
  const { error } = await supabaseServer
    .from('automation_logs')
    .insert({
      run_id: logData.runId,
      campaign_id: logData.campaignId || null,
      contact_id: logData.contactId || null,
      sender_id: logData.senderId || null,
      log_type: logData.logType,
      status: logData.status,
      message: logData.message,
      details: logData.details || {},
      sequence_step: logData.sequenceStep || null,
      email_subject: logData.emailSubject || null,
      skip_reason: logData.skipReason || null,
      execution_time_ms: logData.executionTimeMs || null,
      timezone: logData.timezone || null,
      created_at: new Date().toISOString()
    })
  
  if (error) {
    console.error('Error logging event:', error)
    console.error('Failed log data:', {
      senderId: logData.senderId,
      logType: logData.logType,
      message: logData.message
    })
  }
}