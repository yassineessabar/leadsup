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

    // For demo purposes, if not authenticated, return mock data
    if (!userId) {
      return NextResponse.json({
        success: true,
        data: {
          logs: getMockAutomationLogs(),
          pagination: {
            page: 1,
            limit: 50,
            total: 15,
            totalPages: 1
          },
          stats: {
            sent: 12,
            skipped: 2,
            errors: 1,
            campaigns: 3,
            contacts: 25,
            senders: 4,
            avgHealthScore: 85
          },
          campaignSenderStats: {}
        }
      })
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

    // Get sender accounts data (basic info only since health_score column doesn't exist)
    const { data: senderAccountsData, error: accountsError } = await supabaseServer
      .from('sender_accounts')
      .select(`
        id,
        email,
        is_active
      `)
      .neq('email', 'essabar.yassine@gmail.com')
      .eq('is_active', true)

    if (accountsError) {
      console.error('Error fetching sender accounts data:', accountsError)
    }
    
    // Get all sender accounts (including duplicates) 
    const allSenderAccounts = (senderAccountsData || [])
    
    // Get unique sender accounts by email for counting
    const uniqueSenderAccounts = allSenderAccounts.reduce((unique, account) => {
      const existing = unique.find(a => a.email === account.email)
      if (!existing) {
        unique.push(account)
      }
      return unique
    }, [] as any[])
    
    // Get health scores using ALL sender IDs (the API can handle duplicates)
    let avgHealthScore = 0
    let healthScoreValues: number[] = []
    
    if (allSenderAccounts.length > 0) {
      try {
        // Use ALL sender IDs, not just unique ones
        const allSenderIds = allSenderAccounts.map(s => s.id)
        const params = new URLSearchParams()
        params.set('senderIds', allSenderIds.join(','))
        
        console.log('Debug - Calling health API with', allSenderIds.length, 'sender IDs')
        
        // Make an internal API call to get health scores
        const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sender-accounts/health-score?${params}`, {
          headers: {
            'Cookie': request.headers.get('Cookie') || ''
          }
        })
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.json()
          console.log('Debug - Health API response structure:', {
            success: healthData.success,
            hasHealthScores: !!healthData.healthScores,
            healthScoreKeys: healthData.healthScores ? Object.keys(healthData.healthScores) : [],
            message: healthData.message
          })
          
          if (healthData.success && healthData.healthScores) {
            // The API returns { success: true, healthScores: { senderId: { score: number, ... }, ... } }
            const allHealthScores = Object.values(healthData.healthScores)
              .map((scoreData: any) => scoreData?.score)
              .filter(score => typeof score === 'number')
            
            console.log('Debug - All extracted health scores:', allHealthScores)
            
            // Get unique health scores by email to avoid counting duplicates
            const uniqueHealthScores = new Map()
            allSenderAccounts.forEach(account => {
              if (healthData.healthScores[account.id]?.score) {
                uniqueHealthScores.set(account.email, healthData.healthScores[account.id].score)
              }
            })
            
            healthScoreValues = Array.from(uniqueHealthScores.values())
            console.log('Debug - Unique health score values by email:', healthScoreValues)
            
            avgHealthScore = healthScoreValues.length > 0 ? 
              Math.round(healthScoreValues.reduce((sum, score) => sum + score, 0) / healthScoreValues.length) : 0
            
            console.log('Debug - Final calculated average:', avgHealthScore)
          } else {
            console.log('Debug - API response missing success or healthScores:', {
              success: healthData.success,
              hasHealthScores: !!healthData.healthScores,
              fullResponse: healthData
            })
          }
        } else {
          console.error('Health score API failed with status:', healthResponse.status)
          const errorText = await healthResponse.text()
          console.error('Health score API error response:', errorText)
        }
      } catch (error) {
        console.error('Error fetching health scores:', error)
      }
    }
    
    const activeSenderAccounts = uniqueSenderAccounts
      
    // Debug logging to help troubleshoot
    console.log('Debug - Active sender accounts:', activeSenderAccounts.length)
    console.log('Debug - Health score values:', healthScoreValues)
    console.log('Debug - Calculated avg health score:', avgHealthScore)
    console.log('Debug - Sender accounts:', activeSenderAccounts.map(s => ({ 
      id: s.id,
      email: s.email
    })))
      

    // For campaign-specific stats, we'll use a simplified approach since we don't have campaign relationships
    const campaignSenderStats = new Map()

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
          senders: activeSenderAccounts.length,
          avgHealthScore: healthScoreValues.length > 0 ? avgHealthScore : 0
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

function getMockAutomationLogs(): any[] {
  const now = new Date()
  return [
    {
      id: 1,
      run_id: "run_12345",
      campaign_id: 1,
      contact_id: 1,
      sender_id: 1,
      log_type: "email_sent",
      status: "success",
      message: "Email sent successfully to contact",
      details: {
        sender: "support@company.com",
        messageId: "msg_abc123",
        nextEmailIn: "3 days",
        testMode: false
      },
      sequence_step: 1,
      email_subject: "Welcome to our platform!",
      skip_reason: null,
      execution_time_ms: 1250,
      timezone: "America/New_York",
      created_at: new Date(now.getTime() - 300000).toISOString(), // 5 minutes ago
      campaign: { name: "Welcome Series" },
      contact: { 
        email: "john.doe@example.com", 
        first_name: "John", 
        last_name: "Doe",
        timezone: "America/New_York"
      },
      sender: { email: "support@company.com" },
      campaignSenderInfo: {
        senderCount: 4,
        avgHealthScore: 85,
        senders: [
          { email: "support@company.com", healthScore: 90, isActive: true },
          { email: "sales@company.com", healthScore: 82, isActive: true },
          { email: "noreply@company.com", healthScore: 88, isActive: true },
          { email: "info@company.com", healthScore: 80, isActive: false }
        ]
      }
    },
    {
      id: 2,
      run_id: "run_12345",
      campaign_id: 1,
      contact_id: 2,
      sender_id: 2,
      log_type: "email_skipped",
      status: "skipped",
      message: "Email skipped due to business hours restriction",
      details: {
        sender: "sales@company.com",
        testMode: false
      },
      sequence_step: 2,
      email_subject: "Follow-up on your inquiry",
      skip_reason: "outside_hours",
      execution_time_ms: null,
      timezone: "Asia/Tokyo",
      created_at: new Date(now.getTime() - 600000).toISOString(), // 10 minutes ago
      campaign: { name: "Welcome Series" },
      contact: { 
        email: "yuki.tanaka@example.com", 
        first_name: "Yuki", 
        last_name: "Tanaka",
        timezone: "Asia/Tokyo"
      },
      sender: { email: "sales@company.com" },
      campaignSenderInfo: {
        senderCount: 4,
        avgHealthScore: 85,
        senders: [
          { email: "support@company.com", healthScore: 90, isActive: true },
          { email: "sales@company.com", healthScore: 82, isActive: true },
          { email: "noreply@company.com", healthScore: 88, isActive: true },
          { email: "info@company.com", healthScore: 80, isActive: false }
        ]
      }
    },
    {
      id: 3,
      run_id: "run_12345",
      campaign_id: 2,
      contact_id: 3,
      sender_id: 1,
      log_type: "email_sent",
      status: "success",
      message: "Email sent successfully to contact",
      details: {
        sender: "support@company.com",
        messageId: "msg_def456",
        nextEmailIn: "1 week",
        testMode: false
      },
      sequence_step: 3,
      email_subject: "Special offer just for you",
      skip_reason: null,
      execution_time_ms: 980,
      timezone: "Europe/London",
      created_at: new Date(now.getTime() - 900000).toISOString(), // 15 minutes ago
      campaign: { name: "Product Launch" },
      contact: { 
        email: "alice.johnson@example.com", 
        first_name: "Alice", 
        last_name: "Johnson",
        timezone: "Europe/London"
      },
      sender: { email: "support@company.com" },
      campaignSenderInfo: {
        senderCount: 3,
        avgHealthScore: 87,
        senders: [
          { email: "support@company.com", healthScore: 90, isActive: true },
          { email: "marketing@company.com", healthScore: 85, isActive: true },
          { email: "promo@company.com", healthScore: 86, isActive: true }
        ]
      }
    },
    {
      id: 4,
      run_id: "run_12344",
      campaign_id: null,
      contact_id: null,
      sender_id: null,
      log_type: "run_start",
      status: "success",
      message: "Automation run started - processing scheduled emails",
      details: {
        lookAheadMinutes: 60,
        testMode: false
      },
      sequence_step: null,
      email_subject: null,
      skip_reason: null,
      execution_time_ms: 50,
      timezone: null,
      created_at: new Date(now.getTime() - 1200000).toISOString(), // 20 minutes ago
      campaign: null,
      contact: null,
      sender: null,
      campaignSenderInfo: null
    },
    {
      id: 5,
      run_id: "run_12344",
      campaign_id: null,
      contact_id: null,
      sender_id: null,
      log_type: "run_complete",
      status: "success",
      message: "Automation run completed successfully - processed 7 emails, sent 5, skipped 2",
      details: {
        processed: 7,
        sent: 5,
        skipped: 2,
        errors: 0,
        executionTimeMs: 13457,
        testMode: false
      },
      sequence_step: null,
      email_subject: null,
      skip_reason: null,
      execution_time_ms: 13457,
      timezone: null,
      created_at: new Date(now.getTime() - 1187000).toISOString(), // ~20 minutes ago
      campaign: null,
      contact: null,
      sender: null,
      campaignSenderInfo: null
    },
    {
      id: 6,
      run_id: "run_12343",
      campaign_id: 3,
      contact_id: 4,
      sender_id: 3,
      log_type: "email_failed",
      status: "failed",
      message: "Email delivery failed - recipient rejected",
      details: {
        sender: "noreply@company.com",
        error: "550 Recipient address rejected",
        testMode: false
      },
      sequence_step: 1,
      email_subject: "Your account verification",
      skip_reason: null,
      execution_time_ms: 2500,
      timezone: "America/Los_Angeles",
      created_at: new Date(now.getTime() - 1800000).toISOString(), // 30 minutes ago
      campaign: { name: "Account Verification" },
      contact: { 
        email: "invalid@bounce.com", 
        first_name: "Test", 
        last_name: "User",
        timezone: "America/Los_Angeles"
      },
      sender: { email: "noreply@company.com" },
      campaignSenderInfo: {
        senderCount: 2,
        avgHealthScore: 75,
        senders: [
          { email: "noreply@company.com", healthScore: 70, isActive: true },
          { email: "verify@company.com", healthScore: 80, isActive: true }
        ]
      }
    }
  ]
}