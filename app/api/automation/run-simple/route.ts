import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { deriveTimezoneFromLocation, getBusinessHoursStatusWithActiveDays } from "@/lib/timezone-utils"

function calculateNextEmailDue(
  contact: any,
  nextSequence: any,
  campaignSettings: any,
  timezone: string
): Date | null {
  if (!nextSequence) return null
  
  const contactIdString = contact.id.toString()
  
  // Use same hash-based timing logic as UI
  const contactHash = contactIdString.split('').reduce((hash: number, char: string) => {
    return ((hash << 5) - hash) + char.charCodeAt(0)
  }, 0)
  
  const seedValue = (contactHash + 1) % 1000
  const consistentHour = 9 + (seedValue % 8) // 9 AM - 5 PM
  const consistentMinute = (seedValue * 7) % 60
  
  // Calculate scheduled date based on timing_days from the sequence
  const timingDays = nextSequence.timing_days || 0
  let scheduledDate = new Date()
  
  // Add timing days from last contact or now
  if (contact.last_contacted_at) {
    scheduledDate = new Date(contact.last_contacted_at)
  }
  scheduledDate.setDate(scheduledDate.getDate() + timingDays)
  
  // Set consistent time (ALWAYS use the hash-based minute for this contact)
  scheduledDate.setHours(consistentHour, consistentMinute, 0, 0)
  
  // Handle campaign active days
  const activeDays = campaignSettings?.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const dayMap: Record<number, string> = {
    0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat'
  }
  
  // Skip inactive days
  let dayOfWeek = scheduledDate.getDay()
  while (!activeDays.includes(dayMap[dayOfWeek])) {
    scheduledDate.setDate(scheduledDate.getDate() + 1)
    dayOfWeek = scheduledDate.getDay()
  }
  
  return scheduledDate
}

export async function POST(request: NextRequest) {
  try {
    const { testMode = false } = await request.json()
    
    console.log(`🚀 SIMPLE AUTOMATION: Starting - ${new Date().toISOString()}`)
    
    // Get all active campaigns (same as debug API)
    const { data: campaigns, error: campaignsError } = await supabaseServer
      .from('campaigns')
      .select('*')
      .eq('status', 'Active')
    
    if (campaignsError || !campaigns) {
      return NextResponse.json({ error: 'No active campaigns found' }, { status: 404 })
    }
    
    console.log(`📋 Found ${campaigns.length} active campaigns`)
    
    let totalProcessed = 0
    let totalSent = 0
    const results = []
    
    for (const campaign of campaigns) {
      console.log(`\n🎯 Processing campaign: ${campaign.name}`)
      
      // Get campaign settings directly
      const { data: campaignSettings } = await supabaseServer
        .from('campaign_settings')
        .select('*')
        .eq('campaign_id', campaign.id)
        .single()
      
      if (!campaignSettings) {
        console.log(`⚠️ No settings for ${campaign.name}`)
        continue
      }
      
      // Get all contacts for this campaign including sequence_schedule
      const { data: contacts } = await supabaseServer
        .from('contacts')
        .select('*, sequence_schedule')
        .eq('campaign_id', campaign.id)
        .limit(100)
      
      if (!contacts || contacts.length === 0) {
        console.log(`⚠️ No contacts for ${campaign.name}`)
        continue
      }
      
      console.log(`📊 Found ${contacts.length} contacts in ${campaign.name}`)
      
      const dueContacts = []
      
      // Use EXACT same logic as debug API
      for (const contact of contacts) {
        // Skip completed contacts
        if (contact.email_status === 'Completed' || contact.email_status === 'Replied' || 
            contact.email_status === 'Unsubscribed' || contact.email_status === 'Bounced') {
          continue
        }
        
        // Get next due date from sequence_schedule (EXACT same logic as debug API)
        let nextDueDate = null
        let timezone = 'Australia/Sydney'
        
        if (contact.sequence_schedule) {
          const schedule = contact.sequence_schedule
          const currentStep = contact.sequence_step || 0
          const nextStep = schedule.steps.find(step => step.step === currentStep + 1)
          
          if (nextStep) {
            nextDueDate = nextStep.scheduled_date
            timezone = schedule.timezone || 'Australia/Sydney'
            console.log(`📅 ${contact.email} next step ${nextStep.step} due: ${nextStep.scheduled_date}`)
          } else {
            console.log(`⚠️ ${contact.email} has no next step in sequence_schedule - skipping`)
            continue
          }
        } else if (contact.next_email_due) {
          // Fallback to next_email_due
          nextDueDate = contact.next_email_due
          timezone = deriveTimezoneFromLocation(contact.location) || 'Australia/Sydney'
          console.log(`📅 ${contact.email} using fallback next_email_due: ${contact.next_email_due}`)
        } else {
          console.log(`⚠️ ${contact.email} has no sequence_schedule or next_email_due - skipping`)
          continue
        }
        
        // Override Perth with Sydney for correct business hours (same as debug API)
        if (timezone === 'Australia/Perth') {
          timezone = 'Australia/Sydney'
        }
        
        const scheduledDate = new Date(nextDueDate)
        const now = new Date()
        const isTimeReached = now >= scheduledDate
        
        if (!isTimeReached) {
          continue
        }
        
        // Check business hours using exact same function as automation
        const activeDays = campaignSettings.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        const businessStatus = getBusinessHoursStatusWithActiveDays(timezone, activeDays, 9, 17)
        
        if (!businessStatus.isBusinessHours) {
          continue
        }
        
        // This contact is due!
        dueContacts.push(contact)
        console.log(`✅ PROCESSING: ${contact.email} - due since ${scheduledDate.toLocaleString('en-US', { timeZone: timezone })}`)
        
        if (!testMode) {
          const nextStep = (contact.sequence_step || 0) + 1
          
          let updateData: any = {
            last_contacted_at: new Date().toISOString(),
            sequence_step: nextStep
          }
          
          // Get next_email_due from sequence_schedule 
          if (contact.sequence_schedule) {
            const schedule = contact.sequence_schedule
            
            // Find next step for next_email_due (after increment)
            const nextStepInSchedule = schedule.steps.find(step => step.step === nextStep + 1)
            
            if (nextStepInSchedule) {
              updateData.next_email_due = nextStepInSchedule.scheduled_date
              console.log(`📅 Next email for ${contact.email} from schedule: ${new Date(nextStepInSchedule.scheduled_date).toLocaleString('en-US', { timeZone: schedule.timezone })}`)
            } else {
              // No more sequences, mark as completed
              updateData.email_status = 'Completed'
              updateData.next_email_due = null
              console.log(`✅ ${contact.email} completed all sequences`)
            }
          } else {
            // Fallback for contacts without schedule (shouldn't happen)
            console.log(`⚠️ ${contact.email} has no sequence_schedule - keeping old next_email_due`)
          }
          
          // Update the contact
          const { error: updateError } = await supabaseServer
            .from('contacts')
            .update(updateData)
            .eq('id', contact.id)
          
          if (updateError) {
            console.log(`❌ Error updating ${contact.email}:`, updateError.message)
          } else {
            totalSent++
          }
        }
        
        totalProcessed++
      }
      
      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        totalContacts: contacts.length,
        dueContacts: dueContacts.length,
        activeDays: campaignSettings.active_days
      })
      
      console.log(`📈 ${campaign.name}: processed ${dueContacts.length} contacts`)
    }
    
    console.log(`\n🏁 SIMPLE AUTOMATION COMPLETE`)
    console.log(`   Total processed: ${totalProcessed}`)
    console.log(`   Total sent: ${totalSent}`)
    
    return NextResponse.json({
      success: true,
      testMode,
      stats: {
        processed: totalProcessed,
        sent: totalSent,
        campaigns: results.length
      },
      campaigns: results,
      message: `Processed ${totalProcessed} contacts across ${results.length} campaigns`
    })
    
  } catch (error: any) {
    console.error('❌ Simple automation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
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