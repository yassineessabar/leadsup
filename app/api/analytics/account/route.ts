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
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    console.log('🔍 Fetching account-level SendGrid analytics...')
    console.log(`📅 Date range: ${startDate} to ${endDate}`)
    console.log(`👤 User ID: ${userId}`)

    // First, verify the user has actual campaigns and email accounts
    const { data: userCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', userId)

    if (campaignsError || !userCampaigns || userCampaigns.length === 0) {
      console.log('⚠️ No campaigns found for user - returning empty metrics')
      return NextResponse.json({
        success: true,
        data: {
          metrics: {
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
          },
          source: 'no_campaigns',
          period: `${startDate} to ${endDate}`,
          message: 'No campaigns found for this user'
        }
      })
    }

    // Strategy: Only get real metrics from webhook events or database
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

    // Method 1: Aggregate from our database (webhook data) - DISABLED 
    // This RPC function might be returning fake data, so we'll skip it
    console.log('📊 Skipping database RPC function to avoid fake data')
    
    // Skip the problematic database RPC call that might return fake metrics

    // Method 2: Use direct webhook data aggregation from sendgrid_events
    try {
      console.log('📡 Method 2: Using webhook data aggregation...')
      
      // Query sendgrid_events table directly for account metrics
      // STRICT: Exclude fake/demo/test events
      const { data: webhookEvents, error: webhookError } = await supabase
        .from('sendgrid_events')
        .select('event_type, timestamp, email, sg_event_id')
        .eq('user_id', userId)
        .gte('timestamp', startDate + 'T00:00:00Z')
        .lte('timestamp', endDate + 'T23:59:59Z')
        // Exclude demo/test/fake events
        .not('email', 'like', '%example.com%')
        .not('email', 'like', '%demo%')
        .not('email', 'like', '%test%')
        .not('sg_event_id', 'like', '%demo%')
        .not('sg_event_id', 'like', '%fix%')
        .not('sg_event_id', 'like', '%fake%')

      console.log(`🔍 Webhook events query result:`, { 
        error: webhookError, 
        eventCount: webhookEvents?.length || 0,
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

        // STRICT CHECK: Only return metrics if we have real email sends AND deliveries
        if (accountMetrics.emailsSent > 0 && accountMetrics.emailsDelivered > 0) {
          console.log('✅ Real email activity detected, returning metrics')
          return NextResponse.json({
            success: true,
            data: {
              metrics: accountMetrics,
              source: 'webhook_aggregation',
              period: `${startDate} to ${endDate}`,
              eventCount: webhookEvents.length,
              debug: 'Real webhook events found'
            }
          })
        } else {
          console.log('⚠️ No real email sends detected, ignoring webhook events')
        }
      } else {
        console.log('⚠️ No webhook events found for this period')
      }
    } catch (webhookAggError) {
      console.warn('⚠️ Webhook aggregation failed:', webhookAggError)
    }

    // Skip problematic SendGrid API fallbacks that return fake data
    console.log('⚠️ Skipping SendGrid API fallbacks to ensure data accuracy')

    // If no webhook data found, return empty metrics (no fake fallbacks)
    console.log('⚠️ No real email activity found, returning empty metrics')
    
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