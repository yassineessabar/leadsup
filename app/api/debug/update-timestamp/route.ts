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

// POST - Debug endpoint to update sequence 5 timestamp
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🔧 Debug: Updating sequence 5 timestamp to make sequence 6 available...')

    // Set timestamp to 14 days ago
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    console.log(`⏰ Setting timestamp to: ${fourteenDaysAgo.toISOString()}`)

    // Update the timestamp
    const { data: updateResult, error: updateError } = await supabaseServer
      .rpc('update_sequence_timestamp', {
        p_email: 'essabar.yassine@gmail.com',
        p_campaign_id: '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4',
        p_step_number: 5,
        p_new_timestamp: fourteenDaysAgo.toISOString()
      })

    // If RPC doesn't exist, try direct update
    if (updateError && updateError.message?.includes('function')) {
      console.log('📝 RPC not found, using direct update...')
      
      // Get prospect ID first
      const { data: prospect, error: prospectError } = await supabaseServer
        .from('prospects')
        .select('id')
        .eq('email_address', 'essabar.yassine@gmail.com')
        .single()

      if (prospectError) {
        return NextResponse.json({
          success: false,
          error: 'Prospect not found'
        })
      }

      // Get sequence 5 ID
      const { data: sequence, error: sequenceError } = await supabaseServer
        .from('campaign_sequences')
        .select('id')
        .eq('campaign_id', '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4')
        .eq('step_number', 5)
        .single()

      if (sequenceError) {
        return NextResponse.json({
          success: false,
          error: 'Sequence 5 not found'
        })
      }

      // Direct update
      const { error: directUpdateError } = await supabaseServer
        .from('prospect_sequence_progress')
        .update({
          sent_at: fourteenDaysAgo.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('prospect_id', prospect.id)
        .eq('sequence_id', sequence.id)
        .eq('status', 'sent')

      if (directUpdateError) {
        console.error('❌ Direct update error:', directUpdateError)
        return NextResponse.json({
          success: false,
          error: directUpdateError.message
        })
      }

      console.log('✅ Direct update successful!')
    } else if (updateError) {
      console.error('❌ RPC update error:', updateError)
      return NextResponse.json({
        success: false,
        error: updateError.message
      })
    } else {
      console.log('✅ RPC update successful!')
    }

    // Verify the update
    const { data: verification, error: verifyError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select(`
        sent_at,
        status,
        campaign_sequences (
          step_number,
          timing_days
        )
      `)
      .eq('prospect_id', (await supabaseServer
        .from('prospects')
        .select('id')
        .eq('email_address', 'essabar.yassine@gmail.com')
        .single()).data?.id)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(1)

    let verificationResult = null
    if (!verifyError && verification && verification.length > 0) {
      const latest = verification[0]
      const stepNumber = latest.campaign_sequences?.step_number
      const sentAt = new Date(latest.sent_at)
      const hoursAgo = (new Date() - sentAt) / (1000 * 60 * 60)
      
      verificationResult = {
        step_number: stepNumber,
        sent_at: latest.sent_at,
        hours_ago: Math.round(hoursAgo * 10) / 10,
        timing_days: latest.campaign_sequences?.timing_days
      }
      
      console.log(`✅ Verification: Step ${stepNumber} sent ${Math.round(hoursAgo)} hours ago`)
    }

    return NextResponse.json({
      success: true,
      message: 'Timestamp updated successfully',
      updated_to: fourteenDaysAgo.toISOString(),
      verification: verificationResult,
      next_steps: [
        'Sequence 6 should now be available',
        'Run: curl -u "admin:password" -X POST http://localhost:3001/api/campaigns/automation/send-emails',
        'Check logs for sequence 6 processing'
      ]
    })

  } catch (error) {
    console.error('❌ Error updating timestamp:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}