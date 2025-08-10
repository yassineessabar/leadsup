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

// Get next available sender (copy from main logic)
async function getNextAvailableSender(campaignId: string) {
  try {
    // Get all active senders for this campaign, using existing columns only
    const { data: senders, error } = await supabaseServer
      .from('campaign_senders')
      .select(`
        id, email, name, access_token, refresh_token, app_password, auth_type,
        daily_limit, updated_at
      `)
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .order('updated_at', { ascending: true, nullsFirst: true })

    if (error || !senders || senders.length === 0) {
      throw new Error(`No active senders found for campaign ${campaignId}: ${error?.message || 'Unknown error'}`)
    }

    // For now, use simple round-robin (pick first sender)
    const availableSender = senders[0]

    return availableSender

  } catch (error) {
    console.error('❌ Error getting next available sender:', error)
    throw error
  }
}

// POST - Test sender rotation logic
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🔄 Testing sender rotation logic...')

    const { rounds = 5, campaign_id } = await request.json().catch(() => ({}))

    // Get a campaign ID to test with
    const { data: campaigns, error: campaignsError } = await supabaseServer
      .from('campaigns')
      .select('id')
      .limit(1)

    if (campaignsError || !campaigns || campaigns.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No campaigns found to test rotation with',
        suggestion: 'Create a campaign first'
      })
    }

    const testCampaignId = campaign_id || campaigns[0].id

    // Get initial sender state (using existing columns only)
    const { data: initialSenders, error: sendersError } = await supabaseServer
      .from('campaign_senders')
      .select('email, name, daily_limit, is_active, updated_at')
      .eq('campaign_id', testCampaignId)
      .eq('is_active', true)

    if (sendersError || !initialSenders || initialSenders.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active senders found for this campaign',
        campaign_id: testCampaignId,
        suggestion: 'Add OAuth-authenticated senders to this campaign'
      })
    }

    console.log(`Found ${initialSenders.length} active senders for rotation test`)

    const rotationResults = []
    const senderUsage = {} as Record<string, number>

    // Test rotation multiple rounds
    for (let round = 1; round <= rounds; round++) {
      try {
        console.log(`🔄 Round ${round}: Getting next sender...`)
        
        const selectedSender = await getNextAvailableSender(testCampaignId)
        
        // Simulate using this sender (update timestamp for rotation)
        const { error: updateError } = await supabaseServer
          .from('campaign_senders')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedSender.id)

        if (updateError) {
          console.error(`Error updating sender ${selectedSender.email}:`, updateError)
        }

        senderUsage[selectedSender.email] = (senderUsage[selectedSender.email] || 0) + 1

        rotationResults.push({
          round: round,
          selected_sender: selectedSender.email,
          sender_name: selectedSender.name,
          daily_limit: selectedSender.daily_limit || 50,
          updated_at_before: selectedSender.updated_at,
          status: '✅ SELECTED'
        })

        // Small delay between rounds
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (rotationError) {
        rotationResults.push({
          round: round,
          error: rotationError instanceof Error ? rotationError.message : 'Unknown error',
          status: '❌ FAILED'
        })
        console.error(`Round ${round} failed:`, rotationError)
      }
    }

    // Get final sender state  
    const { data: finalSenders } = await supabaseServer
      .from('campaign_senders')
      .select('email, name, updated_at')
      .eq('campaign_id', testCampaignId)
      .eq('is_active', true)

    // Analyze rotation fairness
    const rotationAnalysis = {
      total_rounds: rounds,
      senders_used: Object.keys(senderUsage).length,
      usage_distribution: senderUsage,
      is_fair_rotation: Object.keys(senderUsage).length > 1,
      most_used_sender: Object.entries(senderUsage).reduce((a, b) => a[1] > b[1] ? a : b)?.[0],
      rotation_efficiency: Object.keys(senderUsage).length / initialSenders.length
    }

    return NextResponse.json({
      success: true,
      campaign_id: testCampaignId,
      initial_senders: initialSenders.map(s => ({
        email: s.email,
        name: s.name,
        daily_limit: s.daily_limit || 50,
        updated_at: s.updated_at
      })),
      rotation_results: rotationResults,
      final_senders: finalSenders?.map(s => ({
        email: s.email,
        name: s.name,
        updated_at: s.updated_at
      })),
      rotation_analysis: rotationAnalysis,
      recommendations: [
        rotationAnalysis.is_fair_rotation ? 
          '✅ Rotation is working - multiple senders used' : 
          '⚠️ Only one sender used - check rotation logic',
        rotationAnalysis.rotation_efficiency > 0.5 ? 
          '✅ Good rotation efficiency' : 
          '⚠️ Low rotation efficiency - consider more senders',
        rotationResults.some(r => r.status === '❌ FAILED') ? 
          '❌ Some rounds failed - check sender limits or auth' : 
          '✅ All rounds successful'
      ]
    })

  } catch (error) {
    console.error('❌ Error testing sender rotation:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test sender rotation',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}