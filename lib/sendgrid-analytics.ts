import { createClient } from "@supabase/supabase-js"

// Create supabase client only when needed (server-side)
function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    // Browser environment - don't create client here
    throw new Error('SendGrid analytics should only be used on the server side')
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface SendGridMetrics {
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

export interface CampaignMetricsOptions {
  campaignId: string
  userId: string
  dateRange?: {
    start: Date
    end: Date
  }
  selectedSenderEmails?: string[]
}

export interface UserMetricsOptions {
  userId: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export class SendGridAnalyticsService {
  
  /**
   * Get campaign-level metrics for analytics page
   */
  static async getCampaignMetrics(options: CampaignMetricsOptions): Promise<SendGridMetrics> {
    try {
      const { campaignId, userId, dateRange, selectedSenderEmails } = options
      const supabase = getSupabaseClient()
      
      // If we have selected sender emails, filter metrics by those senders
      if (selectedSenderEmails && selectedSenderEmails.length > 0) {
        console.log(`📧 Filtering campaign metrics by selected senders:`, selectedSenderEmails)
        
        // Get aggregated metrics filtered by selected sender emails
        const { data, error } = await supabase.rpc('get_sendgrid_campaign_metrics_by_senders', {
          p_campaign_id: campaignId,
          p_user_id: userId,
          p_sender_emails: selectedSenderEmails,
          p_start_date: dateRange?.start?.toISOString().split('T')[0] || null,
          p_end_date: dateRange?.end?.toISOString().split('T')[0] || null
        })
        
        if (error) {
          console.error("❌ Error fetching filtered campaign metrics:", error)
          console.log("🔄 Falling back to original method...")
        } else if (data && data.length > 0) {
          const metrics = data[0]
          return this.formatMetrics(metrics)
        }
      }
      
      // Fallback to original method if no sender filtering or if the filtered method fails
      const { data, error } = await supabase.rpc('get_sendgrid_campaign_metrics', {
        p_campaign_id: campaignId,
        p_user_id: userId,
        p_start_date: dateRange?.start?.toISOString().split('T')[0] || null,
        p_end_date: dateRange?.end?.toISOString().split('T')[0] || null
      })
      
      if (error) {
        console.error("❌ Error fetching campaign metrics:", error)
        return this.getEmptyMetrics()
      }
      
      if (!data || data.length === 0) {
        console.log("📊 No data from sendgrid metrics, trying fallback calculation from email_tracking...")
        return this.calculateMetricsFromEmailTracking(campaignId, userId, dateRange)
      }
      
      const metrics = data[0]
      return this.formatMetrics(metrics)
      
    } catch (error) {
      console.error("❌ Error in getCampaignMetrics:", error)
      return this.getEmptyMetrics()
    }
  }
  
  /**
   * Get user-level metrics for dashboard
   */
  static async getUserMetrics(options: UserMetricsOptions): Promise<SendGridMetrics> {
    try {
      const { userId, dateRange } = options
      const supabase = getSupabaseClient()
      
      // Get aggregated metrics from user_metrics table
      const { data, error } = await supabase.rpc('get_sendgrid_user_metrics', {
        p_user_id: userId,
        p_start_date: dateRange?.start?.toISOString().split('T')[0] || null,
        p_end_date: dateRange?.end?.toISOString().split('T')[0] || null
      })
      
      if (error) {
        console.error("❌ Error fetching user metrics:", error)
        return this.getEmptyMetrics()
      }
      
      if (!data || data.length === 0) {
        return this.getEmptyMetrics()
      }
      
      const metrics = data[0]
      return this.formatMetrics(metrics)
      
    } catch (error) {
      console.error("❌ Error in getUserMetrics:", error)
      return this.getEmptyMetrics()
    }
  }
  
  /**
   * Get campaign metrics over time for charts
   */
  static async getCampaignMetricsTimeSeries(options: CampaignMetricsOptions & { granularity?: 'day' | 'week' | 'month' }) {
    try {
      const { campaignId, userId, dateRange, granularity = 'day', selectedSenderEmails } = options
      const supabase = getSupabaseClient()
      
      let query = supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)
        .order('date', { ascending: true })
      
      // Filter by selected sender emails if provided
      if (selectedSenderEmails && selectedSenderEmails.length > 0) {
        query = query.in('sender_email', selectedSenderEmails)
      }
      
      if (dateRange) {
        query = query
          .gte('date', dateRange.start.toISOString().split('T')[0])
          .lte('date', dateRange.end.toISOString().split('T')[0])
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error("❌ Error fetching campaign time series:", error)
        return []
      }
      
      return data || []
      
    } catch (error) {
      console.error("❌ Error in getCampaignMetricsTimeSeries:", error)
      return []
    }
  }
  
  /**
   * Get user metrics over time for dashboard charts
   */
  static async getUserMetricsTimeSeries(options: UserMetricsOptions & { granularity?: 'day' | 'week' | 'month' }) {
    try {
      const { userId, dateRange, granularity = 'day' } = options
      const supabase = getSupabaseClient()
      
      let query = supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })
      
      if (dateRange) {
        query = query
          .gte('date', dateRange.start.toISOString().split('T')[0])
          .lte('date', dateRange.end.toISOString().split('T')[0])
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error("❌ Error fetching user time series:", error)
        return []
      }
      
      return data || []
      
    } catch (error) {
      console.error("❌ Error in getUserMetricsTimeSeries:", error)
      return []
    }
  }
  
  /**
   * Get email tracking details for a specific campaign
   */
  static async getEmailTrackingDetails(campaignId: string, userId: string, options?: {
    limit?: number
    offset?: number
    status?: string
    selectedSenderEmails?: string[]
  }) {
    try {
      const { limit = 50, offset = 0, status, selectedSenderEmails } = options || {}
      const supabase = getSupabaseClient()
      
      let query = supabase
        .from('email_tracking')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      // Filter by selected sender emails if provided
      if (selectedSenderEmails && selectedSenderEmails.length > 0) {
        query = query.in('sender_email', selectedSenderEmails)
      }
      
      if (status) {
        query = query.eq('status', status)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error("❌ Error fetching email tracking details:", error)
        return { data: [], total: 0 }
      }
      
      // Get total count
      let countQuery = supabase
        .from('email_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
      
      // Filter by selected sender emails if provided
      if (selectedSenderEmails && selectedSenderEmails.length > 0) {
        countQuery = countQuery.in('sender_email', selectedSenderEmails)
      }
      
      if (status) {
        countQuery = countQuery.eq('status', status)
      }
      
      const { count } = await countQuery
      
      return { data: data || [], total: count || 0 }
      
    } catch (error) {
      console.error("❌ Error in getEmailTrackingDetails:", error)
      return { data: [], total: 0 }
    }
  }
  
  /**
   * Manually trigger metric recalculation for a specific date
   */
  static async recalculateMetrics(userId: string, campaignId?: string, date?: Date) {
    try {
      const targetDate = date || new Date()
      const dateStr = targetDate.toISOString().split('T')[0]
      const supabase = getSupabaseClient()
      
      if (campaignId) {
        // Recalculate campaign metrics
        await supabase.rpc('recalculate_unique_metrics', {
          campaign_uuid: campaignId,
          metric_date: dateStr
        })
        
        // Aggregate to user metrics
        await supabase.rpc('aggregate_user_metrics', {
          user_uuid: userId,
          metric_date: dateStr
        })
      } else {
        // Recalculate all user metrics for the date
        await supabase.rpc('aggregate_user_metrics', {
          user_uuid: userId,
          metric_date: dateStr
        })
      }
      
      return { success: true }
      
    } catch (error) {
      console.error("❌ Error recalculating metrics:", error)
      return { success: false, error }
    }
  }
  
  /**
   * Get recent SendGrid events for debugging
   */
  static async getRecentEvents(userId: string, options?: {
    limit?: number
    campaignId?: string
    eventType?: string
  }) {
    try {
      const { limit = 50, campaignId, eventType } = options || {}
      const supabase = getSupabaseClient()
      
      let query = supabase
        .from('sendgrid_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit)
      
      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }
      
      if (eventType) {
        query = query.eq('event_type', eventType)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error("❌ Error fetching recent events:", error)
        return []
      }
      
      return data || []
      
    } catch (error) {
      console.error("❌ Error in getRecentEvents:", error)
      return []
    }
  }
  
  /**
   * Fallback method to calculate metrics directly from email_tracking table
   */
  private static async calculateMetricsFromEmailTracking(
    campaignId: string, 
    userId: string, 
    dateRange?: { start: Date; end: Date }
  ): Promise<SendGridMetrics> {
    try {
      console.log("📊 Calculating metrics from email_tracking table...")
      const supabase = getSupabaseClient()
      
      // Build query for email_tracking
      let query = supabase
        .from('email_tracking')
        .select('*')
        .eq('campaign_id', campaignId)
      
      // Apply date range if provided
      if (dateRange) {
        query = query
          .gte('sent_at', dateRange.start.toISOString())
          .lte('sent_at', dateRange.end.toISOString())
      }
      
      const { data: emailTracking, error } = await query
      
      if (error) {
        console.error("❌ Error fetching email tracking data:", error)
        return this.getEmptyMetrics()
      }
      
      if (!emailTracking || emailTracking.length === 0) {
        console.log("📧 No email tracking data found")
        return this.getEmptyMetrics()
      }
      
      console.log(`📧 Found ${emailTracking.length} email tracking records`)
      
      // Calculate metrics from email_tracking data
      const emailsSent = emailTracking.filter(email => email.status === 'sent').length
      const emailsDelivered = emailTracking.filter(email => email.delivered_at !== null).length
      const uniqueOpens = emailTracking.filter(email => email.opened_at !== null).length
      const uniqueClicks = emailTracking.filter(email => email.clicked_at !== null).length
      const emailsBounced = emailTracking.filter(email => email.bounced_at !== null).length
      const spamReports = emailTracking.filter(email => email.spam_reported_at !== null).length
      const unsubscribes = emailTracking.filter(email => email.unsubscribed_at !== null).length
      
      // Calculate rates
      const deliveryRate = emailsSent > 0 ? (emailsDelivered / emailsSent) * 100 : 0
      const bounceRate = emailsSent > 0 ? (emailsBounced / emailsSent) * 100 : 0
      const openRate = emailsSent > 0 ? (uniqueOpens / emailsSent) * 100 : 0
      const clickRate = emailsSent > 0 ? (uniqueClicks / emailsSent) * 100 : 0
      const unsubscribeRate = emailsSent > 0 ? (unsubscribes / emailsSent) * 100 : 0
      
      console.log(`✅ Calculated metrics: ${emailsSent} sent, ${emailsDelivered} delivered, ${uniqueOpens} opened, ${uniqueClicks} clicked`)
      
      return {
        emailsSent,
        emailsDelivered,
        emailsBounced,
        emailsBlocked: 0, // Not tracked in email_tracking
        uniqueOpens,
        totalOpens: uniqueOpens, // Assuming unique opens = total opens for now
        uniqueClicks,
        totalClicks: uniqueClicks, // Assuming unique clicks = total clicks for now
        unsubscribes,
        spamReports,
        deliveryRate,
        bounceRate,
        openRate,
        clickRate,
        unsubscribeRate,
      }
      
    } catch (error) {
      console.error("❌ Error calculating metrics from email_tracking:", error)
      return this.getEmptyMetrics()
    }
  }

  /**
   * Format raw metrics data into standardized format
   */
  private static formatMetrics(raw: any): SendGridMetrics {
    return {
      emailsSent: parseInt(raw.emails_sent) || 0,
      emailsDelivered: parseInt(raw.emails_delivered) || 0,
      emailsBounced: parseInt(raw.emails_bounced) || 0,
      emailsBlocked: parseInt(raw.emails_blocked) || 0,
      uniqueOpens: parseInt(raw.unique_opens) || 0,
      totalOpens: parseInt(raw.total_opens) || 0,
      uniqueClicks: parseInt(raw.unique_clicks) || 0,
      totalClicks: parseInt(raw.total_clicks) || 0,
      unsubscribes: parseInt(raw.unsubscribes) || 0,
      spamReports: parseInt(raw.spam_reports) || 0,
      deliveryRate: parseFloat(raw.delivery_rate) || 0,
      bounceRate: parseFloat(raw.bounce_rate) || 0,
      openRate: parseFloat(raw.open_rate) || 0,
      clickRate: parseFloat(raw.click_rate) || 0,
      unsubscribeRate: parseFloat(raw.unsubscribe_rate) || 0,
    }
  }
  
  /**
   * Return empty metrics structure
   */
  private static getEmptyMetrics(): SendGridMetrics {
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
      unsubscribeRate: 0,
    }
  }
}