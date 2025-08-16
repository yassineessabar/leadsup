// SendGrid Email Tracking Service
// Handles real-time email event processing for health score calculation

import { supabaseServer } from '@/lib/supabase'

export interface RealSenderStats {
  totalSent: number
  totalDelivered: number
  totalBounced: number
  totalBlocked: number
  totalDeferred: number
  uniqueOpens: number
  totalOpens: number
  uniqueClicks: number
  totalClicks: number
  uniqueReplies: number
  unsubscribes: number
  spamReports: number
  warmupDays: number
  warmupStatus: string
  accountAge: number
  sendingDaysActive: number
  avgDailyVolume: number
  recentSent: number // Last 7 days
}

export interface HealthMetrics {
  warmupScore: number
  deliverabilityScore: number
  engagementScore: number
  volumeScore: number
  reputationScore: number
}

// Fetch real sender stats from webhook data
export async function getRealSenderStats(
  userId: string, 
  senderEmail: string, 
  periodDays: number = 30
): Promise<RealSenderStats> {
  try {
    console.log(`📊 Fetching real stats for sender: ${senderEmail} (${periodDays} days)`)

    // Get account age from sender_accounts table
    const { data: senderAccount, error: accountError } = await supabaseServer
      .from('sender_accounts')
      .select('created_at, email')
      .eq('email', senderEmail)
      .eq('user_id', userId)
      .single()

    let accountAge = 0
    let warmupStatus = 'unknown'
    
    if (!accountError && senderAccount) {
      const createdAt = new Date(senderAccount.created_at)
      accountAge = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      
      // Determine warmup status based on age and activity
      if (accountAge >= 30) {
        warmupStatus = 'completed'
      } else if (accountAge >= 7) {
        warmupStatus = 'warming_up'
      } else {
        warmupStatus = 'inactive'
      }
    }

    // Check if sender_summary_metrics table exists and has data
    try {
      const { data: summaryMetrics, error: summaryError } = await supabaseServer
        .from('sender_summary_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('sender_email', senderEmail)
        .eq('period_days', periodDays)
        .single()

      if (!summaryError && summaryMetrics) {
        console.log('✅ Using cached summary metrics')
        return {
          totalSent: summaryMetrics.emails_sent || 0,
          totalDelivered: summaryMetrics.emails_delivered || 0,
          totalBounced: summaryMetrics.emails_bounced || 0,
          totalBlocked: summaryMetrics.emails_blocked || 0,
          totalDeferred: 0, // Not stored in summary
          uniqueOpens: summaryMetrics.unique_opens || 0,
          totalOpens: summaryMetrics.total_opens || 0,
          uniqueClicks: summaryMetrics.unique_clicks || 0,
          totalClicks: summaryMetrics.total_clicks || 0,
          uniqueReplies: summaryMetrics.unique_replies || 0,
          unsubscribes: summaryMetrics.unsubscribes || 0,
          spamReports: summaryMetrics.spam_reports || 0,
          warmupDays: Math.min(30, accountAge),
          warmupStatus: summaryMetrics.warmup_status || warmupStatus,
          accountAge: summaryMetrics.account_age_days || accountAge,
          sendingDaysActive: summaryMetrics.sending_days_active || 0,
          avgDailyVolume: parseFloat(summaryMetrics.avg_daily_volume || '0'),
          recentSent: summaryMetrics.period_days === 7 ? summaryMetrics.emails_sent : 0
        }
      }
    } catch (summaryError) {
      console.log('⚠️ sender_summary_metrics table not available, continuing with alternative methods')
    }

    // Try to get aggregated metrics from sender_metrics table (daily aggregations)
    console.log('📊 Calculating stats from raw events...')

    try {
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - periodDays)

      const { data: dailyMetrics, error: metricsError } = await supabaseServer
        .from('sender_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('sender_email', senderEmail)
        .gte('date', fromDate.toISOString().split('T')[0])

      if (metricsError) {
        if (metricsError.code === 'PGRST205') {
          console.log('⚠️ sender_metrics table not found - using SendGrid events directly')
          throw new Error('Table not found, fallback to events')
        } else {
          console.error('❌ Error fetching daily metrics:', metricsError)
          throw metricsError
        }
      }

      if (!dailyMetrics || dailyMetrics.length === 0) {
        console.log('⚠️ No metrics found in sender_metrics, trying SendGrid events...')
        throw new Error('No metrics data, fallback to events')
      }

      // Process daily metrics if available
      const aggregated = dailyMetrics.reduce((acc, day) => ({
        totalSent: acc.totalSent + (day.emails_sent || 0),
        totalDelivered: acc.totalDelivered + (day.emails_delivered || 0),
        totalBounced: acc.totalBounced + (day.emails_bounced || 0),
        totalBlocked: acc.totalBlocked + (day.emails_blocked || 0),
        totalDeferred: acc.totalDeferred + (day.emails_deferred || 0),
        uniqueOpens: acc.uniqueOpens + (day.unique_opens || 0),
        totalOpens: acc.totalOpens + (day.total_opens || 0),
        uniqueClicks: acc.uniqueClicks + (day.unique_clicks || 0),
        totalClicks: acc.totalClicks + (day.total_clicks || 0),
        unsubscribes: acc.unsubscribes + (day.unsubscribes || 0),
        spamReports: acc.spamReports + (day.spam_reports || 0),
        sendingDaysActive: acc.sendingDaysActive + (day.emails_sent > 0 ? 1 : 0)
      }), {
        totalSent: 0,
        totalDelivered: 0,
        totalBounced: 0,
        totalBlocked: 0,
        totalDeferred: 0,
        uniqueOpens: 0,
        totalOpens: 0,
        uniqueClicks: 0,
        totalClicks: 0,
        unsubscribes: 0,
        spamReports: 0,
        sendingDaysActive: 0
      })

      // Get recent activity (last 7 days)
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 7)
      
      const recentMetrics = dailyMetrics.filter(day => 
        new Date(day.date) >= recentDate
      )
      
      const recentSent = recentMetrics.reduce((sum, day) => 
        sum + (day.emails_sent || 0), 0
      )

      // Calculate average daily volume
      const avgDailyVolume = aggregated.sendingDaysActive > 0 
        ? aggregated.totalSent / aggregated.sendingDaysActive 
        : 0

      console.log('✅ Calculated real stats from sender_metrics:', {
        totalSent: aggregated.totalSent,
        totalDelivered: aggregated.totalDelivered,
        accountAge,
        sendingDaysActive: aggregated.sendingDaysActive
      })

      return {
        ...aggregated,
        uniqueReplies: 0, // TODO: Implement reply tracking
        warmupDays: Math.min(30, accountAge),
        warmupStatus,
        accountAge,
        avgDailyVolume,
        recentSent
      }

    } catch (metricsTableError) {
      console.log('📊 sender_metrics table not available, trying SendGrid events directly...')
    }

    // Try to get data directly from sendgrid_events table
    try {
      console.log('📧 Attempting to calculate stats from raw SendGrid events...')
      
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - periodDays)

      const { data: rawEvents, error: eventsError } = await supabaseServer
        .from('sendgrid_events')
        .select('event_type, timestamp, email, event_data')
        .eq('user_id', userId)
        .gte('timestamp', fromDate.toISOString())
        .order('timestamp', { ascending: true })

      if (!eventsError && rawEvents && rawEvents.length > 0) {
        console.log(`📊 Found ${rawEvents.length} raw SendGrid events, processing...`)
        
        // Filter events for this sender
        const senderEvents = rawEvents.filter(event => 
          event.event_data?.sender_email === senderEmail
        )

        if (senderEvents.length > 0) {
          console.log(`📧 Processing ${senderEvents.length} events for ${senderEmail}`)
          
          // Aggregate events into stats
          const eventStats = senderEvents.reduce((acc, event) => {
            switch (event.event_type) {
              case 'processed':
                acc.totalSent++
                break
              case 'delivered':
                acc.totalDelivered++
                break
              case 'bounce':
                acc.totalBounced++
                break
              case 'blocked':
                acc.totalBlocked++
                break
              case 'deferred':
                acc.totalDeferred++
                break
              case 'open':
                acc.totalOpens++
                // Count unique opens by email
                if (!acc.openedEmails.has(event.email)) {
                  acc.uniqueOpens++
                  acc.openedEmails.add(event.email)
                }
                break
              case 'click':
                acc.totalClicks++
                // Count unique clicks by email
                if (!acc.clickedEmails.has(event.email)) {
                  acc.uniqueClicks++
                  acc.clickedEmails.add(event.email)
                }
                break
              case 'unsubscribe':
              case 'group_unsubscribe':
                acc.unsubscribes++
                break
              case 'spam_report':
                acc.spamReports++
                break
            }
            return acc
          }, {
            totalSent: 0,
            totalDelivered: 0,
            totalBounced: 0,
            totalBlocked: 0,
            totalDeferred: 0,
            uniqueOpens: 0,
            totalOpens: 0,
            uniqueClicks: 0,
            totalClicks: 0,
            unsubscribes: 0,
            spamReports: 0,
            openedEmails: new Set(),
            clickedEmails: new Set()
          })

          // Calculate sending days active
          const eventDates = new Set(
            senderEvents
              .filter(e => e.event_type === 'processed')
              .map(e => e.timestamp.split('T')[0])
          )
          const sendingDaysActive = eventDates.size

          // Calculate recent activity (last 7 days)
          const recentDate = new Date()
          recentDate.setDate(recentDate.getDate() - 7)
          const recentEvents = senderEvents.filter(e => 
            new Date(e.timestamp) >= recentDate && e.event_type === 'processed'
          )
          const recentSent = recentEvents.length

          // Calculate average daily volume
          const avgDailyVolume = sendingDaysActive > 0 
            ? eventStats.totalSent / sendingDaysActive 
            : 0

          console.log('✅ Calculated stats from raw SendGrid events:', {
            totalSent: eventStats.totalSent,
            totalDelivered: eventStats.totalDelivered,
            uniqueOpens: eventStats.uniqueOpens,
            sendingDaysActive,
            accountAge
          })

          return {
            totalSent: eventStats.totalSent,
            totalDelivered: eventStats.totalDelivered,
            totalBounced: eventStats.totalBounced,
            totalBlocked: eventStats.totalBlocked,
            totalDeferred: eventStats.totalDeferred,
            uniqueOpens: eventStats.uniqueOpens,
            totalOpens: eventStats.totalOpens,
            uniqueClicks: eventStats.uniqueClicks,
            totalClicks: eventStats.totalClicks,
            uniqueReplies: 0, // TODO: Implement reply tracking
            unsubscribes: eventStats.unsubscribes,
            spamReports: eventStats.spamReports,
            warmupDays: Math.min(30, accountAge),
            warmupStatus,
            accountAge,
            sendingDaysActive,
            avgDailyVolume,
            recentSent
          }
        } else {
          console.log(`⚠️ No events found for sender ${senderEmail} in SendGrid events`)
        }
      } else {
        console.log('⚠️ No SendGrid events found or sendgrid_events table not available')
      }
    } catch (eventsError) {
      console.log('⚠️ Could not fetch from sendgrid_events table:', eventsError.message)
    }

    // Final fallback to simulated stats
    console.log('⚠️ No real data available, returning fallback stats based on account age')
    return createFallbackStats(accountAge, warmupStatus)

  } catch (error) {
    console.error('❌ Error getting real sender stats:', error)
    return createFallbackStats(0, 'unknown')
  }
}

// Create fallback stats when no real data is available
function createFallbackStats(accountAge: number, warmupStatus: string): RealSenderStats {
  return {
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalBlocked: 0,
    totalDeferred: 0,
    uniqueOpens: 0,
    totalOpens: 0,
    uniqueClicks: 0,
    totalClicks: 0,
    uniqueReplies: 0,
    unsubscribes: 0,
    spamReports: 0,
    warmupDays: 0,
    warmupStatus,
    accountAge,
    sendingDaysActive: 0,
    avgDailyVolume: 0,
    recentSent: 0
  }
}

// Calculate health score from real stats
export function calculateRealHealthScore(stats: RealSenderStats): { score: number; breakdown: HealthMetrics } {
  const breakdown: HealthMetrics = {
    warmupScore: 0,
    deliverabilityScore: 0,
    engagementScore: 0,
    volumeScore: 0,
    reputationScore: 0
  }

  // 1. Warmup Score (25% weight) - Based on warmup status and activity
  if (stats.warmupStatus === 'completed') {
    breakdown.warmupScore = 100
  } else if (stats.warmupStatus === 'active' || stats.warmupStatus === 'warming_up') {
    // Score increases with warmup days and activity
    const ageScore = Math.min(100, (stats.warmupDays / 30) * 100)
    const activityScore = stats.sendingDaysActive > 0 ? Math.min(100, (stats.sendingDaysActive / 30) * 100) : 0
    breakdown.warmupScore = Math.round((ageScore + activityScore) / 2)
  } else if (stats.warmupStatus === 'paused') {
    breakdown.warmupScore = 60
  } else if (stats.warmupStatus === 'error') {
    breakdown.warmupScore = 20
  } else {
    breakdown.warmupScore = 50 // inactive/unknown
  }

  // 2. Deliverability Score (30% weight) - Based on real bounce/block rates
  if (stats.totalSent > 0) {
    const bounceRate = (stats.totalBounced / stats.totalSent) * 100
    const blockRate = (stats.totalBlocked / stats.totalSent) * 100
    const combinedFailureRate = bounceRate + blockRate

    if (combinedFailureRate < 1) {
      breakdown.deliverabilityScore = 100
    } else if (combinedFailureRate < 2) {
      breakdown.deliverabilityScore = 90
    } else if (combinedFailureRate < 5) {
      breakdown.deliverabilityScore = 75
    } else if (combinedFailureRate < 10) {
      breakdown.deliverabilityScore = 50
    } else {
      breakdown.deliverabilityScore = 25
    }

    // Bonus for high delivery rate
    const deliveryRate = (stats.totalDelivered / stats.totalSent) * 100
    if (deliveryRate > 95) {
      breakdown.deliverabilityScore = Math.min(100, breakdown.deliverabilityScore + 10)
    }
  } else {
    breakdown.deliverabilityScore = 75 // No data, neutral score
  }

  // 3. Engagement Score (25% weight) - Based on real open/click rates
  if (stats.totalDelivered > 0) {
    const openRate = (stats.uniqueOpens / stats.totalDelivered) * 100
    const clickRate = (stats.uniqueClicks / stats.totalDelivered) * 100
    const replyRate = (stats.uniqueReplies / stats.totalDelivered) * 100
    
    let engagementTotal = 0
    
    // Open rate scoring (40% of engagement)
    if (openRate > 25) engagementTotal += 40
    else if (openRate > 20) engagementTotal += 32
    else if (openRate > 15) engagementTotal += 24
    else if (openRate > 10) engagementTotal += 16
    else engagementTotal += 8
    
    // Click rate scoring (35% of engagement)
    if (clickRate > 5) engagementTotal += 35
    else if (clickRate > 3) engagementTotal += 28
    else if (clickRate > 2) engagementTotal += 21
    else if (clickRate > 1) engagementTotal += 14
    else engagementTotal += 7
    
    // Reply rate scoring (25% of engagement)
    if (replyRate > 3) engagementTotal += 25
    else if (replyRate > 2) engagementTotal += 20
    else if (replyRate > 1) engagementTotal += 15
    else if (replyRate > 0.5) engagementTotal += 10
    else engagementTotal += 5
    
    breakdown.engagementScore = engagementTotal
  } else {
    breakdown.engagementScore = 50 // No data, neutral score
  }

  // 4. Volume Score (10% weight) - Based on sending consistency and volume
  if (stats.recentSent === 0 && stats.totalSent === 0) {
    breakdown.volumeScore = 30 // Completely inactive
  } else if (stats.sendingDaysActive === 0) {
    breakdown.volumeScore = 40 // No recent activity
  } else {
    const consistency = (stats.sendingDaysActive / 30) * 100 // Consistency over 30 days
    const volumeScore = Math.min(100, stats.avgDailyVolume * 2) // Up to 50 emails/day = 100 score
    
    breakdown.volumeScore = Math.round((consistency * 0.6) + (volumeScore * 0.4))
  }

  // 5. Reputation Score (10% weight) - Based on account age and spam/unsubscribe rates
  let reputationScore = 0
  
  // Age component (70% of reputation)
  if (stats.accountAge > 180) { // 6+ months
    reputationScore += 70
  } else if (stats.accountAge > 90) { // 3+ months
    reputationScore += 60
  } else if (stats.accountAge > 30) { // 1+ month
    reputationScore += 50
  } else if (stats.accountAge > 7) { // 1+ week
    reputationScore += 40
  } else {
    reputationScore += 30 // New account
  }
  
  // Reputation penalties (30% of reputation)
  if (stats.totalDelivered > 0) {
    const spamRate = (stats.spamReports / stats.totalDelivered) * 100
    const unsubRate = (stats.unsubscribes / stats.totalDelivered) * 100
    
    let reputationPenalty = 0
    if (spamRate > 0.5) reputationPenalty += 15
    else if (spamRate > 0.1) reputationPenalty += 10
    else if (spamRate > 0.05) reputationPenalty += 5
    
    if (unsubRate > 2) reputationPenalty += 15
    else if (unsubRate > 1) reputationPenalty += 10
    else if (unsubRate > 0.5) reputationPenalty += 5
    
    reputationScore = Math.max(20, reputationScore + 30 - reputationPenalty)
  } else {
    reputationScore += 30 // No data, add full reputation bonus
  }
  
  breakdown.reputationScore = reputationScore

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

// Update sender summary metrics
export async function updateSenderSummaryMetrics(
  userId: string, 
  senderEmail: string, 
  periodDays: number = 30
): Promise<void> {
  try {
    console.log(`🔄 Updating summary metrics for ${senderEmail} (${periodDays} days)`)
    
    // Use the Postgres function to calculate and update metrics
    const { error } = await supabaseServer
      .rpc('calculate_sender_summary_metrics', {
        p_user_id: userId,
        p_sender_email: senderEmail,
        p_period_days: periodDays
      })

    if (error) {
      console.error('❌ Error updating sender summary metrics:', error)
      throw error
    }

    console.log('✅ Sender summary metrics updated successfully')
  } catch (error) {
    console.error('❌ Error in updateSenderSummaryMetrics:', error)
    throw error
  }
}

// Calculate health scores for multiple senders using real data
export async function calculateHealthScoresFromRealData(
  userId: string, 
  senderIds: string[]
): Promise<Record<string, { score: number; breakdown: HealthMetrics; lastUpdated: string }>> {
  try {
    console.log(`📊 Calculating real health scores for ${senderIds.length} senders`)

    // Get sender emails from sender_accounts
    const { data: senderAccounts, error: accountsError } = await supabaseServer
      .from('sender_accounts')
      .select('id, email')
      .in('id', senderIds)
      .eq('user_id', userId)

    if (accountsError) {
      console.error('❌ Error fetching sender accounts:', accountsError)
      return {}
    }

    const healthScores: Record<string, { score: number; breakdown: HealthMetrics; lastUpdated: string }> = {}

    // Calculate health score for each sender
    for (const sender of senderAccounts) {
      try {
        // Get real stats for this sender
        const stats = await getRealSenderStats(userId, sender.email, 30)
        
        // Calculate health score from real data
        const { score, breakdown } = calculateRealHealthScore(stats)
        
        healthScores[sender.id] = {
          score,
          breakdown,
          lastUpdated: new Date().toISOString()
        }

        // Update the sender_accounts table with the new score
        await supabaseServer
          .from('sender_accounts')
          .update({ 
            health_score: score,
            updated_at: new Date().toISOString()
          })
          .eq('id', sender.id)

        console.log(`✅ Calculated real health score for ${sender.email}: ${score}%`)

      } catch (error) {
        console.error(`❌ Error calculating health score for sender ${sender.id}:`, error)
        // Use fallback score
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

    return healthScores

  } catch (error) {
    console.error('❌ Error calculating health scores from real data:', error)
    return {}
  }
}