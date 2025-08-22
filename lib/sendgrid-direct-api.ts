// Direct SendGrid API integration to fetch real analytics data
// This bypasses webhook events and calls SendGrid API directly

interface SendGridApiMetrics {
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

export class SendGridDirectAPI {
  private static apiKey: string | undefined = process.env.SENDGRID_API_KEY

  /**
   * Fetch real account-level metrics from SendGrid API
   */
  static async getAccountMetrics(startDate: string, endDate: string): Promise<SendGridApiMetrics | null> {
    if (!this.apiKey) {
      console.warn('⚠️ SENDGRID_API_KEY not configured - cannot fetch direct metrics')
      return null
    }

    try {
      console.log('📡 Fetching real SendGrid metrics via API...', { startDate, endDate })

      // SendGrid Stats API endpoint
      const url = `https://api.sendgrid.com/v3/stats?start_date=${startDate}&end_date=${endDate}&aggregated_by=day`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('❌ SendGrid API error:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('❌ Error details:', errorText)
        return null
      }

      const data = await response.json()
      console.log('📊 Raw SendGrid API response:', JSON.stringify(data, null, 2))

      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('⚠️ No data returned from SendGrid API')
        return null
      }

      // Aggregate metrics across all days
      const aggregated = data.reduce((acc, dayStats) => {
        const stats = dayStats.stats?.[0]?.metrics || {}
        
        return {
          blocks: (acc.blocks || 0) + (stats.blocks || 0),
          bounces: (acc.bounces || 0) + (stats.bounces || 0),
          clicks: (acc.clicks || 0) + (stats.clicks || 0),
          deferred: (acc.deferred || 0) + (stats.deferred || 0),
          delivered: (acc.delivered || 0) + (stats.delivered || 0),
          invalid_emails: (acc.invalid_emails || 0) + (stats.invalid_emails || 0),
          opens: (acc.opens || 0) + (stats.opens || 0),
          processed: (acc.processed || 0) + (stats.processed || 0),
          requests: (acc.requests || 0) + (stats.requests || 0),
          spam_report_drops: (acc.spam_report_drops || 0) + (stats.spam_report_drops || 0),
          spam_reports: (acc.spam_reports || 0) + (stats.spam_reports || 0),
          unique_clicks: (acc.unique_clicks || 0) + (stats.unique_clicks || 0),
          unique_opens: (acc.unique_opens || 0) + (stats.unique_opens || 0),
          unsubscribe_drops: (acc.unsubscribe_drops || 0) + (stats.unsubscribe_drops || 0),
          unsubscribes: (acc.unsubscribes || 0) + (stats.unsubscribes || 0)
        }
      }, {})

      console.log('📊 Aggregated SendGrid metrics:', aggregated)

      // Calculate rates
      const emailsSent = aggregated.requests || aggregated.processed || 0
      const emailsDelivered = aggregated.delivered || 0
      const emailsBounced = aggregated.bounces || 0
      const emailsBlocked = aggregated.blocks || 0
      const uniqueOpens = aggregated.unique_opens || 0
      const totalOpens = aggregated.opens || 0
      const uniqueClicks = aggregated.unique_clicks || 0
      const totalClicks = aggregated.clicks || 0
      const unsubscribes = aggregated.unsubscribes || 0
      const spamReports = aggregated.spam_reports || 0

      // Calculate percentage rates
      const deliveryRate = emailsSent > 0 ? (emailsDelivered / emailsSent) * 100 : 0
      const bounceRate = emailsSent > 0 ? (emailsBounced / emailsSent) * 100 : 0
      const openRate = emailsDelivered > 0 ? (uniqueOpens / emailsDelivered) * 100 : 0
      const clickRate = emailsDelivered > 0 ? (uniqueClicks / emailsDelivered) * 100 : 0
      const unsubscribeRate = emailsDelivered > 0 ? (unsubscribes / emailsDelivered) * 100 : 0

      const metrics: SendGridApiMetrics = {
        emailsSent,
        emailsDelivered,
        emailsBounced,
        emailsBlocked,
        uniqueOpens,
        totalOpens,
        uniqueClicks,
        totalClicks,
        unsubscribes,
        spamReports,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        unsubscribeRate: Math.round(unsubscribeRate * 100) / 100
      }

      console.log('✅ Final calculated metrics:', metrics)

      // Only return metrics if there's actual email activity
      if (emailsSent > 0) {
        return metrics
      } else {
        console.log('⚠️ No email activity found in SendGrid API')
        return null
      }

    } catch (error) {
      console.error('❌ Error fetching SendGrid direct API metrics:', error)
      return null
    }
  }

  /**
   * Get campaign-specific metrics from SendGrid API
   */
  static async getCampaignMetrics(campaignId: string, startDate: string, endDate: string): Promise<SendGridApiMetrics | null> {
    if (!this.apiKey) {
      console.warn('⚠️ SENDGRID_API_KEY not configured - cannot fetch campaign metrics')
      return null
    }

    try {
      console.log(`📡 Fetching campaign metrics for ${campaignId}...`)

      // For campaign-specific metrics, we can use categories if they're set up
      // or filter by campaign ID in the stats
      const url = `https://api.sendgrid.com/v3/stats?start_date=${startDate}&end_date=${endDate}&aggregated_by=day`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('❌ SendGrid campaign API error:', response.status)
        return null
      }

      const data = await response.json()
      
      // For now, return account-level metrics
      // In a full implementation, you'd filter by campaign categories
      return this.getAccountMetrics(startDate, endDate)

    } catch (error) {
      console.error('❌ Error fetching SendGrid campaign metrics:', error)
      return null
    }
  }
}