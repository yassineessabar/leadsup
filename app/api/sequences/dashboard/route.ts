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

// GET - Sequence progression dashboard
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')

    console.log(`📊 Fetching sequence dashboard for user ${userId}${campaignId ? `, campaign ${campaignId}` : ''}`)

    // Build query conditions
    let campaignQuery = supabaseServer
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        type,
        created_at
      `)
      .eq('user_id', userId)

    if (campaignId) {
      campaignQuery = campaignQuery.eq('id', campaignId)
    }

    const { data: campaigns, error: campaignsError } = await campaignQuery

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return NextResponse.json({ success: false, error: campaignsError.message }, { status: 500 })
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          campaigns: [],
          summary: {
            total_campaigns: 0,
            total_contacts: 0,
            total_sequences_sent: 0,
            total_sequences_scheduled: 0
          }
        }
      })
    }

    const dashboardData = []
    let totalContacts = 0
    let totalSequencesSent = 0
    let totalSequencesScheduled = 0

    for (const campaign of campaigns) {
      // Get campaign sequences
      const { data: sequences, error: sequencesError } = await supabaseServer
        .from('campaign_sequences')
        .select('id, step_number, title, timing_days, is_active')
        .eq('campaign_id', campaign.id)
        .order('step_number')

      if (sequencesError) {
        console.error(`Error fetching sequences for campaign ${campaign.id}:`, sequencesError)
        continue
      }

      // Get prospects for this campaign
      const { data: prospects, error: prospectsError } = await supabaseServer
        .from('prospects')
        .select('id, email_address, first_name, last_name')
        .eq('campaign_id', campaign.id)

      if (prospectsError) {
        console.error(`Error fetching prospects for campaign ${campaign.id}:`, prospectsError)
        continue
      }

      totalContacts += prospects?.length || 0

      // Get sequence progress for all prospects in this campaign
      const { data: allProgress, error: progressError } = await supabaseServer
        .from('prospect_sequence_progress')
        .select(`
          id,
          prospect_id,
          sequence_id,
          status,
          sent_at,
          scheduled_for,
          created_at,
          campaign_sequences (
            step_number,
            title
          ),
          prospects (
            email_address,
            first_name,
            last_name
          )
        `)
        .eq('campaign_id', campaign.id)

      if (progressError) {
        console.error(`Error fetching progress for campaign ${campaign.id}:`, progressError)
        continue
      }

      // Count progress by status
      const sentProgress = allProgress?.filter(p => p.status === 'sent') || []
      const scheduledProgress = allProgress?.filter(p => p.status === 'scheduled') || []
      const failedProgress = allProgress?.filter(p => p.status === 'failed') || []

      totalSequencesSent += sentProgress.length
      totalSequencesScheduled += scheduledProgress.length

      // Group progress by prospect
      const prospectProgress = {}
      allProgress?.forEach(progress => {
        const prospectId = progress.prospect_id
        if (!prospectProgress[prospectId]) {
          prospectProgress[prospectId] = {
            prospect: progress.prospects,
            sequences: []
          }
        }
        prospectProgress[prospectId].sequences.push({
          sequence_id: progress.sequence_id,
          step_number: progress.campaign_sequences?.step_number,
          title: progress.campaign_sequences?.title,
          status: progress.status,
          sent_at: progress.sent_at,
          scheduled_for: progress.scheduled_for
        })
      })

      // Calculate sequence completion rates
      const activeSequences = sequences?.filter(s => s.is_active) || []
      const prospectCount = prospects?.length || 0
      const maxPossibleSequences = prospectCount * activeSequences.length
      const completionRate = maxPossibleSequences > 0 ? Math.round((sentProgress.length / maxPossibleSequences) * 100) : 0

      // Find prospects ready for next sequence
      const prospectsReadyForNext = []
      prospects?.forEach(prospect => {
        const progress = prospectProgress[prospect.id]
        if (!progress) {
          // No sequences sent yet - ready for first sequence
          prospectsReadyForNext.push({
            ...prospect,
            next_sequence: activeSequences[0] || null,
            reason: 'No sequences sent yet'
          })
        } else {
          const sentSequences = progress.sequences.filter(s => s.status === 'sent')
          const scheduledSequences = progress.sequences.filter(s => s.status === 'scheduled')
          
          if (scheduledSequences.length === 0) {
            // Check if there's a next sequence available
            const lastSentStep = Math.max(...sentSequences.map(s => s.step_number || 0))
            const nextSequence = activeSequences.find(s => s.step_number === lastSentStep + 1)
            
            if (nextSequence) {
              // Check timing for last sent sequence
              const lastSent = sentSequences.find(s => s.step_number === lastSentStep)
              if (lastSent) {
                const lastSentDate = new Date(lastSent.sent_at)
                const lastSequence = activeSequences.find(s => s.step_number === lastSentStep)
                const timingDays = lastSequence?.timing_days || 0
                const nextDueDate = new Date(lastSentDate.getTime() + (timingDays * 24 * 60 * 60 * 1000))
                
                if (new Date() >= nextDueDate) {
                  prospectsReadyForNext.push({
                    ...prospect,
                    next_sequence: nextSequence,
                    reason: `${timingDays} days have passed since step ${lastSentStep}`,
                    last_sent: lastSent.sent_at
                  })
                }
              }
            }
          }
        }
      })

      dashboardData.push({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          type: campaign.type
        },
        sequences: activeSequences,
        progress: {
          total_prospects: prospectCount,
          sequences_sent: sentProgress.length,
          sequences_scheduled: scheduledProgress.length,
          sequences_failed: failedProgress.length,
          completion_rate: completionRate,
          max_possible_sequences: maxPossibleSequences
        },
        prospects_ready_for_next: prospectsReadyForNext,
        recent_activity: allProgress?.slice(-10).reverse() || [] // Last 10 activities
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        campaigns: dashboardData,
        summary: {
          total_campaigns: campaigns.length,
          total_contacts: totalContacts,
          total_sequences_sent: totalSequencesSent,
          total_sequences_scheduled: totalSequencesScheduled,
          overall_completion_rate: totalContacts > 0 ? Math.round((totalSequencesSent / (totalContacts * 5)) * 100) : 0 // Assuming avg 5 sequences per campaign
        }
      }
    })

  } catch (error) {
    console.error('❌ Error in sequence dashboard:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Bulk operations on sequences
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { action, campaignId, prospectIds, sequenceId } = body

    console.log(`🔄 Bulk sequence operation: ${action}`)

    switch (action) {
      case 'schedule_next_batch':
        return await scheduleNextBatch(campaignId, prospectIds, userId)
      
      case 'reset_sequences':
        return await resetSequences(campaignId, prospectIds, userId)
      
      case 'force_next_sequence':
        return await forceNextSequenceForProspects(campaignId, prospectIds, userId)
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Error in bulk sequence operation:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to schedule next batch of sequences
async function scheduleNextBatch(campaignId: string, prospectIds: string[], userId: string) {
  const results = []
  
  for (const prospectId of prospectIds) {
    try {
      // Get prospect's current progress
      const { data: progress, error: progressError } = await supabaseServer
        .from('prospect_sequence_progress')
        .select(`
          sequence_id,
          status,
          campaign_sequences (
            step_number,
            timing_days
          )
        `)
        .eq('campaign_id', campaignId)
        .eq('prospect_id', prospectId)
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .limit(1)

      if (progressError) {
        results.push({ prospect_id: prospectId, success: false, error: progressError.message })
        continue
      }

      // Find next sequence
      const lastStep = progress?.[0]?.campaign_sequences?.step_number || 0
      const { data: nextSequence, error: sequenceError } = await supabaseServer
        .from('campaign_sequences')
        .select('id, step_number, title')
        .eq('campaign_id', campaignId)
        .eq('step_number', lastStep + 1)
        .eq('is_active', true)
        .single()

      if (sequenceError || !nextSequence) {
        results.push({ 
          prospect_id: prospectId, 
          success: false, 
          error: 'No next sequence available' 
        })
        continue
      }

      // Schedule next sequence
      const { error: insertError } = await supabaseServer
        .from('prospect_sequence_progress')
        .insert({
          campaign_id: campaignId,
          prospect_id: prospectId,
          sequence_id: nextSequence.id,
          status: 'scheduled',
          scheduled_for: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        results.push({ prospect_id: prospectId, success: false, error: insertError.message })
      } else {
        results.push({ 
          prospect_id: prospectId, 
          success: true, 
          next_sequence: nextSequence 
        })
      }

    } catch (error) {
      results.push({ prospect_id: prospectId, success: false, error: error.message })
    }
  }

  return NextResponse.json({
    success: true,
    message: `Processed ${prospectIds.length} prospects`,
    results
  })
}

// Helper function to reset sequences for prospects
async function resetSequences(campaignId: string, prospectIds: string[], userId: string) {
  try {
    const { error } = await supabaseServer
      .from('prospect_sequence_progress')
      .delete()
      .eq('campaign_id', campaignId)
      .in('prospect_id', prospectIds)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Reset sequences for ${prospectIds.length} prospects`
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// Helper function to force next sequence for prospects
async function forceNextSequenceForProspects(campaignId: string, prospectIds: string[], userId: string) {
  const results = []

  for (const prospectId of prospectIds) {
    try {
      // Update last sent sequence timestamp to make next sequence available
      const { data: lastProgress, error: progressError } = await supabaseServer
        .from('prospect_sequence_progress')
        .select('id, sequence_id')
        .eq('campaign_id', campaignId)
        .eq('prospect_id', prospectId)
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .limit(1)

      if (progressError || !lastProgress?.[0]) {
        results.push({ prospect_id: prospectId, success: false, error: 'No sent sequences found' })
        continue
      }

      // Set timestamp to 7 days ago to make next sequence available
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      const { error: updateError } = await supabaseServer
        .from('prospect_sequence_progress')
        .update({
          sent_at: pastDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', lastProgress[0].id)

      if (updateError) {
        results.push({ prospect_id: prospectId, success: false, error: updateError.message })
      } else {
        results.push({ prospect_id: prospectId, success: true, message: 'Next sequence forced' })
      }

    } catch (error) {
      results.push({ prospect_id: prospectId, success: false, error: error.message })
    }
  }

  return NextResponse.json({
    success: true,
    message: `Processed ${prospectIds.length} prospects`,
    results
  })
}