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

// GET - Get real sequence IDs for testing
export async function GET(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Test Sequence IDs API"' } }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId') || '695fcc7f-7674-4d1f-adf2-ff910ffdb853'

    console.log(`🔍 Fetching real sequence IDs for campaign ${campaignId}`)

    // Get all sequences for the campaign
    const { data: sequences, error: sequencesError } = await supabaseServer
      .from('campaign_sequences')
      .select('id, step_number, title, subject, timing_days, is_active')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .order('step_number')

    if (sequencesError) {
      console.error('Error fetching sequences:', sequencesError)
      return NextResponse.json({
        success: false,
        error: sequencesError.message
      }, { status: 500 })
    }

    // Get all prospects for the campaign
    const { data: prospects, error: prospectsError } = await supabaseServer
      .from('prospects')
      .select('id, email_address, first_name, last_name')
      .eq('campaign_id', campaignId)
      .limit(5)

    if (prospectsError) {
      console.error('Error fetching prospects:', prospectsError)
    }

    console.log(`✅ Found ${sequences?.length || 0} sequences and ${prospects?.length || 0} prospects`)

    return NextResponse.json({
      success: true,
      data: {
        campaign_id: campaignId,
        sequences: sequences || [],
        prospects: prospects || [],
        test_data: {
          first_sequence_id: sequences?.[0]?.id,
          second_sequence_id: sequences?.[1]?.id,
          first_prospect_id: prospects?.[0]?.id,
          example_progression: sequences?.length > 0 && prospects?.length > 0 ? {
            campaignId: campaignId,
            contactId: prospects[0].id,
            sequenceId: sequences[0].id,
            status: "sent",
            sentAt: new Date().toISOString(),
            messageId: `test-msg-${Date.now()}`,
            autoProgressNext: true
          } : null
        }
      }
    })

  } catch (error) {
    console.error('❌ Error fetching test sequence IDs:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}