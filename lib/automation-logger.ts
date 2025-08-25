import { getSupabaseServerClient } from './supabase'

export type AutomationActionType = 
  | 'scraping_started'
  | 'scraping_completed'
  | 'scraping_failed'
  | 'email_sent'
  | 'email_failed'
  | 'email_bounced'
  | 'campaign_started'
  | 'campaign_paused'
  | 'campaign_completed'
  | 'sender_account_added'
  | 'sender_account_removed'
  | 'sender_account_verified'
  | 'contacts_imported'
  | 'contacts_enriched'
  | 'sequence_created'
  | 'sequence_updated'
  | 'admin_action'

export interface AutomationLogEntry {
  user_id: string
  campaign_id?: string
  action_type: AutomationActionType
  action_details?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

export async function logAutomationActivity(entry: AutomationLogEntry) {
  try {
    const supabase = getSupabaseServerClient()
    
    const { error } = await supabase
      .from('automation_logs')
      .insert({
        user_id: entry.user_id,
        campaign_id: entry.campaign_id || null,
        action_type: entry.action_type,
        action_details: entry.action_details || {},
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        created_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Failed to log automation activity:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error in logAutomationActivity:', error)
    return false
  }
}

export async function getRecentLogs(userId?: string, limit: number = 50) {
  try {
    const supabase = getSupabaseServerClient()
    
    let query = supabase
      .from('automation_logs')
      .select(`
        *,
        campaigns!fk_automation_logs_campaign(name, status)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Failed to fetch automation logs:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getRecentLogs:', error)
    return []
  }
}