import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth validation
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Update sequence progress and trigger next sequence
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Sequence Progress API"' } }
    )
  }

  try {
    const body = await request.json()
    console.log('🔄 Sequence Progress Update Request:', body)

    const {
      campaignId,
      contactId,
      sequenceId,
      status = 'sent',
      sentAt,
      messageId,
      errorMessage,
      autoProgressNext = true
    } = body

    // Validate required fields
    if (!campaignId || !contactId || !sequenceId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: campaignId, contactId, sequenceId'
      }, { status: 400 })
    }

    console.log(`📧 Processing sequence progress: Campaign ${campaignId}, Contact ${contactId}, Sequence ${sequenceId}`)

    // Update sequence progress
    const progressResult = await updateSequenceProgress({
      campaignId,
      contactId,
      sequenceId,
      status,
      sentAt,
      messageId,
      errorMessage
    })

    if (!progressResult.success) {
      return NextResponse.json(progressResult, { status: 500 })
    }

    // If email was successfully sent and auto-progress is enabled, schedule next sequence
    if (status === 'sent' && autoProgressNext) {
      const nextSequenceResult = await scheduleNextSequence({
        campaignId,
        contactId,
        currentSequenceId: sequenceId
      })

      return NextResponse.json({
        success: true,
        message: 'Sequence progress updated successfully',
        current_sequence: progressResult.data,
        next_sequence: nextSequenceResult.data,
        auto_progressed: nextSequenceResult.success
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Sequence progress updated successfully',
      current_sequence: progressResult.data,
      auto_progressed: false
    })

  } catch (error) {
    console.error('❌ Error in sequence progress update:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Update sequence progress in database
async function updateSequenceProgress({
  campaignId,
  contactId,
  sequenceId,
  status,
  sentAt,
  messageId,
  errorMessage
}) {
  try {
    // Check if progress record exists
    const { data: existing, error: checkError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select('id, status, sent_at')
      .eq('campaign_id', campaignId)
      .eq('prospect_id', contactId)
      .eq('sequence_id', sequenceId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing progress:', checkError)
      return { success: false, error: checkError.message }
    }

    const timestamp = sentAt || new Date().toISOString()
    
    let result
    if (existing) {
      // Update existing record
      const updateData = {
        status,
        sent_at: timestamp,
        updated_at: new Date().toISOString()
      }

      if (messageId) updateData.message_id = messageId
      if (errorMessage && status === 'failed') updateData.error_message = errorMessage

      const { data, error } = await supabaseServer
        .from('prospect_sequence_progress')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating progress:', error)
        return { success: false, error: error.message }
      }

      result = data
      console.log(`✅ Updated existing progress record for sequence ${sequenceId}`)
    } else {
      // Create new progress record
      const insertData = {
        campaign_id: campaignId,
        prospect_id: contactId,
        sequence_id: sequenceId,
        status,
        sent_at: timestamp,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (messageId) insertData.message_id = messageId
      if (errorMessage && status === 'failed') insertData.error_message = errorMessage

      const { data, error } = await supabaseServer
        .from('prospect_sequence_progress')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error creating progress:', error)
        return { success: false, error: error.message }
      }

      result = data
      console.log(`✅ Created new progress record for sequence ${sequenceId}`)
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Error updating sequence progress:', error)
    return { success: false, error: error.message }
  }
}

// Schedule next sequence based on timing
async function scheduleNextSequence({ campaignId, contactId, currentSequenceId }) {
  try {
    console.log(`🔍 Looking for next sequence after ${currentSequenceId}`)

    // Get current sequence details
    const { data: currentSequence, error: currentError } = await supabaseServer
      .from('campaign_sequences')
      .select('step_number, timing_days, title')
      .eq('id', currentSequenceId)
      .single()

    if (currentError || !currentSequence) {
      console.error('Error fetching current sequence:', currentError)
      return { success: false, error: 'Current sequence not found' }
    }

    console.log(`📧 Current sequence: Step ${currentSequence.step_number} (${currentSequence.title})`)

    // Get all sequences for this campaign
    const { data: allSequences, error: sequencesError } = await supabaseServer
      .from('campaign_sequences')
      .select('id, step_number, title, timing_days, subject, content')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .order('step_number')

    if (sequencesError) {
      console.error('Error fetching sequences:', sequencesError)
      return { success: false, error: sequencesError.message }
    }

    // Find next sequence
    const nextStepNumber = currentSequence.step_number + 1
    const nextSequence = allSequences.find(s => s.step_number === nextStepNumber)

    if (!nextSequence) {
      console.log(`📝 No next sequence found after step ${currentSequence.step_number}`)
      return { 
        success: true, 
        data: { 
          message: 'Contact has completed all sequences',
          completed: true,
          total_sequences: allSequences.length
        }
      }
    }

    console.log(`📧 Next sequence: Step ${nextSequence.step_number} (${nextSequence.title})`)

    // Check if next sequence is already scheduled or sent
    const { data: existingProgress, error: progressError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select('status, sent_at')
      .eq('campaign_id', campaignId)
      .eq('prospect_id', contactId)
      .eq('sequence_id', nextSequence.id)
      .single()

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error checking next sequence progress:', progressError)
      return { success: false, error: progressError.message }
    }

    if (existingProgress) {
      console.log(`⚠️ Next sequence ${nextSequence.step_number} already ${existingProgress.status}`)
      return {
        success: true,
        data: {
          sequence: nextSequence,
          already_scheduled: true,
          status: existingProgress.status,
          sent_at: existingProgress.sent_at
        }
      }
    }

    // Calculate when next sequence should be sent
    const currentTimingDays = currentSequence.timing_days || 0
    const nextSendDate = new Date()
    nextSendDate.setDate(nextSendDate.getDate() + currentTimingDays)

    // Create scheduled progress record for next sequence
    const { data: scheduledProgress, error: scheduleError } = await supabaseServer
      .from('prospect_sequence_progress')
      .insert({
        campaign_id: campaignId,
        prospect_id: contactId,
        sequence_id: nextSequence.id,
        status: 'scheduled',
        scheduled_for: nextSendDate.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (scheduleError) {
      console.error('Error scheduling next sequence:', scheduleError)
      return { success: false, error: scheduleError.message }
    }

    console.log(`✅ Scheduled next sequence ${nextSequence.step_number} for ${nextSendDate.toISOString()}`)

    return {
      success: true,
      data: {
        sequence: nextSequence,
        scheduled_for: nextSendDate.toISOString(),
        timing_days: currentTimingDays,
        progress_id: scheduledProgress.id,
        message: `Next sequence scheduled for ${currentTimingDays} days from now`
      }
    }

  } catch (error) {
    console.error('Error scheduling next sequence:', error)
    return { success: false, error: error.message }
  }
}

// GET - Check sequence progress for a contact
export async function GET(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Sequence Progress API"' } }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const contactId = searchParams.get('contactId')

    if (!campaignId || !contactId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: campaignId, contactId'
      }, { status: 400 })
    }

    // Get all progress for this contact
    const { data: progress, error: progressError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select(`
        *,
        campaign_sequences (
          step_number,
          title,
          timing_days,
          subject,
          outreach_method
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('prospect_id', contactId)
      .order('created_at')

    if (progressError) {
      console.error('Error fetching progress:', progressError)
      return NextResponse.json({
        success: false,
        error: progressError.message
      }, { status: 500 })
    }

    // Get all available sequences
    const { data: allSequences, error: sequencesError } = await supabaseServer
      .from('campaign_sequences')
      .select('id, step_number, title, timing_days, is_active')
      .eq('campaign_id', campaignId)
      .order('step_number')

    if (sequencesError) {
      console.error('Error fetching sequences:', sequencesError)
      return NextResponse.json({
        success: false,
        error: sequencesError.message
      }, { status: 500 })
    }

    // Analyze progress
    const sentCount = progress.filter(p => p.status === 'sent').length
    const scheduledCount = progress.filter(p => p.status === 'scheduled').length
    const failedCount = progress.filter(p => p.status === 'failed').length
    const totalSequences = allSequences.filter(s => s.is_active).length

    return NextResponse.json({
      success: true,
      data: {
        progress: progress,
        summary: {
          sent: sentCount,
          scheduled: scheduledCount,
          failed: failedCount,
          total_available: totalSequences,
          completion_rate: totalSequences > 0 ? Math.round((sentCount / totalSequences) * 100) : 0
        },
        all_sequences: allSequences
      }
    })

  } catch (error) {
    console.error('❌ Error fetching sequence progress:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}