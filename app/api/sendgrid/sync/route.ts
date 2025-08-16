import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendGridAPI } from '@/lib/sendgrid-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { campaignId, userId } = await request.json()

    if (!campaignId || !userId) {
      return NextResponse.json(
        { error: 'campaignId and userId are required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Starting SendGrid sync for campaign: ${campaignId}`)

    // Fetch real data from SendGrid API
    const campaignStats = await sendGridAPI.syncCampaignData(campaignId, userId)

    if (!campaignStats) {
      return NextResponse.json(
        { error: 'No stats found for this campaign in SendGrid' },
        { status: 404 }
      )
    }

    // Calculate rates
    const rates = sendGridAPI.calculateRates(campaignStats.stats)
    
    console.log('📊 SendGrid Stats:', rates)

    // Update or insert campaign metrics in our database
    const today = new Date().toISOString().split('T')[0]
    
    const { data: existingMetric, error: fetchError } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching existing metrics:', fetchError)
      throw fetchError
    }

    const metricsData = {
      user_id: userId,
      campaign_id: campaignId,
      date: today,
      emails_sent: rates.emailsSent,
      emails_delivered: rates.emailsDelivered,
      unique_opens: rates.uniqueOpens,
      unique_clicks: rates.uniqueClicks,
      total_opens: rates.totalOpens,
      total_clicks: rates.totalClicks,
      bounces: rates.bounces,
      spam_reports: rates.spamReports,
      unsubscribes: rates.unsubscribes,
      blocks: rates.blocks,
      delivery_rate: rates.deliveryRate,
      open_rate: rates.openRate,
      click_rate: rates.clickRate,
      bounce_rate: rates.bounceRate,
      unsubscribe_rate: rates.unsubscribeRate,
      updated_at: new Date().toISOString()
    }

    let result
    if (existingMetric) {
      // Update existing record
      const { data, error } = await supabase
        .from('campaign_metrics')
        .update(metricsData)
        .eq('id', existingMetric.id)
        .select()

      if (error) throw error
      result = data?.[0]
      console.log('📝 Updated existing campaign metrics')
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('campaign_metrics')
        .insert(metricsData)
        .select()

      if (error) throw error
      result = data?.[0]
      console.log('✅ Inserted new campaign metrics')
    }

    // Also sync to email_tracking table for individual email status
    console.log('📧 Syncing email tracking data...')
    
    // For now, we'll create aggregate tracking records
    // In a real implementation, you'd fetch individual email events from SendGrid
    const { error: trackingError } = await supabase
      .from('email_tracking')
      .upsert({
        user_id: userId,
        campaign_id: campaignId,
        email: `aggregate@sendgrid.sync`,
        sg_message_id: `sg-sync-${campaignId}-${Date.now()}`,
        sent_at: new Date().toISOString(), // Fix: Always provide sent_at
        delivered_at: rates.emailsDelivered > 0 ? new Date().toISOString() : null,
        first_opened_at: rates.uniqueOpens > 0 ? new Date().toISOString() : null,
        first_clicked_at: rates.uniqueClicks > 0 ? new Date().toISOString() : null,
        bounce_reason: rates.bounces > 0 ? 'Aggregated bounce data from SendGrid' : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'sg_message_id'
      })

    if (trackingError) {
      console.error('⚠️ Warning: Email tracking sync failed:', trackingError)
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign synced successfully from SendGrid',
      data: {
        campaignId,
        metrics: result,
        rates,
        source: 'sendgrid_api'
      }
    })

  } catch (error: any) {
    console.error('❌ SendGrid sync error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to sync with SendGrid',
      details: error.response?.body || null
    }, { 
      status: 500 
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get all campaigns from database to sync
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      campaigns: campaigns || [],
      message: `Found ${campaigns?.length || 0} campaigns to sync`
    })

  } catch (error: any) {
    console.error('❌ Error fetching campaigns:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch campaigns'
    }, { 
      status: 500 
    })
  }
}