import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { deriveTimezoneFromLocation, getBusinessHoursStatusWithActiveDays } from "@/lib/timezone-utils"

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
      
      // Get all contacts for this campaign
      const { data: contacts } = await supabaseServer
        .from('contacts')
        .select('*')
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
        
        // Skip contacts without next_email_due
        if (!contact.next_email_due) {
          continue
        }
        
        // Check timezone and timing - EXACT same as debug API
        let timezone = deriveTimezoneFromLocation(contact.location) || 'Australia/Sydney'
        
        // Override Perth with Sydney (same as automation)
        if (timezone === 'Australia/Perth') {
          timezone = 'Australia/Sydney'
        }
        
        const scheduledDate = new Date(contact.next_email_due)
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
          // In real mode, update the contact (mark as contacted)
          const { error: updateError } = await supabaseServer
            .from('contacts')
            .update({ 
              last_contacted_at: new Date().toISOString(),
              sequence_step: (contact.sequence_step || 0) + 1
            })
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