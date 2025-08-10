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

// POST - Force next sequence to be available by updating last sequence timestamp
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Force Sequence API"' } }
    )
  }

  try {
    const body = await request.json()
    const { email, campaign_id } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'email is required' },
        { status: 400 }
      )
    }

    console.log(`🔧 Forcing next sequence for: ${email}`)

    // Get the prospect
    const { data: prospect, error: prospectError } = await supabaseServer
      .from('prospects')
      .select('id, first_name, campaign_id')
      .eq('email_address', email)
      .single()

    if (prospectError || !prospect) {
      console.log(`❌ Prospect not found: ${email}`)
      return NextResponse.json(
        { success: false, error: `Prospect not found: ${email}` },
        { status: 404 }
      )
    }

    // Use provided campaign_id or prospect's campaign_id
    const targetCampaignId = campaign_id || prospect.campaign_id

    console.log(`✅ Found prospect: ${prospect.first_name} in campaign ${targetCampaignId}`)

    // Get the latest completed sequence
    const { data: latestProgress, error: progressError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select(`
        sequence_id,
        sent_at,
        status,
        campaign_sequences (
          step_number,
          title,
          timing_days
        )
      `)
      .eq('prospect_id', prospect.id)
      .eq('campaign_id', targetCampaignId)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(1)

    if (progressError) {
      console.error('❌ Error fetching progress:', progressError)
      return NextResponse.json(
        { success: false, error: 'Error fetching sequence progress' },
        { status: 500 }
      )
    }

    if (!latestProgress || latestProgress.length === 0) {
      console.log(`⚠️ No completed sequences found for ${email}`)
      return NextResponse.json({
        success: true,
        message: `No completed sequences found for ${email} - contact may already be ready for first sequence`
      })
    }

    const lastSequence = latestProgress[0]
    const lastStepNumber = lastSequence.campaign_sequences?.step_number
    const lastTimingDays = lastSequence.campaign_sequences?.timing_days || 0

    console.log(`📧 Last completed: Step ${lastStepNumber} (${lastTimingDays} days timing)`)

    // Update the timestamp to make next sequence available
    // Set it to (timing_days + 1) days ago to ensure it's past due
    const daysAgo = lastTimingDays + 1
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - daysAgo)

    const { error: updateError } = await supabaseServer
      .from('prospect_sequence_progress')
      .update({
        sent_at: pastDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('prospect_id', prospect.id)
      .eq('sequence_id', lastSequence.sequence_id)
      .eq('status', 'sent')

    if (updateError) {
      console.error('❌ Error updating timestamp:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update sequence timestamp' },
        { status: 500 }
      )
    }

    console.log(`✅ Updated sequence ${lastStepNumber} timestamp to ${daysAgo} days ago`)

    // Check what sequences are available now
    const { data: allSequences, error: seqError } = await supabaseServer
      .from('campaign_sequences')
      .select('step_number, title, is_active')
      .eq('campaign_id', targetCampaignId)
      .eq('is_active', true)
      .order('step_number')

    const nextStepNumber = lastStepNumber + 1
    const nextSequence = allSequences?.find(s => s.step_number === nextStepNumber)

    return NextResponse.json({
      success: true,
      message: `Forced next sequence for ${email}`,
      prospect: {
        email: email,
        name: prospect.first_name,
        campaign_id: targetCampaignId
      },
      last_sequence: {
        step_number: lastStepNumber,
        timing_days: lastTimingDays,
        updated_timestamp: pastDate.toISOString()
      },
      next_sequence: nextSequence ? {
        step_number: nextSequence.step_number,
        title: nextSequence.title,
        available: true
      } : {
        step_number: nextStepNumber,
        available: false,
        message: `No sequence ${nextStepNumber} configured`
      },
      instructions: "Run the send-emails API to process the now-available sequence"
    })

  } catch (error) {
    console.error('❌ Error in force-next-sequence:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}