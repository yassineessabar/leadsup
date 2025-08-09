import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth helper function
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    // Check against environment variables
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// GET - Fetch campaigns and contacts that need processing
export async function GET(request: NextRequest) {
  // Validate authentication
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { 
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="n8n API"'
        }
      }
    )
  }
  try {
    console.log('🤖 Processing pending campaigns for n8n...')
    
    // Get current timestamp
    const now = new Date()
    const currentUTCHour = now.getUTCHours()
    const currentMinute = now.getMinutes()
    const currentDay = now.toLocaleDateString('en', { weekday: 'short' }) // Mon, Tue, etc.
    
    console.log(`📅 Current day: ${currentDay}, UTC Hour: ${currentUTCHour}`)
    
    // Define timezone mappings with UTC offsets
    const timezoneOffsets = {
      'T1': -5,  // EST (UTC-5)
      'T2': -6,  // CST (UTC-6)
      'T3': 0,   // GMT (UTC+0)
      'T4': 8    // SGT (UTC+8)
    }
    
    // Find active campaigns with their settings
    const { data: activeCampaigns, error: campaignsError } = await supabaseServer
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        user_id,
        type,
        trigger_type,
        campaign_settings (
          daily_contacts_limit,
          daily_sequence_limit,
          active_days,
          sending_start_time,
          sending_end_time
        )
      `)
      .eq('status', 'Active')
    
    if (campaignsError) {
      console.error('❌ Error fetching active campaigns:', campaignsError)
      return NextResponse.json({ success: false, error: campaignsError.message }, { status: 500 })
    }

    if (!activeCampaigns || activeCampaigns.length === 0) {
      console.log('❌ No active campaigns found')
      return NextResponse.json({ success: true, data: [] })
    }
    
    console.log(`✅ Found ${activeCampaigns.length} active campaigns:`, 
      activeCampaigns.map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: c.type,
        trigger_type: c.trigger_type,
        hasSettings: !!c.campaign_settings,
        settings: c.campaign_settings
      }))
    )

    const campaignsToProcess = []

    // Process each campaign
    for (const campaign of activeCampaigns) {
      // Get settings from campaign_settings table
      const settings = campaign.campaign_settings
      
      if (!settings || !settings.active_days) {
        console.log(`❌ Skipping campaign ${campaign.name} - No campaign_settings or active_days found`)
        continue
      }

      // Check if today is an active day
      console.log(`📅 Campaign ${campaign.name}: currentDay=${currentDay}, activeDays=${JSON.stringify(settings.active_days)}`)
      if (!settings.active_days?.includes(currentDay)) {
        console.log(`❌ Skipping campaign ${campaign.name} - Not an active day (${currentDay})`)
        continue
      }

      // We'll check sending hours per contact timezone below

      // Get active senders for this campaign
      const { data: senders, error: sendersError } = await supabaseServer
        .from('campaign_senders')
        .select(`
          id,
          email,
          name,
          health_score,
          daily_limit,
          is_active,
          access_token,
          refresh_token,
          expires_at
        `)
        .eq('campaign_id', campaign.id)
        .eq('is_active', true)
      
      if (sendersError) {
        console.error(`❌ Error fetching senders for campaign ${campaign.name}:`, sendersError)
        continue
      }
      
      if (!senders || senders.length === 0) {
        console.log(`❌ Skipping campaign ${campaign.name} - No active senders found`)
        continue
      }
      
      console.log(`📧 Found ${senders.length} active senders for ${campaign.name}:`, 
        senders.map(s => ({ email: s.email, health_score: s.health_score, daily_limit: s.daily_limit }))
      )

      // Get campaign sequences
      const { data: sequences, error: sequencesError } = await supabaseServer
        .from('campaign_sequences')
        .select(`
          id,
          step_number,
          subject,
          content,
          timing_days,
          outreach_method,
          sequence_number,
          sequence_step,
          title
        `)
        .eq('campaign_id', campaign.id)
        .eq('is_active', true)
        .order('step_number')

      if (sequencesError) {
        console.error(`❌ Error fetching sequences for campaign ${campaign.name}:`, sequencesError)
        continue
      }

      if (!sequences || sequences.length === 0) {
        console.log(`❌ Skipping campaign ${campaign.name} - No active sequences found`)
        continue
      }

      console.log(`📝 Found ${sequences.length} active sequences for ${campaign.name}`)

      // Get prospects that need processing with timezone information
      const { data: contactsData } = await supabaseServer
        .from('prospects')
        .select(`
          id,
          email_address,
          first_name,
          last_name,
          time_zone,
          company_name,
          job_title
        `)
        .eq('campaign_id', campaign.id)
        .not('opted_out', 'eq', true)

      const contactsToProcess = []
      const senderUsage = new Map() // Track daily usage per sender

      // Check each contact for due sequences
      for (const contact of contactsData || []) {
        // Map time_zone to timezone groups - for now assume all are T1 (EST)
        // You may want to map based on contact.time_zone field later
        const contactTimezone = 'T1'  // Default to EST for now
        const timezoneOffset = timezoneOffsets[contactTimezone] || -5
        
        // Calculate local time for contact
        const contactLocalHour = (currentUTCHour + timezoneOffset + 24) % 24
        
        // Parse sending hours from settings
        const startHour = parseInt(settings.sending_start_time?.split(':')[0] || '9')
        const endHour = parseInt(settings.sending_end_time?.split(':')[0] || '17')
        
        // Check if it's within sending hours for this contact's timezone
        const isWithinSendingHours = contactLocalHour >= startHour && contactLocalHour < endHour
        
        if (!isWithinSendingHours) {
          console.log(`⏰ Skipping contact ${contact.email_address} - Local time ${contactLocalHour}:00 not within ${startHour}:00-${endHour}:00`)
          continue
        }
        
        // TODO: Implement proper sequence tracking
        // For now, we'll use the first sequence step for all new contacts
        // In a complete system, you'd track prospect_sequence_progress to know which step is next
        
        // Get the first sequence step (step_number = 1 or minimum step_number)
        const nextSequence = sequences.find(s => s.step_number === 1) || sequences[0]
        
        if (!nextSequence) {
          console.log(`⚠️ Skipping contact ${contact.email_address} - No sequence step available`)
          continue
        }
        
        console.log(`📧 Assigning sequence step ${nextSequence.step_number} (${nextSequence.title}) to ${contact.email_address}`)
        
        // Find available sender with capacity
        let assignedSender = null
        for (const sender of senders) {
          const currentUsage = senderUsage.get(sender.id) || 0
          if (currentUsage < sender.daily_limit) {
            assignedSender = sender
            senderUsage.set(sender.id, currentUsage + 1)
            break
          }
        }
        
        if (!assignedSender) {
          console.log(`⚠️ Skipping contact ${contact.email_address} - All senders at daily limit`)
          continue
        }
        
        contactsToProcess.push({
          id: contact.id,
          email: contact.email_address,
          firstName: contact.first_name,
          lastName: contact.last_name,
          company: contact.company_name,
          title: contact.job_title,
          nextSequence: {
            id: nextSequence.id,
            step_number: nextSequence.step_number,
            subject: nextSequence.subject,
            content: nextSequence.content,
            title: nextSequence.title,
            timing_days: nextSequence.timing_days,
            outreach_method: nextSequence.outreach_method
          },
          scheduledFor: now.toISOString(),
          localTime: `${contactLocalHour}:${currentMinute}`,
          timezoneGroup: contactTimezone,
          sender: {
            id: assignedSender.id,
            email: assignedSender.email,
            name: assignedSender.name,
            health_score: assignedSender.health_score
          }
        })
      }

      if (contactsToProcess.length > 0) {
        campaignsToProcess.push({
          ...campaign,
          senders,
          contacts: contactsToProcess.slice(0, settings.daily_contacts_limit || 35)
        })
      }
    }

    console.log(`✅ Found ${campaignsToProcess.length} campaigns ready for processing`)

    return NextResponse.json({
      success: true,
      data: campaignsToProcess,
      processedAt: now.toISOString()
    })

  } catch (error) {
    console.error('❌ Error in process-pending:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}