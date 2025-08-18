-- Create function to get campaign metrics filtered by specific sender emails
CREATE OR REPLACE FUNCTION get_sendgrid_campaign_metrics_by_senders(
  p_campaign_id TEXT,
  p_user_id TEXT,
  p_sender_emails TEXT[],
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
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
    COALESCE(SUM(sm.emails_sent), 0)::BIGINT as emails_sent,
    COALESCE(SUM(sm.emails_delivered), 0)::BIGINT as emails_delivered,
    COALESCE(SUM(sm.emails_bounced), 0)::BIGINT as emails_bounced,
    COALESCE(SUM(sm.emails_blocked), 0)::BIGINT as emails_blocked,
    COALESCE(SUM(sm.unique_opens), 0)::BIGINT as unique_opens,
    COALESCE(SUM(sm.total_opens), 0)::BIGINT as total_opens,
    COALESCE(SUM(sm.unique_clicks), 0)::BIGINT as unique_clicks,
    COALESCE(SUM(sm.total_clicks), 0)::BIGINT as total_clicks,
    COALESCE(SUM(sm.unsubscribes), 0)::BIGINT as unsubscribes,
    COALESCE(SUM(sm.spam_reports), 0)::BIGINT as spam_reports,
    CASE 
      WHEN COALESCE(SUM(sm.emails_sent), 0) > 0 
      THEN ROUND((COALESCE(SUM(sm.emails_delivered), 0)::NUMERIC / COALESCE(SUM(sm.emails_sent), 1)) * 100, 2)
      ELSE 0
    END as delivery_rate,
    CASE 
      WHEN COALESCE(SUM(sm.emails_sent), 0) > 0 
      THEN ROUND((COALESCE(SUM(sm.emails_bounced), 0)::NUMERIC / COALESCE(SUM(sm.emails_sent), 1)) * 100, 2)
      ELSE 0
    END as bounce_rate,
    CASE 
      WHEN COALESCE(SUM(sm.emails_delivered), 0) > 0 
      THEN ROUND((COALESCE(SUM(sm.unique_opens), 0)::NUMERIC / COALESCE(SUM(sm.emails_delivered), 1)) * 100, 2)
      ELSE 0
    END as open_rate,
    CASE 
      WHEN COALESCE(SUM(sm.emails_delivered), 0) > 0 
      THEN ROUND((COALESCE(SUM(sm.unique_clicks), 0)::NUMERIC / COALESCE(SUM(sm.emails_delivered), 1)) * 100, 2)
      ELSE 0
    END as click_rate,
    CASE 
      WHEN COALESCE(SUM(sm.emails_delivered), 0) > 0 
      THEN ROUND((COALESCE(SUM(sm.unsubscribes), 0)::NUMERIC / COALESCE(SUM(sm.emails_delivered), 1)) * 100, 2)
      ELSE 0
    END as unsubscribe_rate
  FROM sendgrid_metrics sm
  WHERE sm.campaign_id = p_campaign_id
    AND sm.user_id = p_user_id
    AND (p_sender_emails IS NULL OR sm.sender_email = ANY(p_sender_emails))
    AND (p_start_date IS NULL OR sm.date >= p_start_date)
    AND (p_end_date IS NULL OR sm.date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sendgrid_campaign_metrics_by_senders(TEXT, TEXT, TEXT[], DATE, DATE) TO authenticated;