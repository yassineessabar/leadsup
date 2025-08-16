import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendGridAPI } from '@/lib/sendgrid-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const userId = searchParams.get('user_id') || 'd155d4c2-2f06-45b7-9c90-905e3648e8df' // Default user

    console.log('🔍 Fetching account-level SendGrid analytics...')
    console.log(`📅 Date range: ${startDate} to ${endDate}`)

    // Strategy: Get account-level metrics through multiple sources
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

    // Method 1: Aggregate from our database (webhook data)
    try {
      console.log('📊 Method 1: Aggregating from database...')
      
      const { data: dbMetrics, error } = await supabase.rpc('get_sendgrid_user_metrics', {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate
      })

      if (!error && dbMetrics && dbMetrics.length > 0) {
        const metrics = dbMetrics[0]
        accountMetrics = {
          emailsSent: metrics.emails_sent || 0,
          emailsDelivered: metrics.emails_delivered || 0,
          emailsBounced: metrics.bounces || 0,
          emailsBlocked: metrics.blocks || 0,
          uniqueOpens: metrics.unique_opens || 0,
          totalOpens: metrics.total_opens || 0,
          uniqueClicks: metrics.unique_clicks || 0,
          totalClicks: metrics.total_clicks || 0,
          unsubscribes: metrics.unsubscribes || 0,
          spamReports: metrics.spam_reports || 0,
          deliveryRate: metrics.delivery_rate || 0,
          bounceRate: metrics.bounce_rate || 0,
          openRate: metrics.open_rate || 0,
          clickRate: metrics.click_rate || 0,
          unsubscribeRate: metrics.unsubscribe_rate || 0
        }
        
        console.log('✅ Database metrics found:', accountMetrics)
        
        // If we have good database data, return it
        if (accountMetrics.emailsSent > 0) {
          return NextResponse.json({
            success: true,
            data: {
              metrics: accountMetrics,
              source: 'database_aggregation',
              period: `${startDate} to ${endDate}`
            }
          })
        }
      }
    } catch (dbError) {
      console.warn('⚠️ Database aggregation failed:', dbError)
    }

    // Method 2: Use the exact same logic as campaign sync that works
    try {
      console.log('📡 Method 2: Using SendGrid sync logic...')
      
      // Call the same sync logic that works for campaigns
      const syncResult = await sendGridAPI.syncCampaignData('account-level', userId)
      
      if (syncResult) {
        const rates = sendGridAPI.calculateRates(syncResult.stats)
        
        accountMetrics = {
          emailsSent: rates.emailsSent,
          emailsDelivered: rates.emailsDelivered,
          emailsBounced: rates.bounces,
          emailsBlocked: rates.blocks,
          uniqueOpens: rates.uniqueOpens,
          totalOpens: rates.totalOpens,
          uniqueClicks: rates.uniqueClicks,
          totalClicks: rates.totalClicks,
          unsubscribes: rates.unsubscribes,
          spamReports: rates.spamReports,
          deliveryRate: rates.deliveryRate,
          bounceRate: rates.bounceRate,
          openRate: rates.openRate,
          clickRate: rates.clickRate,
          unsubscribeRate: rates.unsubscribeRate
        }
        
        console.log('✅ Account-level metrics (same as campaign sync):', accountMetrics)
        
        return NextResponse.json({
          success: true,
          data: {
            metrics: accountMetrics,
            source: 'sendgrid_sync_logic',
            period: 'Recent activity (same as campaign sync)',
            raw_stats: syncResult.stats
          }
        })
      }
    } catch (apiError) {
      console.warn('⚠️ SendGrid API failed:', apiError)
    }

    // Method 3: Get recent campaign aggregation as fallback
    try {
      console.log('📊 Method 3: Aggregating recent campaigns...')
      
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', userId)
        .limit(10)

      if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map(c => c.id)
        
        const { data: aggregated } = await supabase
          .from('campaign_metrics')
          .select('*')
          .in('campaign_id', campaignIds)
          .gte('date', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

        if (aggregated && aggregated.length > 0) {
          // Sum up all campaign metrics
          const totals = aggregated.reduce((acc, curr) => ({
            emails_sent: (acc.emails_sent || 0) + (curr.emails_sent || 0),
            emails_delivered: (acc.emails_delivered || 0) + (curr.emails_delivered || 0),
            bounces: (acc.bounces || 0) + (curr.bounces || 0),
            blocks: (acc.blocks || 0) + (curr.blocks || 0),
            unique_opens: (acc.unique_opens || 0) + (curr.unique_opens || 0),
            total_opens: (acc.total_opens || 0) + (curr.total_opens || 0),
            unique_clicks: (acc.unique_clicks || 0) + (curr.unique_clicks || 0),
            total_clicks: (acc.total_clicks || 0) + (curr.total_clicks || 0),
            unsubscribes: (acc.unsubscribes || 0) + (curr.unsubscribes || 0),
            spam_reports: (acc.spam_reports || 0) + (curr.spam_reports || 0)
          }), {})

          accountMetrics = {
            emailsSent: totals.emails_sent || 0,
            emailsDelivered: totals.emails_delivered || 0,
            emailsBounced: totals.bounces || 0,
            emailsBlocked: totals.blocks || 0,
            uniqueOpens: totals.unique_opens || 0,
            totalOpens: totals.total_opens || 0,
            uniqueClicks: totals.unique_clicks || 0,
            totalClicks: totals.total_clicks || 0,
            unsubscribes: totals.unsubscribes || 0,
            spamReports: totals.spam_reports || 0,
            deliveryRate: totals.emails_sent > 0 ? Math.round((totals.emails_delivered / totals.emails_sent) * 100) : 0,
            bounceRate: totals.emails_sent > 0 ? Math.round((totals.bounces / totals.emails_sent) * 100) : 0,
            openRate: totals.emails_delivered > 0 ? Math.round((totals.unique_opens / totals.emails_delivered) * 100) : 0,
            clickRate: totals.emails_delivered > 0 ? Math.round((totals.unique_clicks / totals.emails_delivered) * 100) : 0,
            unsubscribeRate: totals.emails_delivered > 0 ? Math.round((totals.unsubscribes / totals.emails_delivered) * 100) : 0
          }
          
          console.log('✅ Campaign aggregation metrics:', accountMetrics)
          
          return NextResponse.json({
            success: true,
            data: {
              metrics: accountMetrics,
              source: 'campaign_aggregation',
              period: `${startDate} to ${endDate}`,
              campaigns_count: campaigns.length
            }
          })
        }
      }
    } catch (campaignError) {
      console.warn('⚠️ Campaign aggregation failed:', campaignError)
    }

    // If all methods fail, return empty metrics
    console.log('⚠️ All methods failed, returning empty metrics')
    
    return NextResponse.json({
      success: true,
      data: {
        metrics: accountMetrics,
        source: 'no_data',
        period: `${startDate} to ${endDate}`,
        message: 'No analytics data available for this period'
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