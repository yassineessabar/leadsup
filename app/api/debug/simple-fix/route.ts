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

// POST - Simple fix to create progress records for sequences 1-5
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

    console.log(`🔧 Creating progress records for sequences 1-5...`)

    // Get prospect ID
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

    // Get sequences 1-5
    const { data: sequences, error: sequencesError } = await supabaseServer
      .from('campaign_sequences')
      .select('id, step_number, title')
      .eq('campaign_id', campaignId)
      .in('step_number', [1, 2, 3, 4, 5])
      .order('step_number')

    if (sequencesError || !sequences || sequences.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Sequences 1-5 not found'
      })
    }

    console.log(`📝 Found ${sequences.length} sequences to mark as sent`)

    // Create progress records with basic columns only
    const progressRecords = sequences.map((seq, index) => {
      const sentDate = new Date()
      sentDate.setDate(sentDate.getDate() - (15 - index * 2)) // Spread out over past days
      
      return {
        prospect_id: prospect.id,
        campaign_id: campaignId,
        sequence_id: seq.id,
        status: 'sent',
        sent_at: sentDate.toISOString(),
        message_id: `debug-${seq.step_number}-${Date.now()}`
      }
    })

    // Insert the records
    const { error: insertError } = await supabaseServer
      .from('prospect_sequence_progress')
      .insert(progressRecords)

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: insertError.message
      })
    }

    console.log('✅ Successfully created progress records!')

    return NextResponse.json({
      success: true,
      message: 'Progress records created for sequences 1-5',
      records_created: progressRecords.length,
      sequences: sequences.map(s => ({
        step_number: s.step_number,
        title: s.title
      })),
      next_steps: [
        'Sequence 6 should now be available',
        'Test: curl -u "admin:password" -X POST http://localhost:3001/api/campaigns/automation/send-emails'
      ]
    })

  } catch (error) {
    console.error('❌ Error creating progress records:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}