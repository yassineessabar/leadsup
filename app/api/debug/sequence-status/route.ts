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
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// GET - Debug sequence status for essabar.yassine@gmail.com
export async function GET(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🔍 Debugging sequence status for essabar.yassine@gmail.com...')

    const email = 'essabar.yassine@gmail.com'
    const campaignId = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'

    // 1. Check if prospect exists
    const { data: prospect, error: prospectError } = await supabaseServer
      .from('prospects')
      .select('id, first_name, campaign_id, time_zone')
      .eq('email_address', email)
      .single()

    if (prospectError || !prospect) {
      return NextResponse.json({
        success: false,
        error: 'Prospect not found',
        email: email
      })
    }

    console.log(`✅ Found prospect: ${prospect.first_name}`)

    // 2. Check all completed sequences
    const { data: completedSequences, error: completedError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select(`
        sequence_id,
        status,
        sent_at,
        created_at,
        campaign_sequences (
          step_number,
          title,
          timing_days
        )
      `)
      .eq('prospect_id', prospect.id)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })

    console.log(`📧 Found ${completedSequences?.length || 0} completed sequences`)

    // 3. Check all available sequences in campaign
    const { data: allSequences, error: sequencesError } = await supabaseServer
      .from('campaign_sequences')
      .select('step_number, title, timing_days, is_active, created_at')
      .eq('campaign_id', campaignId)
      .order('step_number')

    console.log(`📝 Found ${allSequences?.length || 0} total sequences in campaign`)

    // 4. Calculate next sequence logic
    let completedSteps = new Set()
    let lastSentDate = null
    let lastStepNumber = 0

    if (completedSequences && completedSequences.length > 0) {
      // Count completed sequences chronologically  
      const sentCount = completedSequences.length
      for (let i = 1; i <= sentCount; i++) {
        completedSteps.add(i)
      }
      
      lastStepNumber = Math.max(...completedSteps)
      lastSentDate = new Date(completedSequences[0].sent_at)
    }

    const nextStepNumber = lastStepNumber + 1
    const nextSequence = allSequences?.find(s => s.step_number === nextStepNumber && s.is_active)

    console.log(`🎯 Next step should be: ${nextStepNumber}`)

    // 5. Check timing constraints
    let timingStatus = 'ready'
    let nextAvailableDate = null

    if (lastSentDate && completedSequences && completedSequences.length > 0) {
      const lastCompletedSequence = completedSequences.find(cs => 
        cs.campaign_sequences?.step_number === lastStepNumber
      )
      
      if (lastCompletedSequence?.campaign_sequences?.timing_days) {
        const timingDays = lastCompletedSequence.campaign_sequences.timing_days
        nextAvailableDate = new Date(lastSentDate.getTime() + (timingDays * 24 * 60 * 60 * 1000))
        
        if (new Date() < nextAvailableDate) {
          timingStatus = 'waiting'
        }
      }
    }

    // 6. Check campaign settings
    const { data: campaignSettings, error: settingsError } = await supabaseServer
      .from('campaign_settings')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    return NextResponse.json({
      success: true,
      prospect: {
        id: prospect.id,
        name: prospect.first_name,
        email: email,
        campaign_id: prospect.campaign_id,
        timezone: prospect.time_zone
      },
      sequences: {
        completed: completedSequences?.map(cs => ({
          step_number: cs.campaign_sequences?.step_number,
          title: cs.campaign_sequences?.title,
          sent_at: cs.sent_at,
          timing_days: cs.campaign_sequences?.timing_days
        })) || [],
        available: allSequences?.map(s => ({
          step_number: s.step_number,
          title: s.title,
          timing_days: s.timing_days,
          is_active: s.is_active
        })) || [],
        completed_steps: Array.from(completedSteps),
        next_step_number: nextStepNumber,
        next_sequence_exists: !!nextSequence,
        next_sequence_title: nextSequence?.title || 'Not found'
      },
      timing: {
        status: timingStatus,
        last_sent: lastSentDate?.toISOString(),
        next_available: nextAvailableDate?.toISOString(),
        current_time: new Date().toISOString()
      },
      campaign_settings: campaignSettings || null,
      debug_info: {
        total_completed: completedSequences?.length || 0,
        total_available: allSequences?.length || 0,
        last_step: lastStepNumber,
        next_step: nextStepNumber,
        should_be_ready: timingStatus === 'ready' && !!nextSequence
      }
    })

  } catch (error) {
    console.error('❌ Error debugging sequence status:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}