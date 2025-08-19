import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { cookies } from 'next/headers'

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single()

    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

// GET - Get sequence status for contacts in a campaign
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const contactEmail = searchParams.get('contactEmail')

    if (!campaignId) {
      return NextResponse.json({
        success: false,
        error: 'campaignId is required'
      }, { status: 400 })
    }

    console.log(`📊 Fetching sequence status for campaign ${campaignId}${contactEmail ? ` and contact ${contactEmail}` : ''}`)

    // Try prospects table first (UUID-based)
    let prospectsQuery = supabaseServer
      .from('prospects')
      .select('id, email_address, first_name, last_name, created_at')
      .eq('campaign_id', campaignId)

    if (contactEmail) {
      prospectsQuery = prospectsQuery.eq('email_address', contactEmail)
    }

    let { data: prospects, error: prospectsError } = await prospectsQuery

    // If no prospects found, try contacts table (integer-based)
    if ((!prospects || prospects.length === 0) && !prospectsError?.message?.includes('relation "public.prospects" does not exist')) {
      console.log('📋 No prospects found, checking contacts table for sequence status...')
      
      let contactsQuery = supabaseServer
        .from('contacts')
        .select('id, email, first_name, last_name, created_at, sequence_step')
        .eq('campaign_id', campaignId)
      
      if (contactEmail) {
        contactsQuery = contactsQuery.eq('email', contactEmail)
      }
      
      const { data: contacts, error: contactsError } = await contactsQuery
      
      if (!contactsError && contacts && contacts.length > 0) {
        // Convert contacts to prospect format
        prospects = contacts.map(contact => ({
          id: contact.id.toString(),
          email_address: contact.email,
          first_name: contact.first_name,
          last_name: contact.last_name,
          created_at: contact.created_at,
          sequence_step: contact.sequence_step || 0
        }))
        console.log(`📋 Found ${prospects.length} contacts in legacy table`)
      }
    }

    if (!prospects || prospects.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Get all sequence progress for these prospects
    const prospectIds = prospects.map(p => p.id)
    const { data: allProgress, error: progressError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select(`
        prospect_id,
        sequence_id,
        status,
        sent_at,
        created_at,
        updated_at
      `)
      .eq('campaign_id', campaignId)
      .in('prospect_id', prospectIds)
      .order('created_at', { ascending: true })

    if (progressError) {
      console.error('Error fetching sequence progress:', progressError)
      // Don't fail, just return empty progress
    }

    // Get campaign sequences for step counting
    const { data: campaignSequences, error: sequencesError } = await supabaseServer
      .from('campaign_sequences')
      .select('id, step_number, title, timing_days, is_active')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .order('step_number')

    if (sequencesError) {
      console.error('Error fetching sequences:', sequencesError)
    }

    // Process each prospect's sequence status
    const contactStatuses = prospects.map(prospect => {
      // For integer IDs (contacts table), use the sequence_step directly
      const isIntegerID = !prospect.id.includes('-')
      
      let sentCount = 0
      let scheduledCount = 0
      let failedCount = 0
      let currentStep = 0
      
      if (isIntegerID && prospect.sequence_step !== undefined) {
        // For contacts table, use the sequence_step field directly
        currentStep = prospect.sequence_step || 0
        sentCount = currentStep
        console.log(`📋 Using sequence_step from contacts table: ${currentStep} for ${prospect.email_address}`)
      } else {
        // For prospects table, use the progress records
        const prospectProgress = allProgress?.filter(p => p.prospect_id === prospect.id) || []
        
        console.log(`🔍 DEBUG: Processing prospect ${prospect.email_address} (${prospect.id})`)
        console.log(`🔍 DEBUG: Raw progress records:`, prospectProgress)
        
        sentCount = prospectProgress.filter(p => p.status === 'sent').length
        scheduledCount = prospectProgress.filter(p => p.status === 'scheduled').length
        failedCount = prospectProgress.filter(p => p.status === 'failed').length
        currentStep = sentCount
        
        console.log(`🔍 DEBUG: Counts - Sent: ${sentCount}, Scheduled: ${scheduledCount}, Failed: ${failedCount}`)
      }
      
      // Determine status
      let status = 'upcoming'
      let nextSequenceDate = null
      
      if (sentCount === 0 && scheduledCount === 0) {
        status = 'upcoming'
        currentStep = 0
      } else if (scheduledCount > 0) {
        status = 'scheduled'
        currentStep = sentCount
        // Find next scheduled sequence
        const nextScheduled = prospectProgress
          .filter(p => p.status === 'scheduled')
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
        if (nextScheduled) {
          nextSequenceDate = nextScheduled.created_at
        }
      } else if (sentCount > 0) {
        status = 'active'
        currentStep = sentCount
        
        // Check if all sequences are complete
        const totalSequences = campaignSequences?.length || 6
        if (sentCount >= totalSequences) {
          status = 'completed'
        }
      }

      // Generate sequence timeline
      const sequences = []
      const totalSequences = campaignSequences?.length || 6
      
      for (let i = 1; i <= totalSequences; i++) {
        const campaignSeq = campaignSequences?.find(cs => cs.step_number === i)
        
        let sequenceProgress = null
        if (!isIntegerID) {
          // For prospects table, find matching progress record
          const prospectProgress = allProgress?.filter(p => p.prospect_id === prospect.id) || []
          sequenceProgress = prospectProgress.find(p => {
            return campaignSeq ? p.sequence_id === campaignSeq.id : false
          })
        }
        
        let sequenceStatus = 'upcoming'
        let sentAt = null
        
        if (sequenceProgress) {
          sequenceStatus = sequenceProgress.status
          sentAt = sequenceProgress.sent_at
        } else if (i <= sentCount) {
          // If we have sent count but no progress record, assume sent
          sequenceStatus = 'sent'
        }
        
        sequences.push({
          step: i,
          title: campaignSeq?.title || `Email ${i}`,
          status: sequenceStatus,
          sent_at: sentAt,
          timing_days: campaignSeq?.timing_days || (i === 1 ? 0 : 3)
        })
      }

      return {
        prospect_id: prospect.id,
        email: prospect.email_address,
        first_name: prospect.first_name,
        last_name: prospect.last_name,
        current_step: currentStep,
        total_sequences: totalSequences,
        status: status,
        sequences_sent: sentCount,
        sequences_scheduled: scheduledCount,
        sequences_failed: failedCount,
        next_sequence_date: nextSequenceDate,
        sequences: sequences,
        progress_summary: {
          sent: sentCount,
          scheduled: scheduledCount,
          failed: failedCount,
          upcoming: Math.max(0, totalSequences - sentCount - scheduledCount)
        }
      }
    })

    console.log(`✅ Calculated sequence status for ${contactStatuses.length} contacts`)
    console.log(`🔍 DEBUG: First contact status data:`, contactStatuses[0])

    return NextResponse.json({
      success: true,
      data: contactStatuses
    })

  } catch (error) {
    console.error('❌ Error fetching sequence status:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Update sequence status for a contact (batch update)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, updates } = body

    if (!campaignId || !Array.isArray(updates)) {
      return NextResponse.json({
        success: false,
        error: 'campaignId and updates array are required'
      }, { status: 400 })
    }

    console.log(`🔄 Batch updating sequence status for ${updates.length} contacts`)

    const results = []

    for (const update of updates) {
      const { prospectId, sequenceId, status, sentAt } = update

      try {
        // Check if progress record exists
        const { data: existing, error: checkError } = await supabaseServer
          .from('prospect_sequence_progress')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('prospect_id', prospectId)
          .eq('sequence_id', sequenceId)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing progress:', checkError)
          results.push({ prospectId, success: false, error: checkError.message })
          continue
        }

        const timestamp = new Date().toISOString()
        
        if (existing) {
          // Update existing record
          const { error: updateError } = await supabaseServer
            .from('prospect_sequence_progress')
            .update({
              status,
              sent_at: sentAt || (status === 'sent' ? timestamp : null),
              updated_at: timestamp
            })
            .eq('id', existing.id)

          if (updateError) {
            console.error('Error updating progress:', updateError)
            results.push({ prospectId, success: false, error: updateError.message })
          } else {
            results.push({ prospectId, success: true, action: 'updated' })
          }
        } else {
          // Create new record
          const { error: insertError } = await supabaseServer
            .from('prospect_sequence_progress')
            .insert({
              campaign_id: campaignId,
              prospect_id: prospectId,
              sequence_id: sequenceId,
              status,
              sent_at: sentAt || (status === 'sent' ? timestamp : null),
              created_at: timestamp,
              updated_at: timestamp
            })

          if (insertError) {
            console.error('Error creating progress:', insertError)
            results.push({ prospectId, success: false, error: insertError.message })
          } else {
            results.push({ prospectId, success: true, action: 'created' })
          }
        }
      } catch (error) {
        console.error(`Error processing update for prospect ${prospectId}:`, error)
        results.push({ prospectId, success: false, error: error.message })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`✅ Batch update completed: ${successCount}/${updates.length} successful`)

    return NextResponse.json({
      success: true,
      message: `Updated ${successCount} of ${updates.length} records`,
      results
    })

  } catch (error) {
    console.error('❌ Error in batch sequence status update:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}