import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
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
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    let userId = await getUserIdFromSession()

    // Debug: if no session, use hardcoded user for testing
    if (!userId) {
      console.log('⚠️ No session found, using hardcoded user for debugging')
      userId = '37a70a5f-1f9a-4d2e-a76f-f303a85bc535'
    } else {
      console.log('✅ Session found, user:', userId)
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    console.log('🔍 Fetching account-level SendGrid analytics...')
    console.log(`📅 Date range: ${startDate} to ${endDate}`)
    console.log(`👤 User ID: ${userId}`)
    console.log('🔑 SendGrid API Key available:', !!process.env.SENDGRID_API_KEY)

    // Skip campaign verification - we want to show SendGrid data regardless
    console.log('📊 Attempting to fetch real SendGrid metrics...')

    // Method 1: Local email tracking analytics (PRIORITY)
    try {
      console.log('📡 Method 1: Using local email tracking analytics...')
      
      const { getEmailTrackingMetrics } = await import('@/lib/email-tracking-analytics')
      
      const trackingMetrics = await getEmailTrackingMetrics(userId, startDate, endDate)
      
      if (trackingMetrics && trackingMetrics.emailsSent > 0) {
        console.log('✅ SUCCESS! Local email tracking metrics found:', trackingMetrics)
        
        return NextResponse.json({
          success: true,
          data: {
            metrics: trackingMetrics,
            source: 'local_email_tracking',
            period: `${startDate} to ${endDate}`,
            debug: `Local email tracking data for user ${userId}`
          }
        })
      } else if (trackingMetrics) {
        console.log('⚠️ User has no email activity in local tracking')
        
        return NextResponse.json({
          success: true,
          data: {
            metrics: trackingMetrics,
            source: 'local_email_tracking',
            period: `${startDate} to ${endDate}`,
            debug: `No email activity for user ${userId} in this period`
          }
        })
      } else {
        console.log('⚠️ Could not get local tracking metrics, trying fallback methods')
      }
    } catch (trackingAnalyticsError) {
      console.error('❌ Local email tracking analytics failed:', trackingAnalyticsError)
    }

    // Method 2: User-specific analytics with SendGrid events (FALLBACK)
    try {
      console.log('📡 Method 2: Calculating user-specific metrics with SendGrid events...')
      
      const { UserSpecificAnalytics } = await import('@/lib/user-specific-analytics')
      const { fetchSendGridEventsForUser } = await import('@/lib/sendgrid-event-fetcher')
      
      const userMetrics = await UserSpecificAnalytics.getUserMetrics(userId, startDate, endDate)
      
      if (userMetrics && userMetrics.emailsSent > 0) {
        // Enhance with real SendGrid open/click events
        console.log('📊 Fetching real SendGrid open/click events...')
        const eventMetrics = await fetchSendGridEventsForUser(userId, startDate, endDate)
        
        if (eventMetrics) {
          // Merge user metrics with SendGrid event metrics
          const enhancedMetrics = {
            ...userMetrics,
            openRate: eventMetrics.openRate,
            clickRate: eventMetrics.clickRate,
            totalOpens: eventMetrics.totalOpens,
            uniqueOpens: eventMetrics.uniqueOpens,
            totalClicks: eventMetrics.totalClicks,
            uniqueClicks: eventMetrics.uniqueClicks
          }
          
          console.log('✅ SUCCESS! Enhanced metrics with real SendGrid events:', enhancedMetrics)
          
          return NextResponse.json({
            success: true,
            data: {
              metrics: enhancedMetrics,
              source: 'user_specific_analytics_with_sendgrid_events',
              period: `${startDate} to ${endDate}`,
              debug: `Real user-specific data with SendGrid events for user ${userId}`
            }
          })
        } else {
          console.log('⚠️ Could not fetch SendGrid events, using basic metrics')
          
          return NextResponse.json({
            success: true,
            data: {
              metrics: userMetrics,
              source: 'user_specific_analytics_only',
              period: `${startDate} to ${endDate}`,
              debug: `Real user-specific data (no SendGrid events) for user ${userId}`
            }
          })
        }
      } else if (userMetrics) {
        console.log('⚠️ User has no email activity in this period')
        
        return NextResponse.json({
          success: true,
          data: {
            metrics: userMetrics,
            source: 'user_specific_analytics',
            period: `${startDate} to ${endDate}`,
            debug: `No email activity for user ${userId} in this period`
          }
        })
      } else {
        console.log('⚠️ Could not calculate user metrics')
      }
    } catch (userAnalyticsError) {
      console.error('❌ User-specific analytics failed:', userAnalyticsError)
    }

    // Fallback: Initialize empty metrics for other methods
    let accountMetrics = {
      emailsSent: 0,
      emailsDelivered: 0,
      emailsBounced: 0,
      emailsBlocked: 0,
      uniqueOpens: 0,
      totalOpens: 0,
      uniqueClicks: 0,
      totalClicks: 0,
      unsubscribes: 0,
      spamReports: 0,
      deliveryRate: 0,
      bounceRate: 0,
      openRate: 0,
      clickRate: 0,
      unsubscribeRate: 0
    }

    // Method 3: Aggregate metrics across all campaigns using same logic as campaign analytics
    try {
      console.log('📡 Method 3: Aggregating metrics across all user campaigns...')
      
      // Get all campaigns for this user
      const { data: userCampaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', userId)
      
      if (!userCampaigns || userCampaigns.length === 0) {
        console.log('⚠️ No campaigns found for user')
        return NextResponse.json({
          success: true,
          data: {
            metrics: accountMetrics,
            source: 'no_campaigns',
            period: `${startDate} to ${endDate}`,
            debug: 'No campaigns found for user'
          }
        })
      }
      
      console.log(`📊 Found ${userCampaigns.length} campaigns for user ${userId}`)
      
      // Use the same campaign analytics logic for all campaigns
      const { getCampaignEmailTrackingMetrics } = await import('@/lib/campaign-email-tracking-analytics')
      
      let aggregatedMetrics = {
        emailsSent: 0,
        emailsDelivered: 0,
        emailsBounced: 0,
        emailsBlocked: 0,
        uniqueOpens: 0,
        totalOpens: 0,
        uniqueClicks: 0,
        totalClicks: 0,
        unsubscribes: 0,
        spamReports: 0,
        deliveryRate: 0,
        bounceRate: 0,
        openRate: 0,
        clickRate: 0,
        unsubscribeRate: 0
      }
      
      // Aggregate metrics from all campaigns
      for (const campaign of userCampaigns) {
        const campaignMetrics = await getCampaignEmailTrackingMetrics(campaign.id, startDate, endDate)
        if (campaignMetrics) {
          aggregatedMetrics.emailsSent += campaignMetrics.emailsSent
          aggregatedMetrics.emailsDelivered += campaignMetrics.emailsDelivered
          aggregatedMetrics.emailsBounced += campaignMetrics.emailsBounced
          aggregatedMetrics.emailsBlocked += campaignMetrics.emailsBlocked
          aggregatedMetrics.uniqueOpens += campaignMetrics.uniqueOpens
          aggregatedMetrics.totalOpens += campaignMetrics.totalOpens
          aggregatedMetrics.uniqueClicks += campaignMetrics.uniqueClicks
          aggregatedMetrics.totalClicks += campaignMetrics.totalClicks
          aggregatedMetrics.unsubscribes += campaignMetrics.unsubscribes
          aggregatedMetrics.spamReports += campaignMetrics.spamReports
        }
      }
      
      // Recalculate rates
      aggregatedMetrics.deliveryRate = aggregatedMetrics.emailsSent > 0 
        ? (aggregatedMetrics.emailsDelivered / aggregatedMetrics.emailsSent) * 100 
        : 0
      aggregatedMetrics.bounceRate = aggregatedMetrics.emailsSent > 0 
        ? (aggregatedMetrics.emailsBounced / aggregatedMetrics.emailsSent) * 100 
        : 0
      aggregatedMetrics.openRate = aggregatedMetrics.emailsDelivered > 0 
        ? (aggregatedMetrics.uniqueOpens / aggregatedMetrics.emailsDelivered) * 100 
        : 0
      aggregatedMetrics.clickRate = aggregatedMetrics.emailsDelivered > 0 
        ? (aggregatedMetrics.uniqueClicks / aggregatedMetrics.emailsDelivered) * 100 
        : 0
      
      console.log('✅ Aggregated metrics across all campaigns:', aggregatedMetrics)
      
      if (aggregatedMetrics.emailsSent > 0) {
        return NextResponse.json({
          success: true,
          data: {
            metrics: aggregatedMetrics,
            source: 'campaign_aggregation',
            period: `${startDate} to ${endDate}`,
            campaignCount: userCampaigns.length,
            debug: 'Aggregated from all user campaigns'
          }
        })
      }

      console.log(`🔍 Webhook events query result:`, { 
        error: null, 
        eventCount: 0,
        events: webhookEvents?.slice(0, 3) // Show first 3 events for debugging
      })

      if (!webhookError && webhookEvents && webhookEvents.length > 0) {
        console.log(`📊 Found ${webhookEvents.length} webhook events for aggregation`)
        
        // Aggregate events into metrics
        const eventCounts = webhookEvents.reduce((acc, event) => {
          switch (event.event_type) {
            case 'processed':
              acc.emailsSent++
              break
            case 'delivered':
              acc.emailsDelivered++
              break
            case 'bounce':
              acc.emailsBounced++
              break
            case 'blocked':
              acc.emailsBlocked++
              break
            case 'open':
              acc.totalOpens++
              if (!acc.uniqueEmails.has(event.email)) {
                acc.uniqueOpens++
                acc.uniqueEmails.add(event.email)
              }
              break
            case 'click':
              acc.totalClicks++
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
          emailsSent: 0,
          emailsDelivered: 0,
          emailsBounced: 0,
          emailsBlocked: 0,
          uniqueOpens: 0,
          totalOpens: 0,
          uniqueClicks: 0,
          totalClicks: 0,
          unsubscribes: 0,
          spamReports: 0,
          uniqueEmails: new Set(),
          clickedEmails: new Set()
        })

        // Calculate rates
        const deliveryRate = eventCounts.emailsSent > 0 
          ? (eventCounts.emailsDelivered / eventCounts.emailsSent) * 100 
          : 0
        const bounceRate = eventCounts.emailsSent > 0 
          ? (eventCounts.emailsBounced / eventCounts.emailsSent) * 100 
          : 0
        const openRate = eventCounts.emailsDelivered > 0 
          ? (eventCounts.uniqueOpens / eventCounts.emailsDelivered) * 100 
          : 0
        const clickRate = eventCounts.emailsDelivered > 0 
          ? (eventCounts.uniqueClicks / eventCounts.emailsDelivered) * 100 
          : 0
        const unsubscribeRate = eventCounts.emailsDelivered > 0 
          ? (eventCounts.unsubscribes / eventCounts.emailsDelivered) * 100 
          : 0

        accountMetrics = {
          emailsSent: eventCounts.emailsSent,
          emailsDelivered: eventCounts.emailsDelivered,
          emailsBounced: eventCounts.emailsBounced,
          emailsBlocked: eventCounts.emailsBlocked,
          uniqueOpens: eventCounts.uniqueOpens,
          totalOpens: eventCounts.totalOpens,
          uniqueClicks: eventCounts.uniqueClicks,
          totalClicks: eventCounts.totalClicks,
          unsubscribes: eventCounts.unsubscribes,
          spamReports: eventCounts.spamReports,
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          bounceRate: Math.round(bounceRate * 100) / 100,
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100,
          unsubscribeRate: Math.round(unsubscribeRate * 100) / 100
        }

        console.log('✅ Webhook aggregation successful:', accountMetrics)

        // Return metrics if we have any email activity
        if (accountMetrics.emailsSent > 0 || accountMetrics.emailsDelivered > 0) {
          console.log('✅ Email activity detected, returning metrics:', accountMetrics)
          return NextResponse.json({
            success: true,
            data: {
              metrics: accountMetrics,
              source: 'webhook_aggregation',
              period: `${startDate} to ${endDate}`,
              eventCount: webhookEvents.length,
              debug: 'Webhook events found'
            }
          })
        } else {
          console.log('⚠️ No email activity detected, counts:', accountMetrics)
        }
      } else {
        console.log('⚠️ No webhook events found for this period')
      }
    } catch (webhookAggError) {
      console.warn('⚠️ Webhook aggregation failed:', webhookAggError)
    }

    // All methods failed - SendGrid API should have worked

    // If no real data found anywhere, return empty metrics
    console.log('⚠️ No real email activity found from any source, returning empty metrics')
    
    return NextResponse.json({
      success: true,
      data: {
        metrics: accountMetrics,
        source: 'no_email_activity',
        period: `${startDate} to ${endDate}`,
        message: 'No email activity found for this period'
      }
    })

  } catch (error: any) {
    console.error('❌ Error fetching account analytics:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch account analytics',
      details: error
    }, { 
      status: 500 
    })
  }
}