import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { deriveTimezoneFromLocation, getBusinessHoursStatusWithActiveDays } from "@/lib/timezone-utils"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 TESTING: Checking how many contacts are due next - ${new Date().toISOString()}`)
    
    // Get all active campaigns
    const { data: campaigns, error: campaignsError } = await supabaseServer
      .from('campaigns')
      .select(`
        *,
        settings:campaign_settings(*)
      `)
      .eq('status', 'Active')
    
    if (campaignsError || !campaigns) {
      return NextResponse.json({ error: 'No active campaigns found' }, { status: 404 })
    }
    
    console.log(`📋 Found ${campaigns.length} active campaigns`)
    
    let totalDueNext = 0
    let totalContacts = 0
    const campaignResults = []
    const detailedLogs = []
    
    for (const campaign of campaigns) {
      console.log(`\n🎯 Checking campaign: ${campaign.name}`)
      
      // Get all contacts for this campaign
      const { data: contacts, error: contactsError } = await supabaseServer
        .from('contacts')
        .select('*')
        .eq('campaign_id', campaign.id)
        .limit(100)
      
      if (contactsError || !contacts) {
        console.log(`❌ Error getting contacts for ${campaign.name}:`, contactsError?.message)
        continue
      }
      
      console.log(`📊 Found ${contacts.length} contacts in ${campaign.name}`)
      totalContacts += contacts.length
      
      // Get campaign settings directly (the join might not be working)
      const { data: campaignSettings, error: settingsError } = await supabaseServer
        .from('campaign_settings')
        .select('*')
        .eq('campaign_id', campaign.id)
        .single()
      
      console.log(`⚙️ Campaign settings for ${campaign.name}:`, campaignSettings)
      if (settingsError) {
        console.log(`❌ Settings error:`, settingsError.message)
      }
      
      let dueNextCount = 0
      const dueContacts = []
      
      for (const contact of contacts) {
        // Skip completed contacts
        if (contact.email_status === 'Completed' || contact.email_status === 'Replied' || 
            contact.email_status === 'Unsubscribed' || contact.email_status === 'Bounced') {
          continue
        }
        
        // Check if contact has next_email_due
        if (!contact.next_email_due) {
          console.log(`⚠️ ${contact.email} has no next_email_due - skipping`)
          continue
        }
        
        // Check timezone and timing - use same logic as automation
        let timezone = deriveTimezoneFromLocation(contact.location) || 'Australia/Sydney'
        
        // Override Perth with Sydney for correct business hours (same as automation)
        if (timezone === 'Australia/Perth') {
          timezone = 'Australia/Sydney'
        }
        const scheduledDate = new Date(contact.next_email_due)
        const now = new Date()
        
        // Convert both times to contact's timezone for proper comparison
        const nowInContactTz = new Date(now.toLocaleString("en-US", { timeZone: timezone }))
        const scheduledInContactTz = new Date(scheduledDate.toLocaleString("en-US", { timeZone: timezone }))
        
        const logEntry = {
          email: contact.email,
          timezone,
          scheduled_sydney: scheduledDate.toLocaleString('en-US', { timeZone: timezone }),
          current_sydney: now.toLocaleString('en-US', { timeZone: timezone }),
          scheduled_utc: scheduledDate.toISOString(),
          current_utc: now.toISOString(),
          time_reached: now >= scheduledDate,
          minutes_until_due: Math.round((scheduledDate.getTime() - now.getTime()) / (1000 * 60))
        }
        
        const isTimeReached = now >= scheduledDate
        
        if (!isTimeReached) {
          logEntry.status = `Due in ${logEntry.minutes_until_due} minutes`
          detailedLogs.push(logEntry)
          continue
        }
        
        // Check business hours using same function as automation
        const activeDays = campaignSettings?.active_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        const businessStatus = getBusinessHoursStatusWithActiveDays(timezone, activeDays, 9, 17)
        
        logEntry.business_hours = businessStatus.isBusinessHours
        logEntry.current_day = 'extracted from businessStatus'
        logEntry.current_hour = 'extracted from businessStatus'
        logEntry.active_days = activeDays
        logEntry.business_status_full = businessStatus
        
        if (!businessStatus.isBusinessHours) {
          logEntry.status = `Outside business hours - ${businessStatus.currentDay} ${businessStatus.currentHour}:xx`
          detailedLogs.push(logEntry)
          continue
        }
        
        logEntry.status = 'DUE NOW!'
        detailedLogs.push(logEntry)
        
        // This contact is due next!
        dueNextCount++
        dueContacts.push({
          email: contact.email,
          nextDue: contact.next_email_due,
          sydneyTime: scheduledDate.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }),
          timezone,
          currentStep: contact.sequence_step || 0
        })
        
        console.log(`✅ ${contact.email} is DUE NOW - scheduled: ${scheduledDate.toLocaleString('en-US', { timeZone: timezone })}`)
      }
      
      totalDueNext += dueNextCount
      campaignResults.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        totalContacts: contacts.length,
        dueNext: dueNextCount,
        activeDays: campaignSettings.active_days,
        dueContacts: dueContacts.slice(0, 5) // Show first 5 due contacts
      })
      
      console.log(`📈 ${campaign.name}: ${dueNextCount} due next out of ${contacts.length} total`)
    }
    
    const now = new Date()
    
    return NextResponse.json({
      success: true,
      currentTime: {
        utc: now.toISOString(),
        sydney: now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
      },
      summary: {
        totalCampaigns: campaigns.length,
        totalContacts,
        totalDueNext
      },
      campaigns: campaignResults,
      detailedLogs: detailedLogs,
      message: `${totalDueNext} contacts are due next and would be processed by automation`
    })
    
  } catch (error: any) {
    console.error('❌ Error in due next count:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}