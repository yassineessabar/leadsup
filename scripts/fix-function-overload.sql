-- Fix function overloading conflict for SendGrid analytics
-- Drop the conflicting functions and recreate with unique names

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS get_campaign_metrics_aggregated(text, text, date, date);
DROP FUNCTION IF EXISTS get_campaign_metrics_aggregated(uuid, uuid, date, date);
DROP FUNCTION IF EXISTS get_user_metrics_aggregated(text, date, date);
DROP FUNCTION IF EXISTS get_user_metrics_aggregated(uuid, date, date);

-- Create the SendGrid-specific function with a unique name
CREATE OR REPLACE FUNCTION get_sendgrid_campaign_metrics(
  p_campaign_id TEXT,
  p_user_id TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  emails_sent BIGINT,
  emails_delivered BIGINT,
  emails_bounced BIGINT,
  emails_blocked BIGINT,
  emails_deferred BIGINT,
  unique_opens BIGINT,
  total_opens BIGINT,
  unique_clicks BIGINT,
  total_clicks BIGINT,
  unsubscribes BIGINT,
  spam_reports BIGINT,
  delivery_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  unsubscribe_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(cm.emails_sent), 0) as emails_sent,
    COALESCE(SUM(cm.emails_delivered), 0) as emails_delivered,
    COALESCE(SUM(cm.emails_bounced), 0) as emails_bounced,
    COALESCE(SUM(cm.emails_blocked), 0) as emails_blocked,
    COALESCE(SUM(0), 0) as emails_deferred,
    COALESCE(SUM(cm.unique_opens), 0) as unique_opens,
    COALESCE(SUM(cm.total_opens), 0) as total_opens,
    COALESCE(SUM(cm.unique_clicks), 0) as unique_clicks,
    COALESCE(SUM(cm.total_clicks), 0) as total_clicks,
    COALESCE(SUM(cm.unsubscribes), 0) as unsubscribes,
    COALESCE(SUM(cm.spam_reports), 0) as spam_reports,
    -- Calculate weighted average rates
    CASE 
      WHEN SUM(cm.emails_sent) > 0 THEN 
        ROUND((SUM(cm.emails_delivered)::DECIMAL / SUM(cm.emails_sent)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as delivery_rate,
    CASE 
      WHEN SUM(cm.emails_sent) > 0 THEN 
        ROUND((SUM(cm.emails_bounced)::DECIMAL / SUM(cm.emails_sent)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as bounce_rate,
    CASE 
      WHEN SUM(cm.emails_delivered) > 0 THEN 
        ROUND((SUM(cm.unique_opens)::DECIMAL / SUM(cm.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as open_rate,
    CASE 
      WHEN SUM(cm.emails_delivered) > 0 THEN 
        ROUND((SUM(cm.unique_clicks)::DECIMAL / SUM(cm.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as click_rate,
    CASE 
      WHEN SUM(cm.emails_delivered) > 0 THEN 
        ROUND((SUM(cm.unsubscribes)::DECIMAL / SUM(cm.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as unsubscribe_rate
  FROM campaign_metrics cm
  WHERE cm.user_id = p_user_id
    AND (p_campaign_id IS NULL OR cm.campaign_id = p_campaign_id)
    AND (p_start_date IS NULL OR cm.date >= p_start_date)
    AND (p_end_date IS NULL OR cm.date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Create the SendGrid-specific user metrics function
CREATE OR REPLACE FUNCTION get_sendgrid_user_metrics(
  p_user_id TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  emails_sent BIGINT,
  emails_delivered BIGINT,
  emails_bounced BIGINT,
  emails_blocked BIGINT,
  emails_deferred BIGINT,
  unique_opens BIGINT,
  total_opens BIGINT,
  unique_clicks BIGINT,
  total_clicks BIGINT,
  unsubscribes BIGINT,
  spam_reports BIGINT,
  delivery_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  unsubscribe_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(um.emails_sent), 0) as emails_sent,
    COALESCE(SUM(um.emails_delivered), 0) as emails_delivered,
    COALESCE(SUM(um.emails_bounced), 0) as emails_bounced,
    COALESCE(SUM(um.emails_blocked), 0) as emails_blocked,
    COALESCE(SUM(0), 0) as emails_deferred,
    COALESCE(SUM(um.unique_opens), 0) as unique_opens,
    COALESCE(SUM(um.total_opens), 0) as total_opens,
    COALESCE(SUM(um.unique_clicks), 0) as unique_clicks,
    COALESCE(SUM(um.total_clicks), 0) as total_clicks,
    COALESCE(SUM(um.unsubscribes), 0) as unsubscribes,
    COALESCE(SUM(um.spam_reports), 0) as spam_reports,
    -- Calculate weighted average rates
    CASE 
      WHEN SUM(um.emails_sent) > 0 THEN 
        ROUND((SUM(um.emails_delivered)::DECIMAL / SUM(um.emails_sent)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as delivery_rate,
    CASE 
      WHEN SUM(um.emails_sent) > 0 THEN 
        ROUND((SUM(um.emails_bounced)::DECIMAL / SUM(um.emails_sent)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as bounce_rate,
    CASE 
      WHEN SUM(um.emails_delivered) > 0 THEN 
        ROUND((SUM(um.unique_opens)::DECIMAL / SUM(um.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as open_rate,
    CASE 
      WHEN SUM(um.emails_delivered) > 0 THEN 
        ROUND((SUM(um.unique_clicks)::DECIMAL / SUM(um.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as click_rate,
    CASE 
      WHEN SUM(um.emails_delivered) > 0 THEN 
        ROUND((SUM(um.unsubscribes)::DECIMAL / SUM(um.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as unsubscribe_rate
  FROM user_metrics um
  WHERE um.user_id = p_user_id
    AND (p_start_date IS NULL OR um.date >= p_start_date)
    AND (p_end_date IS NULL OR um.date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

SELECT 'Function overloading conflict resolved!' as status;