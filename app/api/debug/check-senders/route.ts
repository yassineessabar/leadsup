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

// POST - Check all senders and their status
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('📧 Checking all senders in the system...')

    // Get all senders
    const { data: senders, error: sendersError } = await supabaseServer
      .from('campaign_senders')
      .select('*')
      .order('created_at', { ascending: false })

    if (sendersError) {
      throw new Error(`Failed to fetch senders: ${sendersError.message}`)
    }

    // Get all campaigns
    const { data: campaigns, error: campaignsError } = await supabaseServer
      .from('campaigns')
      .select('id, name')

    if (campaignsError) {
      throw new Error(`Failed to fetch campaigns: ${campaignsError.message}`)
    }

    // Group senders by campaign
    const sendersByCampaign = {}
    const activeSenders = []
    const oauthSenders = []
    const smtpSenders = []

    if (senders) {
      for (const sender of senders) {
        const campaignId = sender.campaign_id
        if (!sendersByCampaign[campaignId]) {
          sendersByCampaign[campaignId] = []
        }
        sendersByCampaign[campaignId].push(sender)

        if (sender.is_active) {
          activeSenders.push(sender)
          
          if (sender.access_token) {
            oauthSenders.push(sender)
          }
          if (sender.app_password) {
            smtpSenders.push(sender)
          }
        }
      }
    }

    // Analyze sender health
    const senderAnalysis = activeSenders.map(sender => ({
      email: sender.email,
      name: sender.name,
      campaign_id: sender.campaign_id,
      is_active: sender.is_active,
      auth_type: sender.auth_type || (sender.access_token ? 'oauth2' : sender.app_password ? 'app_password' : 'none'),
      has_oauth: !!sender.access_token,
      has_smtp: !!sender.app_password,
      rotation_priority: sender.rotation_priority || 1,
      emails_sent_today: sender.emails_sent_today || 0,
      daily_limit: sender.daily_limit || 50,
      last_used_at: sender.last_used_at,
      created_at: sender.created_at
    }))

    // Get the test campaign
    const testCampaignId = '6eca8e2e-dc92-4e4d-9b60-c7b37c6d74e4'
    const testCampaignSenders = sendersByCampaign[testCampaignId] || []

    return NextResponse.json({
      success: true,
      summary: {
        total_senders: senders?.length || 0,
        active_senders: activeSenders.length,
        oauth_senders: oauthSenders.length,
        smtp_senders: smtpSenders.length,
        campaigns_with_senders: Object.keys(sendersByCampaign).length
      },
      test_campaign: {
        campaign_id: testCampaignId,
        senders_count: testCampaignSenders.length,
        active_senders: testCampaignSenders.filter(s => s.is_active).length,
        senders: testCampaignSenders.map(s => ({
          email: s.email,
          name: s.name,
          is_active: s.is_active,
          auth_type: s.access_token ? 'OAuth2' : s.app_password ? 'App Password' : 'None'
        }))
      },
      all_active_senders: senderAnalysis,
      campaigns: campaigns?.map(c => ({
        id: c.id,
        name: c.name,
        senders_count: (sendersByCampaign[c.id] || []).length,
        active_senders: (sendersByCampaign[c.id] || []).filter(s => s.is_active).length
      })),
      recommendations: [
        activeSenders.length === 0 ? '❌ No active senders found - add OAuth-authenticated Gmail accounts' : '✅ Active senders found',
        oauthSenders.length === 0 ? '❌ No OAuth senders - authenticate with Gmail' : `✅ ${oauthSenders.length} OAuth senders available`,
        testCampaignSenders.length === 0 ? '❌ Test campaign has no senders - add senders to campaign' : `✅ Test campaign has ${testCampaignSenders.length} senders`,
        activeSenders.length < 3 ? '⚠️ Add more senders for better rotation (recommended: 3+)' : '✅ Good number of senders for rotation'
      ],
      fix_commands: testCampaignSenders.length === 0 ? [
        '# Option 1: Add existing senders to test campaign',
        'Update campaign_senders table to link senders to campaign',
        '',
        '# Option 2: Create new OAuth senders',
        'Use the Sender tab in the frontend to authenticate Gmail accounts'
      ] : []
    })

  } catch (error) {
    console.error('❌ Error checking senders:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check senders',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}