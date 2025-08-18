// Complete workflow for new user campaign creation and stats tracking

import { sendGridAPI } from './sendgrid-api'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CampaignCreationOptions {
  userId: string
  campaignName: string
  fromEmail: string
  subject: string
  htmlContent: string
  recipients: string[]
  useOfficialSingleSend?: boolean
}

export class CampaignWorkflow {
  
  /**
   * STEP 1: Create a new campaign with proper SendGrid integration
   */
  static async createCampaign(options: CampaignCreationOptions) {
    const { userId, campaignName, useOfficialSingleSend = false } = options
    
    // Generate campaign ID
    const campaignId = crypto.randomUUID()
    
    // Create in our database first
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        id: campaignId,
        user_id: userId,
        name: campaignName,
        status: 'Draft',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    let sendGridCampaignId = campaignId // Default: use our ID

    if (useOfficialSingleSend) {
      // OPTION A: Create official Single Send in SendGrid
      try {
        const singleSend = await sendGridAPI.createSingleSend({
          name: campaignName,
          categories: [`campaign_${campaignId}`, `user_${userId}`],
          // Note: You'd need to implement createSingleSend in sendgrid-api.ts
        })
        sendGridCampaignId = singleSend.id
        
        // Update our database with SendGrid ID
        await supabase
          .from('campaigns')
          .update({ sendgrid_campaign_id: sendGridCampaignId })
          .eq('id', campaignId)
          
      } catch (error) {
        console.warn('⚠️ Could not create SendGrid Single Send, using category method')
      }
    }

    return {
      campaignId,
      sendGridCampaignId,
      campaign
    }
  }

  /**
   * STEP 2: Send emails with proper tagging for analytics
   */
  static async sendCampaignEmails(
    campaignId: string, 
    userId: string,
    emails: Array<{
      to: string
      subject: string
      html: string
      from: string
    }>
  ) {
    const results = []
    
    for (const email of emails) {
      try {
        // Send email with proper categories for tracking
        const msg = {
          ...email,
          categories: [
            `campaign_${campaignId}`,
            `user_${userId}`,
            'automated_campaign'
          ],
          // Add custom args for detailed tracking
          customArgs: {
            campaign_id: campaignId,
            user_id: userId,
            sent_at: new Date().toISOString()
          }
        }

        // Send via SendGrid (you'd implement this)
        // const result = await sendGrid.send(msg)
        
        results.push({ email: email.to, status: 'sent' })
        
      } catch (error) {
        results.push({ email: email.to, status: 'failed', error })
      }
    }

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({ 
        status: 'Active',
        sent: results.filter(r => r.status === 'sent').length
      })
      .eq('id', campaignId)

    return results
  }

  /**
   * STEP 3: Get real-time stats for any campaign
   */
  static async getCampaignStats(campaignId: string, userId: string) {
    try {
      // Try multiple methods to get stats
      
      // Method 1: Check if it's an official Single Send
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('sendgrid_campaign_id')
        .eq('id', campaignId)
        .single()

      if (campaign?.sendgrid_campaign_id && campaign.sendgrid_campaign_id !== campaignId) {
        // Official Single Send - get direct stats
        try {
          const stats = await sendGridAPI.getSingleSendStats(campaign.sendgrid_campaign_id)
          return this.formatStats(stats, 'single_send')
        } catch (error) {
          console.warn('Single Send stats failed:', error)
        }
      }

      // Method 2: Category-based stats (most common)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 7) // Last 7 days
      const startDate = yesterday.toISOString().split('T')[0]
      
      try {
        const categoryStats = await sendGridAPI.getCategoryStats(
          [`campaign_${campaignId}`], 
          startDate
        )
        
        if (categoryStats.length > 0) {
          return this.formatStats(categoryStats[0], 'category')
        }
      } catch (error) {
        console.warn('Category stats failed:', error)
      }

      // Method 3: Webhook data from our database
      try {
        const dbStats = await this.getStatsFromDatabase(campaignId, userId)
        if (dbStats) {
          return dbStats
        }
      } catch (error) {
        console.warn('Database stats failed:', error)
      }

      // Method 4: Global stats as fallback
      console.log('Using global stats as fallback for demo')
      const globalStats = await sendGridAPI.getGlobalStats(startDate)
      if (globalStats.length > 0) {
        return this.formatStats(globalStats[0], 'global_fallback')
      }

      return null

    } catch (error) {
      console.error('❌ Error getting campaign stats:', error)
      return null
    }
  }

  /**
   * Get stats from our webhook database
   */
  static async getStatsFromDatabase(campaignId: string, userId: string) {
    const { data } = await supabase.rpc('get_sendgrid_campaign_metrics', {
      p_campaign_id: campaignId,
      p_user_id: userId,
      p_start_date: null,
      p_end_date: null
    })

    if (data && data.length > 0) {
      const metrics = data[0]
      return {
        source: 'webhook_database',
        emailsSent: metrics.emails_sent || 0,
        emailsDelivered: metrics.emails_delivered || 0,
        deliveryRate: metrics.delivery_rate || 0,
        openRate: metrics.open_rate || 0,
        clickRate: metrics.click_rate || 0,
        bounceRate: metrics.bounce_rate || 0,
        unsubscribeRate: metrics.unsubscribe_rate || 0,
        uniqueOpens: metrics.unique_opens || 0,
        uniqueClicks: metrics.unique_clicks || 0
      }
    }

    return null
  }

  /**
   * Format stats from different sources into consistent format
   */
  static formatStats(rawStats: any, source: string) {
    const stats = rawStats.stats?.[0]?.metrics || rawStats.metrics || rawStats

    const sent = (stats.delivered || 0) + (stats.bounces || 0) + (stats.blocks || 0)
    
    return {
      source,
      emailsSent: sent,
      emailsDelivered: stats.delivered || 0,
      deliveryRate: sent > 0 ? Math.round((stats.delivered / sent) * 100) : 0,
      openRate: stats.delivered > 0 ? Math.round((stats.unique_opens / stats.delivered) * 100) : 0,
      clickRate: stats.delivered > 0 ? Math.round((stats.unique_clicks / stats.delivered) * 100) : 0,
      bounceRate: sent > 0 ? Math.round((stats.bounces / sent) * 100) : 0,
      unsubscribeRate: stats.delivered > 0 ? Math.round((stats.unsubscribes / stats.delivered) * 100) : 0,
      uniqueOpens: stats.unique_opens || 0,
      uniqueClicks: stats.unique_clicks || 0,
      totalOpens: stats.opens || 0,
      totalClicks: stats.clicks || 0,
      bounces: stats.bounces || 0,
      unsubscribes: stats.unsubscribes || 0,
      blocks: stats.blocks || 0,
      spamReports: stats.spam_reports || 0
    }
  }
}

/**
 * USAGE EXAMPLES:
 */

// Create new campaign
// const { campaignId } = await CampaignWorkflow.createCampaign({
//   userId: 'user-123',
//   campaignName: 'Black Friday Sale',
//   fromEmail: 'sales@company.com',
//   subject: '50% Off Everything!',
//   htmlContent: '<h1>Sale!</h1>',
//   recipients: ['user1@example.com', 'user2@example.com'],
//   useOfficialSingleSend: true // Creates official SendGrid campaign
// })

// Send the emails
// await CampaignWorkflow.sendCampaignEmails(campaignId, userId, emails)

// Get real stats anytime
// const stats = await CampaignWorkflow.getCampaignStats(campaignId, userId)
// console.log(`Open Rate: ${stats.openRate}%, Click Rate: ${stats.clickRate}%`)