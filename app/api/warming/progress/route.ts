import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      return null
    }

    return data.user_id
  } catch (error) {
    return null
  }
}

// GET /api/warming/progress - Get warming progress for user's campaigns
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')

    if (campaignId) {
      // Get progress for specific campaign
      return await getCampaignWarmingProgress(campaignId, userId)
    } else {
      // Get progress for all user's warming campaigns
      return await getAllWarmingProgress(userId)
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch warming progress'
    }, { status: 500 })
  }
}

// Get warming progress for a specific campaign
async function getCampaignWarmingProgress(campaignId: string, userId: string) {

  // Verify campaign ownership
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, status')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
  }

  // Get warming progress using the database function
  const { data: progressData, error: progressError } = await supabase
    .rpc('get_warming_progress', { p_campaign_id: campaignId })

  if (progressError) {
    return NextResponse.json({ success: false, error: 'Failed to fetch progress' }, { status: 500 })
  }

  // Get recent activities for each sender
  const activities = await Promise.all(
    (progressData || []).map(async (sender: any) => {
      const { data: recentActivities } = await supabase
        .from('warmup_activities')
        .select('*')
        .eq('warmup_campaign_id', (await supabase
          .from('warmup_campaigns')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('sender_email', sender.sender_email)
          .single()
        ).data?.id)
        .order('created_at', { ascending: false })
        .limit(10)

      return {
        sender_email: sender.sender_email,
        activities: recentActivities || []
      }
    })
  )

  // Get daily statistics for the campaign
  const { data: dailyStats } = await supabase
    .from('warmup_daily_stats')
    .select('*')
    .in('warmup_campaign_id', 
      (await supabase
        .from('warmup_campaigns')
        .select('id')
        .eq('campaign_id', campaignId)
      ).data?.map(w => w.id) || []
    )
    .order('date', { ascending: false })
    .limit(30)

  return NextResponse.json({
    success: true,
    data: {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status
      },
      senders: progressData || [],
      recentActivities: activities,
      dailyStats: dailyStats || [],
      summary: calculateProgressSummary(progressData || [])
    }
  })
}

// Get warming progress for all user's campaigns
async function getAllWarmingProgress(userId: string) {

  // Get all warming campaigns first
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, name, status')
    .eq('user_id', userId)
    .eq('status', 'Warming')

  if (campaignsError) {
    return NextResponse.json({ success: false, error: 'Failed to fetch campaigns' }, { status: 500 })
  }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        campaigns: [],
        summary: {
          totalCampaigns: 0,
          totalSenders: 0,
          activeWarmups: 0,
          totalEmailsSentToday: 0,
          totalOpensToday: 0,
          totalRepliesToday: 0,
          averageHealthScore: 0,
          openRate: 0,
          replyRate: 0
        }
      }
    })
  }

  // Get warmup campaigns for these campaigns
  const campaignIds = campaigns.map(c => c.id)
  const { data: warmupCampaigns, error: warmupError } = await supabase
    .from('warmup_campaigns')
    .select(`
      id,
      campaign_id,
      sender_email,
      phase,
      day_in_phase,
      total_warming_days,
      daily_target,
      emails_sent_today,
      opens_today,
      replies_today,
      current_health_score,
      target_health_score,
      status,
      last_activity_at,
      created_at
    `)
    .in('campaign_id', campaignIds)

  if (warmupError) {
    return NextResponse.json({ success: false, error: 'Failed to fetch warmup campaigns' }, { status: 500 })
  }

  // Combine campaigns with their warmup data
  const campaignsWithWarmup = campaigns.map(campaign => ({
    ...campaign,
    warmup_campaigns: warmupCampaigns?.filter(w => w.campaign_id === campaign.id) || []
  }))

  const warmingCampaigns = campaignsWithWarmup.filter(c => c.warmup_campaigns && c.warmup_campaigns.length > 0)

  // Calculate summary statistics
  let totalSenders = 0
  let totalEmailsSent = 0
  let totalOpens = 0
  let totalReplies = 0
  let averageHealthScore = 0
  let activeWarmups = 0

  warmingCampaigns.forEach(campaign => {
    campaign.warmup_campaigns.forEach((warmup: any) => {
      totalSenders++
      totalEmailsSent += warmup.emails_sent_today || 0
      totalOpens += warmup.opens_today || 0
      totalReplies += warmup.replies_today || 0
      averageHealthScore += warmup.current_health_score || 0
      if (warmup.status === 'active') activeWarmups++
    })
  })

  if (totalSenders > 0) {
    averageHealthScore = Math.round(averageHealthScore / totalSenders)
  }

  return NextResponse.json({
    success: true,
    data: {
      campaigns: warmingCampaigns,
      summary: {
        totalCampaigns: warmingCampaigns.length,
        totalSenders,
        activeWarmups,
        totalEmailsSentToday: totalEmailsSent,
        totalOpensToday: totalOpens,
        totalRepliesToday: totalReplies,
        averageHealthScore,
        openRate: totalEmailsSent > 0 ? Math.round((totalOpens / totalEmailsSent) * 100) : 0,
        replyRate: totalEmailsSent > 0 ? Math.round((totalReplies / totalEmailsSent) * 100) : 0
      }
    }
  })
}

// Calculate progress summary for a campaign
function calculateProgressSummary(senders: any[]) {
  if (senders.length === 0) {
    return {
      totalSenders: 0,
      averagePhase: 0,
      averageProgress: 0,
      averageHealthScore: 0,
      estimatedDaysRemaining: 0
    }
  }

  const totalSenders = senders.length
  const averagePhase = senders.reduce((sum, s) => sum + s.phase, 0) / totalSenders
  const averageProgress = senders.reduce((sum, s) => sum + (s.progress_percentage || 0), 0) / totalSenders
  const averageHealthScore = senders.reduce((sum, s) => sum + s.current_health_score, 0) / totalSenders

  // Estimate days remaining based on current progress
  const averageDaysInPhase = senders.reduce((sum, s) => sum + s.day_in_phase, 0) / totalSenders
  const estimatedDaysRemaining = Math.max(0, 35 - senders.reduce((sum, s) => sum + s.total_days, 0) / totalSenders)

  return {
    totalSenders,
    averagePhase: Math.round(averagePhase * 10) / 10,
    averageProgress: Math.round(averageProgress),
    averageHealthScore: Math.round(averageHealthScore),
    estimatedDaysRemaining: Math.round(estimatedDaysRemaining)
  }
}

// POST /api/warming/progress - Update warming settings
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { campaignId, senderEmail, action, value } = await request.json()

    if (!campaignId || !senderEmail || !action) {
      return NextResponse.json({ 
        success: false, 
        error: "Campaign ID, sender email, and action are required" 
      }, { status: 400 })
    }

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
    }

    // Get warming campaign record
    const { data: warmupCampaign, error: warmupError } = await supabase
      .from('warmup_campaigns')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('sender_email', senderEmail)
      .single()

    if (warmupError || !warmupCampaign) {
      return NextResponse.json({ success: false, error: 'Warming campaign not found' }, { status: 404 })
    }

    let updateData: any = {}

    switch (action) {
      case 'pause':
        updateData.status = 'paused'
        break
      case 'resume':
        updateData.status = 'active'
        break
      case 'set_daily_target':
        if (typeof value !== 'number' || value < 1 || value > 100) {
          return NextResponse.json({ success: false, error: 'Invalid daily target' }, { status: 400 })
        }
        updateData.daily_target = value
        break
      case 'advance_phase':
        if (warmupCampaign.phase < 3) {
          updateData.phase = warmupCampaign.phase + 1
          updateData.day_in_phase = 1
          updateData.daily_target = warmupCampaign.phase === 1 ? 15 : 30
        }
        break
      case 'reset_phase':
        updateData.phase = 1
        updateData.day_in_phase = 1
        updateData.daily_target = 5
        break
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    // Update warming campaign
    const { error: updateError } = await supabase
      .from('warmup_campaigns')
      .update(updateData)
      .eq('id', warmupCampaign.id)

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to update warming campaign' }, { status: 500 })
    }


    return NextResponse.json({
      success: true,
      message: `Warming campaign ${action} completed successfully`
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update warming progress'
    }, { status: 500 })
  }
}