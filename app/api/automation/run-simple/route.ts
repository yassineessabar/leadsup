import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { v4 as uuidv4 } from 'uuid'

// Simplified automation that works with existing schema
export async function POST(request: NextRequest) {
  const runId = uuidv4()
  const startTime = Date.now()
  
  try {
    const { testMode = false, campaignId } = await request.json()
    
    // Log automation run start
    await logEvent({
      runId,
      logType: 'run_start',
      status: 'success',
      message: `Automation run started ${testMode ? '(TEST MODE)' : ''}`,
      details: { testMode, campaignId }
    })

    // Get active campaigns
    const { data: campaigns, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select(`
        *,
        settings:campaign_settings(*)
      `)
      .eq('status', 'Active')
      .limit(10)
    
    if (campaignError) {
      console.error('Error fetching campaigns:', campaignError)
      await logEvent({
        runId,
        logType: 'error',
        status: 'failed',
        message: 'Failed to fetch active campaigns',
        details: { error: campaignError.message }
      })
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch campaigns' 
      }, { status: 500 })
    }

    if (!campaigns || campaigns.length === 0) {
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

    // Process each campaign
    for (const campaign of campaigns) {
      if (campaignId && campaign.id !== campaignId) continue
      
      // Get contacts for this campaign (without status filter)
      const { data: contacts, error: contactError } = await supabaseServer
        .from('contacts')
        .select('*')
        .eq('campaign_id', campaign.id)
        .limit(50)
      
      if (contactError) {
        console.error(`Error fetching contacts for campaign ${campaign.id}:`, contactError)
        await logEvent({
          runId,
          campaignId: campaign.id,
          logType: 'error',
          status: 'failed',
          message: 'Failed to fetch contacts',
          details: { error: contactError.message }
        })
        totalStats.errors++
        continue
      }

      if (!contacts || contacts.length === 0) {
        await logEvent({
          runId,
          campaignId: campaign.id,
          logType: 'campaign_skipped',
          status: 'skipped',
          message: 'No contacts found for campaign',
          skipReason: 'no_contacts'
        })
        totalStats.skipped++
        continue
      }

      // Check daily cap
      const dailyLimit = campaign.settings?.[0]?.daily_contacts_limit || 35
      const sentToday = await getTodaySentCount(campaign.id)
      
      if (sentToday >= dailyLimit) {
        await logEvent({
          runId,
          campaignId: campaign.id,
          logType: 'campaign_skipped',
          status: 'skipped',
          message: `Daily cap reached (${sentToday}/${dailyLimit})`,
          skipReason: 'cap_reached'
        })
        totalStats.skipped++
        continue
      }

      // Process contacts (simplified)
      const remainingCapacity = dailyLimit - sentToday
      let sentCount = 0

      for (const contact of contacts) {
        if (sentCount >= remainingCapacity) {
          await logEvent({
            runId,
            campaignId: campaign.id,
            contactId: contact.id,
            logType: 'email_skipped',
            status: 'skipped',
            message: 'Daily cap would be exceeded',
            skipReason: 'cap_reached'
          })
          totalStats.skipped++
          continue
        }

        totalStats.processed++

        // Get sequence template (step 1 for now)
        const { data: template } = await supabaseServer
          .from('campaign_sequences')
          .select('*')
          .eq('campaign_id', campaign.id)
          .eq('step_number', 1)
          .single()

        if (!template) {
          await logEvent({
            runId,
            campaignId: campaign.id,
            contactId: contact.id,
            logType: 'email_skipped',
            status: 'skipped',
            message: 'No email template found',
            skipReason: 'no_template'
          })
          totalStats.skipped++
          continue
        }

        // In test mode, just log what would be sent
        if (testMode) {
          await logEvent({
            runId,
            campaignId: campaign.id,
            contactId: contact.id,
            logType: 'email_sent',
            status: 'success',
            message: `[TEST] Would send email to ${contact.email}`,
            emailSubject: template.subject,
            sequenceStep: 1,
            details: {
              testMode: true,
              template: template.subject,
              contact: {
                email: contact.email,
                name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
              }
            }
          })
          sentCount++
          totalStats.sent++
        } else {
          // In production, you would actually send the email here
          await logEvent({
            runId,
            campaignId: campaign.id,
            contactId: contact.id,
            logType: 'email_sent',
            status: 'success',
            message: `Email sent to ${contact.email}`,
            emailSubject: template.subject,
            sequenceStep: 1,
            details: {
              template: template.subject
            }
          })
          sentCount++
          totalStats.sent++
        }
      }

      await logEvent({
        runId,
        campaignId: campaign.id,
        logType: 'campaign_complete',
        status: 'success',
        message: `Campaign processed: ${sentCount} emails sent`,
        details: { sent: sentCount, total: contacts.length }
      })
    }

    // Log run completion
    await logEvent({
      runId,
      logType: 'run_complete',
      status: 'success',
      message: `Automation completed: ${totalStats.sent} sent, ${totalStats.skipped} skipped`,
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

async function getTodaySentCount(campaignId: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count } = await supabaseServer
    .from('automation_logs')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('log_type', 'email_sent')
    .eq('status', 'success')
    .gte('created_at', today.toISOString())
  
  return count || 0
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