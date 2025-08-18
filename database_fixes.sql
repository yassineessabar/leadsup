-- Database fixes for missing columns and functions
-- Run these SQL commands in your Supabase SQL editor

-- 1. Add sender_email column to campaign_metrics table
ALTER TABLE campaign_metrics 
ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);

-- 2. Add sender_email column to email_tracking table  
ALTER TABLE email_tracking 
ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);

-- 3. Create index for performance on new sender_email columns
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_sender_email ON campaign_metrics(sender_email);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sender_email ON email_tracking(sender_email);

-- 4. Create the missing function get_sendgrid_campaign_metrics_by_senders
CREATE OR REPLACE FUNCTION get_sendgrid_campaign_metrics_by_senders(
  p_campaign_id UUID,
  p_user_id UUID,
  p_sender_emails TEXT[],
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  emails_sent BIGINT,
  emails_delivered BIGINT,
  emails_bounced BIGINT,
  emails_blocked BIGINT,
  unique_opens BIGINT,
  total_opens BIGINT,
  unique_clicks BIGINT,
  total_clicks BIGINT,
  unsubscribes BIGINT,
  spam_reports BIGINT,
  delivery_rate NUMERIC,
  bounce_rate NUMERIC,
  open_rate NUMERIC,
  click_rate NUMERIC,
  unsubscribe_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(cm.emails_sent), 0)::BIGINT as emails_sent,
    COALESCE(SUM(cm.emails_delivered), 0)::BIGINT as emails_delivered,
    COALESCE(SUM(cm.emails_bounced), 0)::BIGINT as emails_bounced,
    COALESCE(SUM(cm.emails_blocked), 0)::BIGINT as emails_blocked,
    COALESCE(SUM(cm.unique_opens), 0)::BIGINT as unique_opens,
    COALESCE(SUM(cm.total_opens), 0)::BIGINT as total_opens,
    COALESCE(SUM(cm.unique_clicks), 0)::BIGINT as unique_clicks,
    COALESCE(SUM(cm.total_clicks), 0)::BIGINT as total_clicks,
    COALESCE(SUM(cm.unsubscribes), 0)::BIGINT as unsubscribes,
    COALESCE(SUM(cm.spam_reports), 0)::BIGINT as spam_reports,
    CASE 
      WHEN COALESCE(SUM(cm.emails_sent), 0) > 0 
      THEN (COALESCE(SUM(cm.emails_delivered), 0)::NUMERIC / COALESCE(SUM(cm.emails_sent), 1)::NUMERIC * 100)
      ELSE 0 
    END as delivery_rate,
    CASE 
      WHEN COALESCE(SUM(cm.emails_sent), 0) > 0 
      THEN (COALESCE(SUM(cm.emails_bounced), 0)::NUMERIC / COALESCE(SUM(cm.emails_sent), 1)::NUMERIC * 100)
      ELSE 0 
    END as bounce_rate,
    CASE 
      WHEN COALESCE(SUM(cm.emails_delivered), 0) > 0 
      THEN (COALESCE(SUM(cm.unique_opens), 0)::NUMERIC / COALESCE(SUM(cm.emails_delivered), 1)::NUMERIC * 100)
      ELSE 0 
    END as open_rate,
    CASE 
      WHEN COALESCE(SUM(cm.unique_opens), 0) > 0 
      THEN (COALESCE(SUM(cm.unique_clicks), 0)::NUMERIC / COALESCE(SUM(cm.unique_opens), 1)::NUMERIC * 100)
      ELSE 0 
    END as click_rate,
    CASE 
      WHEN COALESCE(SUM(cm.emails_delivered), 0) > 0 
      THEN (COALESCE(SUM(cm.unsubscribes), 0)::NUMERIC / COALESCE(SUM(cm.emails_delivered), 1)::NUMERIC * 100)
      ELSE 0 
    END as unsubscribe_rate
  FROM campaign_metrics cm
  WHERE cm.campaign_id = p_campaign_id
    AND cm.user_id = p_user_id
    AND (p_sender_emails IS NULL OR cm.sender_email = ANY(p_sender_emails))
    AND (p_start_date IS NULL OR cm.date >= p_start_date)
    AND (p_end_date IS NULL OR cm.date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_sendgrid_campaign_metrics_by_senders TO authenticated;