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

// POST - Fix the sequence progress data
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    const email = 'essabar.yassine@gmail.com'
    const campaignId = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'

    console.log(`🔧 Fixing sequence progress for ${email}...`)

    // Get prospect
    const { data: prospect, error: prospectError } = await supabaseServer
      .from('prospects')
      .select('id')
      .eq('email_address', email)
      .single()

    if (prospectError || !prospect) {
      return NextResponse.json({
        success: false,
        error: 'Prospect not found'
      })
    }

    // Check what's actually in the progress table
    const { data: allProgress, error: progressError } = await supabaseServer
      .from('prospect_sequence_progress')
      .select(`
        id,
        sequence_id, 
        status,
        sent_at,
        created_at,
        campaign_sequences (
          step_number,
          title,
          campaign_id
        )
      `)
      .eq('prospect_id', prospect.id)
      .order('created_at', { ascending: false })

    console.log(`📋 Found ${allProgress?.length || 0} progress records`)

    if (allProgress && allProgress.length > 0) {
      console.log('📊 Progress records:')
      allProgress.forEach((p, i) => {
        console.log(`  ${i + 1}. Step ${p.campaign_sequences?.step_number} - ${p.status} - ${p.sent_at}`)
      })

      // Filter for correct campaign
      const campaignProgress = allProgress.filter(p => 
        p.campaign_sequences?.campaign_id === campaignId
      )

      console.log(`📋 Campaign-specific progress: ${campaignProgress.length} records`)

      if (campaignProgress.length > 0) {
        // Sequence progress exists but might not be showing up due to join issue
        // Let's check if the timestamp update worked
        const latestProgress = campaignProgress[0]
        const stepNumber = latestProgress.campaign_sequences?.step_number
        const sentAt = new Date(latestProgress.sent_at)
        const hoursAgo = (new Date() - sentAt) / (1000 * 60 * 60)

        console.log(`📧 Latest: Step ${stepNumber}, sent ${Math.round(hoursAgo)} hours ago`)

        if (hoursAgo > 300) { // More than 300 hours (12+ days)
          return NextResponse.json({
            success: true,
            message: 'Timestamp update worked - sequence should be ready',
            latest_sequence: {
              step_number: stepNumber,
              sent_hours_ago: Math.round(hoursAgo),
              next_should_be: stepNumber + 1
            },
            issue: 'The API query might have a JOIN issue preventing sequences from showing as completed'
          })
        }
      }
    }

    // If no progress found, create dummy progress for sequences 1-5
    console.log('🏗️ Creating sequence progress records for steps 1-5...')

    const sequences = await supabaseServer
      .from('campaign_sequences')
      .select('id, step_number')
      .eq('campaign_id', campaignId)
      .in('step_number', [1, 2, 3, 4, 5])
      .order('step_number')

    if (sequences.data && sequences.data.length > 0) {
      const progressInserts = []
      const now = new Date()

      sequences.data.forEach((seq, index) => {
        // Create sent dates with proper timing gaps
        const sentDate = new Date(now)
        sentDate.setDate(sentDate.getDate() - (20 - index * 3)) // Spread out over past days
        
        progressInserts.push({
          prospect_id: prospect.id,
          campaign_id: campaignId,
          sequence_id: seq.id,
          status: 'sent',
          sent_at: sentDate.toISOString(),
          message_id: `manual-insert-${seq.step_number}-${Date.now()}`,
          tracking_data: {
            method: 'manual_debug_insert',
            step_number: seq.step_number
          }
        })
      })

      console.log(`📝 Inserting ${progressInserts.length} progress records...`)

      const { error: insertError } = await supabaseServer
        .from('prospect_sequence_progress')
        .insert(progressInserts)

      if (insertError) {
        console.error('❌ Insert error:', insertError)
        return NextResponse.json({
          success: false,
          error: insertError.message
        })
      }

      console.log('✅ Progress records created successfully!')

      return NextResponse.json({
        success: true,
        message: 'Sequence progress fixed - sequences 1-5 marked as sent',
        inserted_records: progressInserts.length,
        next_steps: [
          'Sequence 6 should now be available',
          'Test with: curl -u "admin:password" -X POST http://localhost:3001/api/campaigns/automation/send-emails'
        ]
      })
    }

    return NextResponse.json({
      success: false,
      error: 'No sequences found to create progress for'
    })

  } catch (error) {
    console.error('❌ Error fixing progress:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}