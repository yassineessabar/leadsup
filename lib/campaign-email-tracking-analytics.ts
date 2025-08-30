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
    // Use sendgrid_events since that's where webhook data is stored
    const { data: trackingRecords, error: trackingError } = await supabaseServer
      .from('sendgrid_events')
      .select('*')
      .eq('campaign_id', campaignId) // Filter by campaign ID
      .gte('timestamp', startDate + 'T00:00:00Z')
      .lte('timestamp', endDate + 'T23:59:59Z')
    
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
    
    // Calculate metrics from sendgrid_events records
    // Group by sg_message_id to avoid counting the same email multiple times
    const uniqueMessages = new Map()
    trackingRecords.forEach(event => {
      const msgId = event.sg_message_id
      if (!uniqueMessages.has(msgId)) {
        uniqueMessages.set(msgId, {
          email: event.email,
          events: [],
          delivered: false,
          opened: false,
          clicked: false,
          bounced: false,
          blocked: false
        })
      }
      
      const message = uniqueMessages.get(msgId)
      message.events.push(event.event_type)
      
      if (event.event_type === 'delivered') message.delivered = true
      if (event.event_type === 'open') message.opened = true
      if (event.event_type === 'click') message.clicked = true
      if (event.event_type === 'bounce') message.bounced = true
      if (event.event_type === 'blocked') message.blocked = true
    })
    
    const messageArray = Array.from(uniqueMessages.values())
    const emailsSent = messageArray.length
    const deliveredEmails = messageArray.filter(m => m.delivered)
    const bouncedEmails = messageArray.filter(m => m.bounced)
    const blockedEmails = messageArray.filter(m => m.blocked)
    const openedEmails = messageArray.filter(m => m.opened)
    const clickedEmails = messageArray.filter(m => m.clicked)
    
    // Calculate unique opens/clicks
    const uniqueOpens = openedEmails.length
    const uniqueClicks = clickedEmails.length
    
    // Calculate total opens/clicks (count all open/click events)
    const totalOpens = trackingRecords.filter(e => e.event_type === 'open').length
    const totalClicks = trackingRecords.filter(e => e.event_type === 'click').length
    
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