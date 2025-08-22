// User-specific analytics - calculate metrics for individual app users
// This replaces account-level SendGrid metrics with user-specific data

import { createClient } from '@supabase/supabase-js'

interface UserMetrics {
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

function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    throw new Error('User analytics should only be used on the server side')
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export class UserSpecificAnalytics {
  
  /**
   * Get user-specific email metrics from inbox_messages and sendgrid_events
   */
  static async getUserMetrics(userId: string, startDate: string, endDate: string): Promise<UserMetrics | null> {
    try {
      const supabase = getSupabaseClient()
      
      console.log(`📊 Calculating user-specific metrics for user: ${userId}`)
      console.log(`📅 Date range: ${startDate} to ${endDate}`)
      
      // Method 1: Try user-specific SendGrid events first
      const { data: userEvents, error: eventsError } = await supabase
        .from('sendgrid_events')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate + 'T00:00:00Z')
        .lte('timestamp', endDate + 'T23:59:59Z')
      
      if (!eventsError && userEvents && userEvents.length > 0) {
        console.log(`✅ Found ${userEvents.length} SendGrid events for user`)
        return this.calculateMetricsFromEvents(userEvents)
      }
      
      console.log('⚠️ No SendGrid events for user, calculating from inbox messages...')
      
      // Method 2: Calculate from inbox_messages (fallback)
      const { data: userMessages, error: messagesError } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate + 'T00:00:00Z')
        .lte('created_at', endDate + 'T23:59:59Z')
      
      if (messagesError) {
        console.error('❌ Error fetching user messages:', messagesError)
        return null
      }
      
      if (!userMessages || userMessages.length === 0) {
        console.log('⚠️ No messages found for user in date range')
        return this.getEmptyMetrics()
      }
      
      console.log(`📧 Found ${userMessages.length} inbox messages for user`)
      return this.calculateMetricsFromMessages(userMessages)
      
    } catch (error) {
      console.error('❌ Error calculating user metrics:', error)
      return null
    }
  }
  
  /**
   * Calculate metrics from SendGrid webhook events
   */
  private static calculateMetricsFromEvents(events: any[]): UserMetrics {
    const eventCounts = events.reduce((acc, event) => {
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
    
    return this.calculateRates(eventCounts)
  }
  
  /**
   * Calculate metrics from inbox_messages (when SendGrid events aren't available)
   */
  private static calculateMetricsFromMessages(messages: any[]): UserMetrics {
    const outboundMessages = messages.filter(m => m.direction === 'outbound')
    const inboundMessages = messages.filter(m => m.direction === 'inbound')
    
    // Basic metrics from message counts
    const emailsSent = outboundMessages.length
    const emailsDelivered = emailsSent // Assume delivered if in inbox
    
    // For opens/clicks, we'd need additional tracking
    // For now, calculate basic delivery metrics
    const metrics = {
      emailsSent,
      emailsDelivered,
      emailsBounced: 0, // Can't determine from inbox_messages
      emailsBlocked: 0, // Can't determine from inbox_messages
      uniqueOpens: 0,   // Would need additional tracking
      totalOpens: 0,    // Would need additional tracking
      uniqueClicks: 0,  // Would need additional tracking
      totalClicks: 0,   // Would need additional tracking
      unsubscribes: 0,  // Would need additional tracking
      spamReports: 0    // Would need additional tracking
    }
    
    console.log(`📊 Calculated from messages: ${emailsSent} sent, ${emailsDelivered} delivered`)
    
    return this.calculateRates(metrics)
  }
  
  /**
   * Calculate percentage rates from raw counts
   */
  private static calculateRates(counts: any): UserMetrics {
    const deliveryRate = counts.emailsSent > 0 
      ? (counts.emailsDelivered / counts.emailsSent) * 100 
      : 0
    const bounceRate = counts.emailsSent > 0 
      ? (counts.emailsBounced / counts.emailsSent) * 100 
      : 0
    const openRate = counts.emailsDelivered > 0 
      ? (counts.uniqueOpens / counts.emailsDelivered) * 100 
      : 0
    const clickRate = counts.emailsDelivered > 0 
      ? (counts.uniqueClicks / counts.emailsDelivered) * 100 
      : 0
    const unsubscribeRate = counts.emailsDelivered > 0 
      ? (counts.unsubscribes / counts.emailsDelivered) * 100 
      : 0
    
    return {
      emailsSent: counts.emailsSent,
      emailsDelivered: counts.emailsDelivered,
      emailsBounced: counts.emailsBounced,
      emailsBlocked: counts.emailsBlocked,
      uniqueOpens: counts.uniqueOpens,
      totalOpens: counts.totalOpens,
      uniqueClicks: counts.uniqueClicks,
      totalClicks: counts.totalClicks,
      unsubscribes: counts.unsubscribes,
      spamReports: counts.spamReports,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      unsubscribeRate: Math.round(unsubscribeRate * 100) / 100
    }
  }
  
  /**
   * Return empty metrics when no data is available
   */
  private static getEmptyMetrics(): UserMetrics {
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
}