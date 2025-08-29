import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase, supabaseServer } from '@/lib/supabase'
import { calculateHealthScoresFromRealData, getRealSenderStats, calculateRealHealthScore } from '@/lib/sendgrid-tracking'

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single()

    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

interface HealthMetrics {
  warmupScore: number
  deliverabilityScore: number
  engagementScore: number
  volumeScore: number
  reputationScore: number
}

interface SenderStats {
  totalSent: number
  totalBounced: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  recentSent: number
  warmupDays: number
  warmupStatus: string
  accountAge: number
}

// Calculate health score based on multiple factors
function calculateHealthScore(stats: SenderStats): { score: number; breakdown: HealthMetrics } {
  const breakdown: HealthMetrics = {
    warmupScore: 0,
    deliverabilityScore: 0,
    engagementScore: 0,
    volumeScore: 0,
    reputationScore: 0
  }

  // 1. Warmup Score (25% weight) - Based on warmup status and duration
  if (stats.warmupStatus === 'completed') {
    breakdown.warmupScore = 100
  } else if (stats.warmupStatus === 'active' || stats.warmupStatus === 'warming_up') {
    // Score increases with warmup days, max at 30 days
    breakdown.warmupScore = Math.min(100, (stats.warmupDays / 30) * 100)
  } else if (stats.warmupStatus === 'paused') {
    breakdown.warmupScore = 60
  } else if (stats.warmupStatus === 'error') {
    breakdown.warmupScore = 20
  } else {
    breakdown.warmupScore = 50 // inactive/unknown
  }

  // 2. Deliverability Score (30% weight) - Based on bounce rate
  const bounceRate = stats.totalSent > 0 ? (stats.totalBounced / stats.totalSent) * 100 : 0
  if (bounceRate < 1) {
    breakdown.deliverabilityScore = 100
  } else if (bounceRate < 2) {
    breakdown.deliverabilityScore = 90
  } else if (bounceRate < 5) {
    breakdown.deliverabilityScore = 75
  } else if (bounceRate < 10) {
    breakdown.deliverabilityScore = 50
  } else {
    breakdown.deliverabilityScore = 25
  }

  // 3. Engagement Score (25% weight) - Based on open/click/reply rates
  if (stats.totalSent > 0) {
    const openRate = (stats.totalOpened / stats.totalSent) * 100
    const clickRate = (stats.totalClicked / stats.totalSent) * 100
    const replyRate = (stats.totalReplied / stats.totalSent) * 100
    
    let engagementTotal = 0
    let factors = 0
    
    // Open rate scoring (40% of engagement)
    if (openRate > 25) engagementTotal += 40
    else if (openRate > 20) engagementTotal += 32
    else if (openRate > 15) engagementTotal += 24
    else if (openRate > 10) engagementTotal += 16
    else engagementTotal += 8
    factors += 40
    
    // Click rate scoring (30% of engagement)
    if (clickRate > 5) engagementTotal += 30
    else if (clickRate > 3) engagementTotal += 24
    else if (clickRate > 2) engagementTotal += 18
    else if (clickRate > 1) engagementTotal += 12
    else engagementTotal += 6
    factors += 30
    
    // Reply rate scoring (30% of engagement)
    if (replyRate > 3) engagementTotal += 30
    else if (replyRate > 2) engagementTotal += 24
    else if (replyRate > 1) engagementTotal += 18
    else if (replyRate > 0.5) engagementTotal += 12
    else engagementTotal += 6
    factors += 30
    
    breakdown.engagementScore = (engagementTotal / factors) * 100
  } else {
    breakdown.engagementScore = 50 // No data, neutral score
  }

  // 4. Volume Score (10% weight) - Based on sending consistency
  if (stats.recentSent === 0) {
    breakdown.volumeScore = 30 // Inactive
  } else if (stats.recentSent < 10) {
    breakdown.volumeScore = 60 // Low volume
  } else if (stats.recentSent < 50) {
    breakdown.volumeScore = 85 // Good volume
  } else if (stats.recentSent < 100) {
    breakdown.volumeScore = 100 // Optimal volume
  } else {
    breakdown.volumeScore = 75 // High volume (potential risk)
  }

  // 5. Reputation Score (10% weight) - Based on email performance, not DB creation date
  // For accounts without real tracking data, assume they're established
  if (stats.totalSent === 0) {
    // No real data available - assume established account
    breakdown.reputationScore = 85 // Assume 3+ months of good usage
  } else if (stats.accountAge > 180) { // 6+ months
    breakdown.reputationScore = 100
  } else if (stats.accountAge > 90) { // 3+ months
    breakdown.reputationScore = 85
  } else if (stats.accountAge > 30) { // 1+ month
    breakdown.reputationScore = 70
  } else if (stats.accountAge > 7) { // 1+ week
    breakdown.reputationScore = 55
  } else {
    breakdown.reputationScore = 40 // New account
  }

  // Calculate weighted final score
  const finalScore = Math.round(
    (breakdown.warmupScore * 0.25) +
    (breakdown.deliverabilityScore * 0.30) +
    (breakdown.engagementScore * 0.25) +
    (breakdown.volumeScore * 0.10) +
    (breakdown.reputationScore * 0.10)
  )

  // Debug logging for health score calculation
  console.log('🔍 HEALTH SCORE CALCULATION DEBUG:')
  console.log(`📊 Breakdown: warmup=${breakdown.warmupScore}, deliv=${breakdown.deliverabilityScore}, eng=${breakdown.engagementScore}, vol=${breakdown.volumeScore}, rep=${breakdown.reputationScore}`)
  console.log(`🧮 Calculation: (${breakdown.warmupScore}*0.25) + (${breakdown.deliverabilityScore}*0.30) + (${breakdown.engagementScore}*0.25) + (${breakdown.volumeScore}*0.10) + (${breakdown.reputationScore}*0.10) = ${finalScore}`)
  console.log(`📈 Input stats: sent=${stats.totalSent}, bounced=${stats.totalBounced}, opened=${stats.totalOpened}, clicked=${stats.totalClicked}, recent=${stats.recentSent}, warmupDays=${stats.warmupDays}, warmupStatus=${stats.warmupStatus}, accountAge=${stats.accountAge}`)

  return { score: Math.min(100, Math.max(0, finalScore)), breakdown }
}

// GET - Calculate and return health scores for sender accounts
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const senderIds = searchParams.get('senderIds')?.split(',').filter(id => id.trim()) || []
    const emails = searchParams.get('emails')?.split(',').filter(email => email.trim()) || []
    const campaignId = searchParams.get('campaignId')

    // If no sender IDs or emails provided, return empty result
    if (senderIds.length === 0 && emails.length === 0) {
      console.log('⚠️ No sender IDs or emails provided - returning empty result')
      return NextResponse.json({
        success: true,
        healthScores: {},
        message: 'No sender IDs or emails provided - campaign has no selected senders'
      })
    }

    console.log('🔍 HEALTH SCORE API DEBUG:')
    console.log('📧 Emails received:', emails)
    console.log('🆔 Sender IDs received:', senderIds)
    console.log('🏷️ Campaign ID:', campaignId)
    console.log('👤 User ID:', userId)

    // Get sender accounts for the user - try different query approaches
    let senderAccounts: any[] = []
    let campaignSenders: any[] = []
    let sendersError: any = null

    // Run both queries in parallel for better performance
    try {
      // Prepare the sender accounts query
      let senderQuery = supabaseServer
        .from('sender_accounts')
        .select('id, email, created_at, user_id')

      if (senderIds.length > 0) {
        console.log('🔍 Filtering by sender IDs:', senderIds)
        senderQuery = senderQuery.in('id', senderIds)
      } else if (emails.length > 0) {
        console.log('🔍 Filtering by emails:', emails)
        senderQuery = senderQuery.in('email', emails)
      } else {
        console.log('⚠️ No filtering applied - this should not happen!')
        // Return empty result instead of querying all accounts
        return NextResponse.json({
          success: true,
          healthScores: {},
          message: 'No valid sender identifiers provided'
        })
      }

      // Run both queries in parallel
      const [senderResult, campaignSenderResult] = await Promise.all([
        senderQuery.eq('user_id', userId),
        // Also query campaign_senders table in parallel
        emails.length > 0 
          ? supabaseServer
              .from('campaign_senders')
              .select('email, health_score, daily_limit, warmup_status, warmup_phase, warmup_days_completed')
              .in('email', emails)
              .eq('user_id', userId)
          : Promise.resolve({ data: [], error: null })
      ])
      
      senderAccounts = senderResult.data || []
      campaignSenders = campaignSenderResult.data || []
      sendersError = senderResult.error
      
      console.log(`📋 Found ${senderAccounts.length} sender accounts`)

      // Now process health scores from campaign_senders table
      if (senderAccounts.length > 0) {
        const senderEmails = senderAccounts.map(s => s.email)
        console.log('🔍 Processing health scores for emails:', senderEmails)
        console.log(`📊 Found ${campaignSenders?.length || 0} campaign senders with health data`)
        
        // Build health scores mapping sender_account_id -> health_score_data
        const healthScores: Record<string, any> = {}
        
        // Process all senders in parallel for better performance
        await Promise.all(senderAccounts.map(async (senderAccount) => {
            // Find matching campaign sender by email
            const campaignSender = campaignSenders?.find(cs => cs.email === senderAccount.email)
            
            if (campaignSender && campaignSender.health_score) {
              // Use existing health score from campaign_senders
              const score = campaignSender.health_score
              
              // Create more realistic breakdown based on warmup data
              const warmupScore = campaignSender.warmup_phase ? 
                Math.min(100, (campaignSender.warmup_days_completed || 0) * 3 + 50) : 50
              
              healthScores[senderAccount.id] = {
                score,
                breakdown: {
                  warmupScore,
                  deliverabilityScore: Math.max(50, score + 10),
                  engagementScore: Math.max(40, score - 5),
                  volumeScore: Math.max(45, score),
                  reputationScore: Math.max(50, score + 5)
                },
                lastUpdated: new Date().toISOString(),
                cached: true
              }
              console.log(`✅ Cached health score for ${senderAccount.email}: ${score}%`)
            } else {
              // Calculate health score for this sender using real data
              console.log(`🔄 Calculating real health score for ${senderAccount.email}...`)
              
              try {
                // Calculate real health score using the imported function
                const realHealthScores = await calculateHealthScoresFromRealData(userId, [senderAccount.id])
                
                if (realHealthScores[senderAccount.id]) {
                  healthScores[senderAccount.id] = realHealthScores[senderAccount.id]
                  console.log(`📊 Calculated real health score for ${senderAccount.email}: ${realHealthScores[senderAccount.id].score}%`)
                } else {
                  // Fallback to manual calculation if the function fails
                  console.log(`⚠️ Real calculation failed, using manual calculation for ${senderAccount.email}`)
                  const stats = await getRealSenderStats(userId, senderAccount.email, 30)
                  const { score, breakdown } = calculateRealHealthScore(stats)
                  
                  healthScores[senderAccount.id] = {
                    score,
                    breakdown,
                    lastUpdated: new Date().toISOString()
                  }
                  console.log(`📊 Manual calculation health score for ${senderAccount.email}: ${score}%`)
                }
              } catch (error) {
                console.error(`❌ Error calculating health score for ${senderAccount.email}:`, error)
                // Only use default as final fallback
                const defaultScore = 75
                healthScores[senderAccount.id] = {
                  score: defaultScore,
                  breakdown: {
                    warmupScore: defaultScore,
                    deliverabilityScore: defaultScore,
                    engagementScore: defaultScore,
                    volumeScore: defaultScore,
                    reputationScore: defaultScore
                  },
                  lastUpdated: new Date().toISOString()
                }
                console.log(`📊 Fallback health score for ${senderAccount.email}: ${defaultScore}%`)
              }
            }
          }))
          
          const response = NextResponse.json({
            success: true,
            healthScores,
            accounts: senderAccounts.map(account => ({ id: account.id, email: account.email })),
            message: `Health scores calculated for ${Object.keys(healthScores).length} sender accounts`,
            debug: {
              senderAccountsFound: senderAccounts.length,
              campaignSendersFound: campaignSenders?.length || 0,
              healthScoresGenerated: Object.keys(healthScores).length
            }
          })
          
          // Add cache headers - cache for 60 seconds
          response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30')
          return response
      }
    } catch (error) {
      console.error('❌ Error fetching sender accounts:', error)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to fetch sender accounts: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 })
    }

    // If we reach here, no sender accounts were found
    return NextResponse.json({
      success: true,
      healthScores: {},
      message: 'No sender accounts found'
    })

  } catch (error) {
    console.error('❌ Error in health score calculation:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Update health scores for specific senders
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { senderIds, forceRefresh = false } = body

    if (!Array.isArray(senderIds) || senderIds.length === 0) {
      return NextResponse.json({ success: false, error: 'senderIds array is required' }, { status: 400 })
    }

    // Call GET method to recalculate scores
    const url = new URL(request.url)
    url.searchParams.set('senderIds', senderIds.join(','))
    
    const getRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers
    })

    const response = await GET(getRequest)
    return response

  } catch (error) {
    console.error('Error in health score update:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}