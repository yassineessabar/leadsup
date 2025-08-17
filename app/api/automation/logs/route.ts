import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()
    
    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch (err) {
    console.error("Error in getUserIdFromSession:", err)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const logType = searchParams.get('type')
    const status = searchParams.get('status')
    const campaignId = searchParams.get('campaign_id')
    const runId = searchParams.get('run_id')
    const search = searchParams.get('search')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const offset = (page - 1) * limit

    // Build query 
    let query = supabaseServer
      .from('automation_logs')
      .select(`
        *,
        campaign:campaigns(name),
        contact:contacts(email, first_name, last_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (logType) {
      query = query.eq('log_type', logType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    if (runId) {
      query = query.eq('run_id', runId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (search) {
      query = query.or(`message.ilike.%${search}%,email_subject.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching logs:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }


    // Get summary statistics
    const statsQuery = supabaseServer
      .from('automation_logs')
      .select('log_type, status', { count: 'exact' })

    if (startDate) statsQuery.gte('created_at', startDate)
    if (endDate) statsQuery.lte('created_at', endDate)

    // Get sender information for campaigns - simplified query first
    const { data: sendersData, error: sendersError } = await supabaseServer
      .from('campaign_senders')
      .select(`
        id,
        email,
        health_score,
        is_active,
        is_selected,
        campaign_id
      `)

    if (sendersError) {
      console.error('Error fetching sender data:', sendersError)
    }

    // Calculate sender statistics  
    const activeSenders = (sendersData || []).filter(s => s.is_active && s.is_selected)
    const avgHealthScore = activeSenders.length > 0 
      ? Math.round(activeSenders.reduce((sum, s) => sum + (s.health_score || 75), 0) / activeSenders.length)
      : 0
      

    // Get campaign-specific sender details for each log entry
    const campaignSenderStats = new Map()
    
    // Group senders by campaign
    activeSenders.forEach(sender => {
      if (!campaignSenderStats.has(sender.campaign_id)) {
        campaignSenderStats.set(sender.campaign_id, {
          senderCount: 0,
          healthScores: [],
          senders: []
        })
      }
      
      const stats = campaignSenderStats.get(sender.campaign_id)
      stats.senderCount++
      stats.healthScores.push(sender.health_score || 75)
      stats.senders.push({
        email: sender.email,
        healthScore: sender.health_score || 75,
        isActive: sender.is_active
      })
    })

    // Calculate average health score per campaign
    campaignSenderStats.forEach((stats, campaignId) => {
      stats.avgHealthScore = Math.round(
        stats.healthScores.reduce((sum, score) => sum + score, 0) / stats.healthScores.length
      )
    })

    const [sentStats, skippedStats, errorStats, campaignCount, contactCount] = await Promise.all([
      statsQuery.eq('log_type', 'email_sent').eq('status', 'success').then(r => r.count || 0),
      statsQuery.eq('log_type', 'email_skipped').then(r => r.count || 0),
      statsQuery.eq('status', 'failed').then(r => r.count || 0),
      // Get total number of active campaigns
      supabaseServer
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active')
        .then(r => r.count || 0),
      // Get total number of contacts across all campaigns
      supabaseServer
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .then(r => r.count || 0)
    ])

    // Add campaign-specific sender info to logs
    const enrichedLogs = (data || []).map(log => ({
      ...log,
      campaignSenderInfo: log.campaign_id ? campaignSenderStats.get(log.campaign_id) || null : null
    }))

    return NextResponse.json({
      success: true,
      data: {
        logs: enrichedLogs,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        stats: {
          sent: sentStats,
          skipped: skippedStats,
          errors: errorStats,
          campaigns: campaignCount,
          contacts: contactCount,
          senders: activeSenders.length,
          avgHealthScore: avgHealthScore
        },
        campaignSenderStats: Object.fromEntries(campaignSenderStats)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/automation/logs:', error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Get aggregated stats for dashboard
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { period = '24h' } = await request.json()

    // Calculate date range based on period
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case '1h':
        startDate.setHours(now.getHours() - 1)
        break
      case '24h':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      default:
        startDate.setDate(now.getDate() - 1)
    }

    // Get time-series data for chart
    const { data: timeSeriesData, error: timeSeriesError } = await supabaseServer
      .from('automation_logs')
      .select('created_at, log_type, status')
      .gte('created_at', startDate.toISOString())
      .in('log_type', ['email_sent', 'email_skipped', 'email_failed'])

    if (timeSeriesError) {
      console.error('Error fetching time series:', timeSeriesError)
    }

    // Group by hour for visualization
    const hourlyStats = new Map()
    const hourFormat = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: true,
      day: 'numeric',
      month: 'short'
    })

    (timeSeriesData || []).forEach(log => {
      const hour = hourFormat.format(new Date(log.created_at))
      
      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, { sent: 0, skipped: 0, failed: 0 })
      }
      
      const stats = hourlyStats.get(hour)
      
      if (log.log_type === 'email_sent' && log.status === 'success') {
        stats.sent++
      } else if (log.log_type === 'email_skipped') {
        stats.skipped++
      } else if (log.status === 'failed') {
        stats.failed++
      }
    })

    // Get skip reasons breakdown
    const { data: skipReasons, error: skipError } = await supabaseServer
      .from('automation_logs')
      .select('skip_reason')
      .eq('log_type', 'email_skipped')
      .gte('created_at', startDate.toISOString())
      .not('skip_reason', 'is', null)

    const skipReasonCounts = (skipReasons || []).reduce((acc: any, log) => {
      acc[log.skip_reason] = (acc[log.skip_reason] || 0) + 1
      return acc
    }, {})

    // Get campaign performance
    const { data: campaignPerf, error: campaignError } = await supabaseServer
      .from('automation_logs')
      .select(`
        campaign_id,
        campaign:campaigns(name),
        log_type,
        status
      `)
      .gte('created_at', startDate.toISOString())
      .in('log_type', ['email_sent', 'email_skipped', 'email_failed'])

    const campaignStats = new Map()
    
    (campaignPerf || []).forEach(log => {
      if (!log.campaign_id) return
      
      const campaignName = log.campaign?.name || `Campaign ${log.campaign_id}`
      
      if (!campaignStats.has(campaignName)) {
        campaignStats.set(campaignName, { sent: 0, skipped: 0, failed: 0 })
      }
      
      const stats = campaignStats.get(campaignName)
      
      if (log.log_type === 'email_sent' && log.status === 'success') {
        stats.sent++
      } else if (log.log_type === 'email_skipped') {
        stats.skipped++
      } else if (log.status === 'failed') {
        stats.failed++
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        timeSeries: Array.from(hourlyStats.entries()).map(([time, stats]) => ({
          time,
          ...stats
        })),
        skipReasons: skipReasonCounts,
        campaignPerformance: Array.from(campaignStats.entries()).map(([name, stats]) => ({
          name,
          ...stats
        }))
      }
    })

  } catch (error) {
    console.error('Error in POST /api/automation/logs:', error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}