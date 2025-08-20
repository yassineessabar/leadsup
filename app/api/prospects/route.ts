import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const emailStatus = searchParams.get('email_status')
    const company = searchParams.get('company')
    const industry = searchParams.get('industry')
    const campaignId = searchParams.get('campaign_id')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Build query
    let query = supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email_address.ilike.%${search}%,company_name.ilike.%${search}%`)
    }

    if (emailStatus) {
      query = query.eq('email_status', emailStatus)
    }

    if (company) {
      query = query.eq('company_name', company)
    }

    if (industry) {
      query = query.eq('industry', industry)
    }

    if (campaignId) {
      console.log(`🔍 Filtering prospects by campaign_id: ${campaignId} (type: ${typeof campaignId})`)
      // Campaign IDs are UUIDs (strings), so use direct string comparison
      query = query.eq('campaign_id', campaignId)
    }

    const { data: prospects, error } = await query

    console.log(`📊 Database query result: ${prospects?.length || 0} prospects found`, {
      campaignId,
      search,
      prospects: prospects?.slice(0, 3) // Show first 3 for debugging
    })

    if (error) {
      console.error('Error fetching prospects:', error)
      return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })

    // Apply same filters for count
    if (search) {
      countQuery = countQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email_address.ilike.%${search}%,company_name.ilike.%${search}%`)
    }
    if (emailStatus) {
      countQuery = countQuery.eq('email_status', emailStatus)
    }
    if (company) {
      countQuery = countQuery.eq('company_name', company)
    }
    if (industry) {
      countQuery = countQuery.eq('industry', industry)
    }
    if (campaignId) {
      countQuery = countQuery.eq('campaign_id', campaignId)
    }

    const { count, error: countError } = await countQuery

    return NextResponse.json({ 
      prospects: prospects || [],
      total: count || 0,
      hasMore: prospects && prospects.length === limit
    })
  } catch (error) {
    console.error('Error in prospects GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Handle bulk import (prospects array) or single prospect
    if (body.prospects && Array.isArray(body.prospects)) {
      // Bulk import multiple prospects
      const prospectsToInsert = body.prospects.map(prospect => ({
        first_name: prospect.first_name || '',
        last_name: prospect.last_name || '',
        email_address: prospect.email_address || '',
        email_status: prospect.email_status || 'Unknown',
        tags: prospect.tags || '',
        linkedin_url: prospect.linkedin_url || '',
        job_title: prospect.job_title || '',
        location: prospect.location || '',
        company_name: prospect.company_name || '',
        industry: prospect.industry || '',
        notes: prospect.notes || '',
        campaign_id: prospect.campaign_id || null,
        time_zone: prospect.time_zone || null,
        opted_out: prospect.opted_out || false
      }))

      // Check for duplicates by email
      const emailsToCheck = prospectsToInsert.filter(p => p.email_address).map(p => p.email_address)
      let existingEmails = []
      
      if (emailsToCheck.length > 0) {
        const { data: existing } = await supabase
          .from('prospects')
          .select('email_address')
          .in('email_address', emailsToCheck)
        
        existingEmails = existing ? existing.map(p => p.email_address) : []
      }

      // Filter out duplicates
      const newProspects = prospectsToInsert.filter(p => 
        !p.email_address || !existingEmails.includes(p.email_address)
      )

      if (newProspects.length === 0 && existingEmails.length > 0) {
        // All prospects exist - update their campaign assignments instead
        console.log(`📋 Updating ${existingEmails.length} existing prospects with new campaign assignments`)
        
        const updatePromises = prospectsToInsert
          .filter(p => existingEmails.includes(p.email_address))
          .map(async (prospect) => {
            const { data: updated, error: updateError } = await supabase
              .from('prospects')
              .update({ campaign_id: prospect.campaign_id })
              .eq('email_address', prospect.email_address)
              .select()
              .single()

            if (updateError) {
              console.error(`Error updating prospect ${prospect.email_address}:`, updateError)
              return null
            }
            return updated
          })

        const updateResults = await Promise.all(updatePromises)
        const successfulUpdates = updateResults.filter(Boolean)

        return NextResponse.json({ 
          prospects: successfulUpdates,
          imported: 0,
          updated: successfulUpdates.length,
          duplicates: existingEmails.length,
          message: `Updated ${successfulUpdates.length} existing prospects with new campaign assignment`
        })
      }

      const { data: prospects, error } = await supabase
        .from('prospects')
        .insert(newProspects)
        .select()

      if (error) {
        console.error('Error creating prospects:', error)
        return NextResponse.json({ error: 'Failed to create prospects' }, { status: 500 })
      }

      // ✅ AUTO-TRIGGER SEQUENCE TIMELINE CREATION FOR BULK PROSPECTS IMPORT
      let scheduledCount = 0
      const prospectsWithCampaigns = prospects.filter(p => p.campaign_id)
      
      if (prospectsWithCampaigns.length > 0) {
        console.log(`🎯 Checking campaigns for ${prospectsWithCampaigns.length} prospects with campaign assignments...`)
        
        // Group prospects by campaign to batch process
        const campaignGroups = prospectsWithCampaigns.reduce((groups, prospect) => {
          const campaignId = prospect.campaign_id
          if (!groups[campaignId]) groups[campaignId] = []
          groups[campaignId].push(prospect)
          return groups
        }, {})

        for (const [campaignId, campaignProspects] of Object.entries(campaignGroups)) {
          try {
            // Check if campaign is active
            const { data: campaign } = await supabase
              .from('campaigns')
              .select('id, name, status')
              .eq('id', campaignId)
              .single()

            if (campaign && campaign.status === 'Active') {
              console.log(`🎯 Auto-scheduling sequences for ${campaignProspects.length} prospects in active campaign: ${campaign.name}`)
              
              // Import the scheduler
              const { scheduleContactEmails } = await import('@/lib/email-scheduler')
              
              // Schedule sequences for prospects in this campaign
              const schedulingPromises = campaignProspects.map(async (prospect) => {
                try {
                  // Note: scheduleContactEmails expects integer contactId, but prospects have UUID
                  // We'll need to create a contact record or modify the scheduler
                  // For now, log that we would schedule
                  console.log(`📋 Would schedule sequences for prospect ${prospect.email_address} (UUID: ${prospect.id})`)
                  return true
                } catch (error) {
                  console.error(`❌ Error scheduling sequences for prospect ${prospect.email_address}:`, error)
                  return false
                }
              })

              const results = await Promise.all(schedulingPromises)
              const campaignScheduled = results.filter(Boolean).length
              scheduledCount += campaignScheduled
              
              console.log(`✅ Would schedule sequences for ${campaignScheduled}/${campaignProspects.length} prospects in campaign ${campaign.name}`)
            } else {
              console.log(`⏸️ Campaign ${campaignId} is not active (status: ${campaign?.status || 'not found'}), skipping auto-scheduling`)
            }
          } catch (error) {
            console.error(`❌ Error processing campaign ${campaignId} for prospect scheduling:`, error)
          }
        }
      }

      return NextResponse.json({ 
        prospects,
        imported: prospects.length,
        duplicates: existingEmails.length,
        total: prospectsToInsert.length,
        scheduling_checked: prospectsWithCampaigns.length,
        scheduling_note: "Prospects use UUID IDs - sequence scheduling needs adaptation for UUID support"
      })
    } else {
      // Single prospect creation (existing functionality)
      const {
        first_name,
        last_name,
        email_address,
        email_status = 'Unknown',
        tags = '',
        linkedin_url,
        job_title,
        location,
        company_name,
        industry,
        notes = '',
        campaign_id,
        time_zone,
        opted_out = false
      } = body

      const { data: prospect, error } = await supabase
        .from('prospects')
        .insert({
          first_name,
          last_name,
          email_address,
          email_status,
          tags,
          linkedin_url,
          job_title,
          location,
          company_name,
          industry,
          notes,
          campaign_id,
          time_zone,
          opted_out
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating prospect:', error)
        return NextResponse.json({ error: 'Failed to create prospect' }, { status: 500 })
      }

      return NextResponse.json({ prospect })
    }
  } catch (error) {
    console.error('Error in prospects POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}