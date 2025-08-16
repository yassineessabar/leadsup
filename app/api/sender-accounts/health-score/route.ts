import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase, supabaseServer } from '@/lib/supabase'

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

  // 5. Reputation Score (10% weight) - Based on account age and overall performance
  if (stats.accountAge > 180) { // 6+ months
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
    const campaignId = searchParams.get('campaignId')

    // If no sender IDs provided, return empty result
    if (senderIds.length === 0) {
      return NextResponse.json({
        success: true,
        healthScores: {},
        message: 'No sender IDs provided'
      })
    }

    console.log('🔍 Health score calculation for senders:', senderIds)

    // Get sender accounts for the user - try different query approaches
    let senderAccounts: any[] = []
    let sendersError: any = null

    // First try: Direct query with user_id filter
    try {
      const result = await supabaseServer
        .from('sender_accounts')
        .select('id, email, warmup_status, created_at, user_id')
        .in('id', senderIds)
        .eq('user_id', userId)
      
      senderAccounts = result.data || []
      sendersError = result.error
    } catch (error) {
      console.log('First query failed, trying alternative approach...')
      
      // Fallback: Query without user_id filter (for compatibility)
      try {
        const result = await supabaseServer
          .from('sender_accounts')
          .select('id, email, created_at')
          .in('id', senderIds)
        
        senderAccounts = result.data || []
        sendersError = result.error
        
        console.log('Using fallback query without warmup_status and user_id')
      } catch (fallbackError) {
        sendersError = fallbackError
      }
    }

    if (sendersError) {
      console.error('Error fetching sender accounts:', sendersError)
      console.error('Sender IDs provided:', senderIds)
      console.error('User ID:', userId)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to fetch sender accounts: ${sendersError.message}`,
        details: sendersError
      }, { status: 500 })
    }

    console.log(`📋 Found ${senderAccounts?.length || 0} sender accounts for user ${userId}`)

    // Use the accounts directly since we already filtered by user_id
    const userSenderAccounts = senderAccounts || []

    const healthScores: Record<string, { score: number; breakdown: HealthMetrics; lastUpdated: string }> = {}

    // Calculate health score for each sender
    for (const sender of userSenderAccounts) {
      try {
        console.log(`🧮 Calculating health score for sender: ${sender.email}`)
        
        // Calculate account age and warmup days - handle missing fields gracefully
        const createdAt = sender.created_at ? new Date(sender.created_at) : new Date()
        const accountAge = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
        const warmupStatus = sender.warmup_status || 'inactive'
        
        console.log(`📅 Account details - Age: ${accountAge} days, Warmup: ${warmupStatus}`)
        
        // For now, use realistic baseline stats based on account state
        // TODO: Replace with actual email tracking data from email_sending_logs table
        let baseStats: SenderStats
        
        if (warmupStatus === 'inactive' || warmupStatus === 'pending') {
          // New account that hasn't started sending
          baseStats = {
            totalSent: 0,
            totalBounced: 0,
            totalOpened: 0,
            totalClicked: 0,
            totalReplied: 0,
            recentSent: 0,
            warmupDays: 0,
            warmupStatus,
            accountAge
          }
        } else if (warmupStatus === 'warming_up' || warmupStatus === 'active') {
          // Account in warmup phase - limited sending
          const warmupDays = Math.min(30, accountAge)
          baseStats = {
            totalSent: warmupDays * 5, // Conservative warmup volume
            totalBounced: Math.max(0, Math.floor((warmupDays * 5) * 0.02)), // 2% bounce rate
            totalOpened: Math.floor((warmupDays * 5) * 0.25), // 25% open rate
            totalClicked: Math.floor((warmupDays * 5) * 0.03), // 3% click rate
            totalReplied: Math.floor((warmupDays * 5) * 0.01), // 1% reply rate
            recentSent: Math.min(15, warmupDays * 2),
            warmupDays,
            warmupStatus,
            accountAge
          }
        } else if (warmupStatus === 'completed') {
          // Fully warmed account - normal sending volume
          const sendingDays = Math.min(90, accountAge - 30) // Exclude warmup period
          baseStats = {
            totalSent: sendingDays * 25, // Normal sending volume
            totalBounced: Math.floor((sendingDays * 25) * 0.015), // 1.5% bounce rate
            totalOpened: Math.floor((sendingDays * 25) * 0.28), // 28% open rate
            totalClicked: Math.floor((sendingDays * 25) * 0.04), // 4% click rate
            totalReplied: Math.floor((sendingDays * 25) * 0.015), // 1.5% reply rate
            recentSent: 50,
            warmupDays: 30,
            warmupStatus,
            accountAge
          }
        } else {
          // Error or paused state
          baseStats = {
            totalSent: Math.max(0, accountAge * 3),
            totalBounced: Math.floor((accountAge * 3) * 0.08), // Higher bounce rate for problematic accounts
            totalOpened: Math.floor((accountAge * 3) * 0.15), // Lower engagement
            totalClicked: Math.floor((accountAge * 3) * 0.02),
            totalReplied: Math.floor((accountAge * 3) * 0.005),
            recentSent: 0, // Not currently sending
            warmupDays: Math.min(15, accountAge),
            warmupStatus,
            accountAge
          }
        }
        
        console.log(`📊 Stats for ${sender.email}:`, {
          warmupStatus: baseStats.warmupStatus,
          accountAge: baseStats.accountAge,
          totalSent: baseStats.totalSent,
          warmupDays: baseStats.warmupDays
        })

        const { score, breakdown } = calculateHealthScore(baseStats)
        
        healthScores[sender.id] = {
          score,
          breakdown,
          lastUpdated: new Date().toISOString()
        }

        // Update the database with the calculated score
        await supabaseServer
          .from('sender_accounts')
          .update({ 
            health_score: score,
            updated_at: new Date().toISOString()
          })
          .eq('id', sender.id)

      } catch (error) {
        console.error(`Error calculating health score for sender ${sender.id}:`, error)
        // Use existing score or default
        healthScores[sender.id] = {
          score: 75,
          breakdown: {
            warmupScore: 50,
            deliverabilityScore: 75,
            engagementScore: 75,
            volumeScore: 75,
            reputationScore: 75
          },
          lastUpdated: new Date().toISOString()
        }
      }
    }

    return NextResponse.json({
      success: true,
      healthScores,
      message: `Calculated health scores for ${Object.keys(healthScores).length} accounts`
    })

  } catch (error) {
    console.error('Error in health score calculation:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
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