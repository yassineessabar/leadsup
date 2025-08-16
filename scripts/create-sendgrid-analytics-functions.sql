-- SendGrid Analytics Database Functions
-- These functions support the SendGrid analytics service

-- ============================================
-- CAMPAIGN METRICS AGGREGATION FUNCTION
-- ============================================

-- Function to get aggregated campaign metrics for a date range
CREATE OR REPLACE FUNCTION get_campaign_metrics_aggregated(
  p_campaign_id UUID,
  p_user_id UUID,
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
    COALESCE(SUM(cm.emails_deferred), 0) as emails_deferred,
    COALESCE(SUM(cm.unique_opens), 0) as unique_opens,
    COALESCE(SUM(cm.total_opens), 0) as total_opens,
    COALESCE(SUM(cm.unique_clicks), 0) as unique_clicks,
    COALESCE(SUM(cm.total_clicks), 0) as total_clicks,
    COALESCE(SUM(cm.unsubscribes), 0) as unsubscribes,
    COALESCE(SUM(cm.spam_reports), 0) as spam_reports,
    -- Calculate weighted average delivery rate
    CASE 
      WHEN SUM(cm.emails_sent) > 0 THEN 
        ROUND((SUM(cm.emails_delivered)::DECIMAL / SUM(cm.emails_sent)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as delivery_rate,
    -- Calculate weighted average bounce rate
    CASE 
      WHEN SUM(cm.emails_sent) > 0 THEN 
        ROUND((SUM(cm.emails_bounced)::DECIMAL / SUM(cm.emails_sent)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as bounce_rate,
    -- Calculate weighted average open rate
    CASE 
      WHEN SUM(cm.emails_delivered) > 0 THEN 
        ROUND((SUM(cm.unique_opens)::DECIMAL / SUM(cm.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as open_rate,
    -- Calculate weighted average click rate
    CASE 
      WHEN SUM(cm.emails_delivered) > 0 THEN 
        ROUND((SUM(cm.unique_clicks)::DECIMAL / SUM(cm.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as click_rate,
    -- Calculate weighted average unsubscribe rate
    CASE 
      WHEN SUM(cm.emails_delivered) > 0 THEN 
        ROUND((SUM(cm.unsubscribes)::DECIMAL / SUM(cm.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as unsubscribe_rate
  FROM campaign_metrics cm
  WHERE cm.campaign_id = p_campaign_id
    AND cm.user_id = p_user_id
    AND (p_start_date IS NULL OR cm.date >= p_start_date)
    AND (p_end_date IS NULL OR cm.date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- USER METRICS AGGREGATION FUNCTION
-- ============================================

-- Function to get aggregated user metrics across all campaigns for a date range
CREATE OR REPLACE FUNCTION get_user_metrics_aggregated(
  p_user_id UUID,
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
    COALESCE(SUM(cm.emails_deferred), 0) as emails_deferred, -- Get deferred from campaign_metrics
    COALESCE(SUM(um.unique_opens), 0) as unique_opens,
    COALESCE(SUM(um.total_opens), 0) as total_opens,
    COALESCE(SUM(um.unique_clicks), 0) as unique_clicks,
    COALESCE(SUM(um.total_clicks), 0) as total_clicks,
    COALESCE(SUM(um.unsubscribes), 0) as unsubscribes,
    COALESCE(SUM(um.spam_reports), 0) as spam_reports,
    -- Calculate weighted average delivery rate
    CASE 
      WHEN SUM(um.emails_sent) > 0 THEN 
        ROUND((SUM(um.emails_delivered)::DECIMAL / SUM(um.emails_sent)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as delivery_rate,
    -- Calculate weighted average bounce rate
    CASE 
      WHEN SUM(um.emails_sent) > 0 THEN 
        ROUND((SUM(um.emails_bounced)::DECIMAL / SUM(um.emails_sent)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as bounce_rate,
    -- Calculate weighted average open rate
    CASE 
      WHEN SUM(um.emails_delivered) > 0 THEN 
        ROUND((SUM(um.unique_opens)::DECIMAL / SUM(um.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as open_rate,
    -- Calculate weighted average click rate
    CASE 
      WHEN SUM(um.emails_delivered) > 0 THEN 
        ROUND((SUM(um.unique_clicks)::DECIMAL / SUM(um.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as click_rate,
    -- Calculate weighted average unsubscribe rate
    CASE 
      WHEN SUM(um.emails_delivered) > 0 THEN 
        ROUND((SUM(um.unsubscribes)::DECIMAL / SUM(um.emails_delivered)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as unsubscribe_rate
  FROM user_metrics um
  LEFT JOIN campaign_metrics cm ON cm.user_id = um.user_id AND cm.date = um.date
  WHERE um.user_id = p_user_id
    AND (p_start_date IS NULL OR um.date >= p_start_date)
    AND (p_end_date IS NULL OR um.date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REAL-TIME METRICS FUNCTIONS
-- ============================================

-- Function to get real-time campaign metrics (from raw events)
CREATE OR REPLACE FUNCTION get_campaign_metrics_realtime(
  p_campaign_id UUID,
  p_user_id UUID,
  p_hours_back INTEGER DEFAULT 24
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
  spam_reports BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'processed') as emails_sent,
    COUNT(*) FILTER (WHERE event_type = 'delivered') as emails_delivered,
    COUNT(*) FILTER (WHERE event_type = 'bounce') as emails_bounced,
    COUNT(*) FILTER (WHERE event_type = 'blocked') as emails_blocked,
    COUNT(DISTINCT email) FILTER (WHERE event_type = 'open') as unique_opens,
    COUNT(*) FILTER (WHERE event_type = 'open') as total_opens,
    COUNT(DISTINCT email) FILTER (WHERE event_type = 'click') as unique_clicks,
    COUNT(*) FILTER (WHERE event_type = 'click') as total_clicks,
    COUNT(*) FILTER (WHERE event_type IN ('unsubscribe', 'group_unsubscribe')) as unsubscribes,
    COUNT(*) FILTER (WHERE event_type = 'spam_report') as spam_reports
  FROM sendgrid_events
  WHERE user_id = p_user_id
    AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
    AND timestamp >= NOW() - INTERVAL '1 hour' * p_hours_back;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- METRICS RECALCULATION FUNCTIONS
-- ============================================

-- Enhanced function to recalculate unique metrics for campaign
CREATE OR REPLACE FUNCTION recalculate_unique_metrics(campaign_uuid UUID, metric_date DATE)
RETURNS VOID AS $$
DECLARE
  unique_opens_count INTEGER;
  unique_clicks_count INTEGER;
BEGIN
  -- Calculate unique opens for the date
  SELECT COUNT(DISTINCT email) INTO unique_opens_count
  FROM email_tracking 
  WHERE campaign_id = campaign_uuid 
    AND first_opened_at::DATE = metric_date;
  
  -- Calculate unique clicks for the date
  SELECT COUNT(DISTINCT email) INTO unique_clicks_count
  FROM email_tracking 
  WHERE campaign_id = campaign_uuid 
    AND first_clicked_at::DATE = metric_date;
  
  -- Update campaign metrics
  UPDATE campaign_metrics 
  SET 
    unique_opens = unique_opens_count,
    unique_clicks = unique_clicks_count,
    -- Recalculate rates
    open_rate = CASE 
      WHEN emails_delivered > 0 THEN ROUND((unique_opens_count::DECIMAL / emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    click_rate = CASE 
      WHEN emails_delivered > 0 THEN ROUND((unique_clicks_count::DECIMAL / emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    updated_at = NOW()
  WHERE campaign_id = campaign_uuid AND date = metric_date;
  
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to aggregate user metrics from campaign metrics
CREATE OR REPLACE FUNCTION aggregate_user_metrics(user_uuid UUID, metric_date DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_metrics (
    user_id, date, emails_sent, emails_delivered, emails_bounced, emails_blocked, 
    unique_opens, total_opens, unique_clicks, total_clicks, unsubscribes, spam_reports
  )
  SELECT 
    user_uuid,
    metric_date,
    COALESCE(SUM(emails_sent), 0),
    COALESCE(SUM(emails_delivered), 0),
    COALESCE(SUM(emails_bounced), 0),
    COALESCE(SUM(emails_blocked), 0),
    COALESCE(SUM(unique_opens), 0),
    COALESCE(SUM(total_opens), 0),
    COALESCE(SUM(unique_clicks), 0),
    COALESCE(SUM(total_clicks), 0),
    COALESCE(SUM(unsubscribes), 0),
    COALESCE(SUM(spam_reports), 0)
  FROM campaign_metrics 
  WHERE user_id = user_uuid AND date = metric_date
  ON CONFLICT (user_id, date) DO UPDATE SET
    emails_sent = EXCLUDED.emails_sent,
    emails_delivered = EXCLUDED.emails_delivered,
    emails_bounced = EXCLUDED.emails_bounced,
    emails_blocked = EXCLUDED.emails_blocked,
    unique_opens = EXCLUDED.unique_opens,
    total_opens = EXCLUDED.total_opens,
    unique_clicks = EXCLUDED.unique_clicks,
    total_clicks = EXCLUDED.total_clicks,
    unsubscribes = EXCLUDED.unsubscribes,
    spam_reports = EXCLUDED.spam_reports,
    -- Recalculate rates
    delivery_rate = CASE 
      WHEN EXCLUDED.emails_sent > 0 THEN ROUND((EXCLUDED.emails_delivered::DECIMAL / EXCLUDED.emails_sent::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    bounce_rate = CASE 
      WHEN EXCLUDED.emails_sent > 0 THEN ROUND((EXCLUDED.emails_bounced::DECIMAL / EXCLUDED.emails_sent::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    open_rate = CASE 
      WHEN EXCLUDED.emails_delivered > 0 THEN ROUND((EXCLUDED.unique_opens::DECIMAL / EXCLUDED.emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    click_rate = CASE 
      WHEN EXCLUDED.emails_delivered > 0 THEN ROUND((EXCLUDED.unique_clicks::DECIMAL / EXCLUDED.emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BULK RECALCULATION FUNCTIONS
-- ============================================

-- Function to recalculate all metrics for a user (useful for data fixes)
CREATE OR REPLACE FUNCTION recalculate_all_user_metrics(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  recalc_count INTEGER := 0;
  campaign_record RECORD;
  date_record RECORD;
BEGIN
  -- Loop through all campaigns for the user
  FOR campaign_record IN 
    SELECT DISTINCT campaign_id 
    FROM campaign_metrics 
    WHERE user_id = user_uuid
  LOOP
    -- Loop through all dates for each campaign
    FOR date_record IN 
      SELECT DISTINCT date 
      FROM campaign_metrics 
      WHERE user_id = user_uuid AND campaign_id = campaign_record.campaign_id
    LOOP
      -- Recalculate unique metrics for this campaign and date
      PERFORM recalculate_unique_metrics(campaign_record.campaign_id, date_record.date);
      recalc_count := recalc_count + 1;
    END LOOP;
  END LOOP;
  
  -- Aggregate all user metrics
  FOR date_record IN 
    SELECT DISTINCT date 
    FROM campaign_metrics 
    WHERE user_id = user_uuid
  LOOP
    PERFORM aggregate_user_metrics(user_uuid, date_record.date);
  END LOOP;
  
  RETURN recalc_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ANALYTICS QUERY FUNCTIONS
-- ============================================

-- Function to get campaign performance comparison
CREATE OR REPLACE FUNCTION get_campaign_performance_comparison(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  campaign_id UUID,
  campaign_name TEXT,
  emails_sent BIGINT,
  delivery_rate DECIMAL(5,2),
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  unsubscribe_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    COALESCE(SUM(cm.emails_sent), 0) as emails_sent,
    CASE 
      WHEN SUM(cm.emails_sent) > 0 THEN 
        ROUND((SUM(cm.emails_delivered)::DECIMAL / SUM(cm.emails_sent)::DECIMAL) * 100, 2)
      ELSE 0.00 
    END as delivery_rate,
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
  FROM campaigns c
  LEFT JOIN campaign_metrics cm ON c.id = cm.campaign_id
  WHERE c.user_id = p_user_id
    AND (p_start_date IS NULL OR cm.date >= p_start_date)
    AND (p_end_date IS NULL OR cm.date <= p_end_date)
  GROUP BY c.id, c.name
  ORDER BY emails_sent DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'SendGrid Analytics functions created successfully! 🎉' as status;
SELECT 'Functions: get_campaign_metrics_aggregated, get_user_metrics_aggregated, recalculate_unique_metrics, aggregate_user_metrics' as functions_created;