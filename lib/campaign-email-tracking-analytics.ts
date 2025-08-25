import { supabaseServer } from '@/lib/supabase'

export interface EmailTrackingMetrics {
  emailsSent: number
  emailsDelivered: number
  emailsBounced: number
  emailsBlocked: number
  uniqueOpens: number
  totalOpens: number
  uniqueClicks: number
  totalClicks: number
  unsubscribes: number
  spamReports: number
  deliveryRate: number
  bounceRate: number
  openRate: number
  clickRate: number
  unsubscribeRate: number
}

/**
 * Get email tracking metrics for a specific campaign
 */
export async function getCampaignEmailTrackingMetrics(
  campaignId: string,
  startDate: string, 
  endDate: string
): Promise<EmailTrackingMetrics | null> {
  try {
    console.log(`📊 Fetching campaign-specific email tracking metrics for campaign ${campaignId} from ${startDate} to ${endDate}`)
    
    // Get all email tracking records for this specific campaign in the date range
    const { data: trackingRecords, error: trackingError } = await supabaseServer
      .from('email_tracking')
      .select('*')
      .eq('campaign_id', campaignId) // Filter by campaign ID
      .gte('sent_at', startDate + 'T00:00:00Z')
      .lte('sent_at', endDate + 'T23:59:59Z')
    
    if (trackingError) {
      console.error('❌ Error fetching campaign email tracking records:', trackingError)
      return null
    }
    
    if (!trackingRecords || trackingRecords.length === 0) {
      console.log('⚠️ No email tracking records found for this campaign')
      return {
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
    }
    
    console.log(`📧 Found ${trackingRecords.length} email tracking records for campaign ${campaignId}`)
    
    // Calculate metrics from tracking records
    const emailsSent = trackingRecords.length
    
    // Count emails by status
    const sentEmails = trackingRecords.filter(r => ['sent', 'delivered', 'opened', 'clicked'].includes(r.status))
    const deliveredEmails = trackingRecords.filter(r => ['delivered', 'opened', 'clicked'].includes(r.status) || r.status === 'sent') // Assume sent = delivered for local tracking
    const bouncedEmails = trackingRecords.filter(r => r.status === 'bounced')
    const blockedEmails = trackingRecords.filter(r => r.status === 'blocked')
    
    // Count opens and clicks
    const openedEmails = trackingRecords.filter(r => r.first_opened_at || r.open_count > 0)
    const clickedEmails = trackingRecords.filter(r => r.first_clicked_at || r.click_count > 0)
    
    // Calculate unique opens/clicks (one per email)
    const uniqueOpens = openedEmails.length
    const uniqueClicks = clickedEmails.length
    
    // Calculate total opens/clicks (sum of all open_count/click_count)
    const totalOpens = trackingRecords.reduce((sum, record) => sum + (record.open_count || 0), 0)
    const totalClicks = trackingRecords.reduce((sum, record) => sum + (record.click_count || 0), 0)
    
    // Calculate rates
    const emailsDelivered = deliveredEmails.length
    const emailsBounced = bouncedEmails.length
    const emailsBlocked = blockedEmails.length
    
    const deliveryRate = emailsSent > 0 ? (emailsDelivered / emailsSent) * 100 : 0
    const bounceRate = emailsSent > 0 ? (emailsBounced / emailsSent) * 100 : 0
    const openRate = emailsDelivered > 0 ? (uniqueOpens / emailsDelivered) * 100 : 0
    const clickRate = emailsDelivered > 0 ? (uniqueClicks / emailsDelivered) * 100 : 0
    const unsubscribeRate = 0 // Not tracked in local system yet
    
    const metrics: EmailTrackingMetrics = {
      emailsSent,
      emailsDelivered,
      emailsBounced,
      emailsBlocked,
      uniqueOpens,
      totalOpens,
      uniqueClicks,
      totalClicks,
      unsubscribes: 0, // Not tracked locally yet
      spamReports: 0, // Not tracked locally yet
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      unsubscribeRate: 0
    }
    
    console.log('📊 Campaign email tracking metrics calculated:', {
      campaignId: campaignId,
      emailsSent: metrics.emailsSent,
      openRate: metrics.openRate,
      clickRate: metrics.clickRate,
      uniqueOpens: metrics.uniqueOpens,
      uniqueClicks: metrics.uniqueClicks,
      deliveryRate: metrics.deliveryRate
    })
    
    return metrics
    
  } catch (error) {
    console.error('❌ Error calculating campaign email tracking metrics:', error)
    return null
  }
}