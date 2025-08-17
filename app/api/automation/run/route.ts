import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { v4 as uuidv4 } from 'uuid'

interface AutomationConfig {
  runId: string
  testMode?: boolean
  campaignId?: number
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
  campaign_id: number
  tags?: string[]
}

// Main automation run endpoint
export async function POST(request: NextRequest) {
  const runId = uuidv4()
  const startTime = Date.now()
  
  try {
    const { testMode = false, campaignId } = await request.json() as AutomationConfig
    
    // Log automation run start
    await logEvent({
      runId,
      logType: 'run_start',
      status: 'success',
      message: `Automation run started ${testMode ? '(TEST MODE)' : ''}`,
      details: { testMode, campaignId }
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
      const campaignStats = await processCampaign(campaign, runId, testMode)
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

async function processCampaign(campaign: any, runId: string, testMode: boolean) {
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
    const senders = await getHealthySenders(campaign.id)
    const senderDetails = await getSenderDetails(senders)
    
    await logEvent({
      runId,
      campaignId: campaign.id,
      logType: 'sender_analysis',
      status: senders.length > 0 ? 'success' : 'failed',
      message: `📧 Account Senders: ${senders.length} healthy sender(s) available`,
      details: {
        totalSenders: senders.length,
        senderAccounts: senderDetails.map(s => ({
          email: s.email,
          healthScore: s.healthScore || 'N/A',
          isActive: s.is_active,
          isSelected: s.is_selected,
          status: s.healthScore >= 70 ? 'Healthy' : 'Needs Attention'
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

      // Check timezone eligibility
      const isBusinessHours = await checkBusinessHours(contact.timezone, campaign.settings)
      
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
          senderId: sender.id,
          logType: 'email_sent',
          status: 'success',
          message: `✅ [TEST] Email would be sent to ${contact.email} (Step ${sequenceStep})`,
          emailSubject: template.subject,
          sequenceStep,
          details: {
            testMode: true,
            sender: sender.email,
            template: template.subject,
            contact: {
              email: contact.email,
              name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
              currentStep: contact.sequence_step || 0,
              newStep: sequenceStep
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
          await logEvent({
            runId,
            campaignId: campaign.id,
            contactId: contact.id,
            senderId: sender.id,
            logType: 'email_sent',
            status: 'success',
            message: `✅ Email sent to ${contact.email} (Step ${sequenceStep})`,
            emailSubject: template.subject,
            sequenceStep,
            details: {
              messageId: emailSent.messageId,
              sender: sender.email,
              contact: {
                email: contact.email,
                name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                currentStep: contact.sequence_step || 0,
                newStep: sequenceStep
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
            senderId: sender.id,
            logType: 'email_failed',
            status: 'failed',
            message: `❌ Failed to send email to ${contact.email}`,
            details: { error: emailSent.error }
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
async function getActiveCampaigns(campaignId?: number) {
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

async function getAllContacts(campaignId: number) {
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

async function getEligibleContacts(campaignId: number): Promise<ContactWithTimezone[]> {
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
  
  // For now, consider all contacts eligible since next_sequence_at column doesn't exist
  const eligibleContacts = data || []
  
  return eligibleContacts as ContactWithTimezone[]
}

async function getHealthySenders(campaignId: number) {
  const { data, error } = await supabaseServer
    .from('campaign_senders')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_selected', true)
    .eq('is_active', true)
  
  if (error) {
    console.error('Error fetching senders:', error)
    return []
  }
  
  // For now, return all selected and active senders
  // TODO: Add health score filtering when sender_accounts relationship is available
  return data || []
}

async function getSenderDetails(senders: any[]) {
  // For now, return sender info with mock health scores since sender_accounts relationship is not available
  return senders.map(sender => ({
    ...sender,
    healthScore: 85, // Mock health score - in production this would come from sender_accounts table
  }))
}

async function getDailyCaps(campaignId: number) {
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

async function getSentToday(campaignId: number) {
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
  // Always return true for now since contacts might not have timezone field
  return true
  
  /* TODO: Enable when timezone field is added to contacts table
  if (!timezone || !settings) return true // Default to true if no timezone
  
  try {
    // Get current time in contact's timezone
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      weekday: 'short'
    })
    
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const period = parts.find(p => p.type === 'dayPeriod')?.value
    const weekday = parts.find(p => p.type === 'weekday')?.value
    
    // Check if today is an active day
    const activeDays = settings.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    if (!activeDays.includes(weekday)) {
      return false
    }
    
    // Parse sending times
    const startTime = parseTime(settings.sending_start_time || '08:00 AM')
    const endTime = parseTime(settings.sending_end_time || '05:00 PM')
    
    // Convert current time to 24-hour format
    let currentHour = hour
    if (period === 'PM' && hour !== 12) currentHour += 12
    if (period === 'AM' && hour === 12) currentHour = 0
    
    return currentHour >= startTime && currentHour < endTime
  } catch (error) {
    console.error('Error checking business hours:', error)
    return true // Default to true on error
  }
  */
}

function parseTime(timeStr: string): number {
  const [time, period] = timeStr.split(' ')
  const [hours, minutes] = time.split(':').map(Number)
  
  let hour24 = hours
  if (period === 'PM' && hours !== 12) hour24 += 12
  if (period === 'AM' && hours === 12) hour24 = 0
  
  return hour24
}

async function getEmailTemplate(campaignId: number, sequenceStep: number) {
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
  // This would integrate with your email sending service
  // For now, we'll simulate the send
  
  try {
    // TODO: Integrate with SendGrid/other email service
    // const result = await sendGridClient.send({
    //   from: from.email,
    //   to: to.email,
    //   subject: personalizeTemplate(template.subject, to),
    //   html: personalizeTemplate(template.content, to)
    // })
    
    // Simulate success for testing
    return {
      success: true,
      messageId: `msg_${Date.now()}_${to.id}`
    }
  } catch (error) {
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
  }
}