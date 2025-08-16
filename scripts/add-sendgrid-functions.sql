-- Add functions and triggers to the SendGrid analytics tables
-- Run this after the minimal tables have been created successfully

-- ============================================
-- ANALYTICS AGGREGATION FUNCTIONS
-- ============================================

-- Function to get aggregated campaign metrics for a date range
CREATE OR REPLACE FUNCTION get_campaign_metrics_aggregated(
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
    COALESCE(SUM(0), 0) as emails_deferred, -- Add this column later if needed
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

-- Function to get aggregated user metrics across all campaigns for a date range
CREATE OR REPLACE FUNCTION get_user_metrics_aggregated(
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
    COALESCE(SUM(0), 0) as emails_deferred, -- Add this column later if needed
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

-- ============================================
-- REAL-TIME UPDATE TRIGGERS
-- ============================================

-- Function to update campaign metrics when events are inserted
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
DECLARE
  event_date DATE;
  campaign_text TEXT;
  user_text TEXT;
BEGIN
  -- Extract date from timestamp
  event_date := NEW.timestamp::DATE;
  campaign_text := NEW.campaign_id;
  user_text := NEW.user_id;
  
  -- Insert or update campaign metrics
  INSERT INTO campaign_metrics (user_id, campaign_id, date)
  VALUES (user_text, campaign_text, event_date)
  ON CONFLICT DO NOTHING; -- We'll handle this with a unique constraint later
  
  -- Update specific metrics based on event type
  CASE NEW.event_type
    WHEN 'processed' THEN
      UPDATE campaign_metrics 
      SET emails_sent = emails_sent + 1, updated_at = NOW()
      WHERE user_id = user_text 
        AND (campaign_id = campaign_text OR (campaign_id IS NULL AND campaign_text IS NULL)) 
        AND date = event_date;
      
    WHEN 'delivered' THEN
      UPDATE campaign_metrics 
      SET emails_delivered = emails_delivered + 1, updated_at = NOW()
      WHERE user_id = user_text 
        AND (campaign_id = campaign_text OR (campaign_id IS NULL AND campaign_text IS NULL)) 
        AND date = event_date;
      
    WHEN 'bounce' THEN
      UPDATE campaign_metrics 
      SET emails_bounced = emails_bounced + 1, updated_at = NOW()
      WHERE user_id = user_text 
        AND (campaign_id = campaign_text OR (campaign_id IS NULL AND campaign_text IS NULL)) 
        AND date = event_date;
      
    WHEN 'blocked' THEN
      UPDATE campaign_metrics 
      SET emails_blocked = emails_blocked + 1, updated_at = NOW()
      WHERE user_id = user_text 
        AND (campaign_id = campaign_text OR (campaign_id IS NULL AND campaign_text IS NULL)) 
        AND date = event_date;
      
    WHEN 'open' THEN
      UPDATE campaign_metrics 
      SET total_opens = total_opens + 1, updated_at = NOW()
      WHERE user_id = user_text 
        AND (campaign_id = campaign_text OR (campaign_id IS NULL AND campaign_text IS NULL)) 
        AND date = event_date;
      
    WHEN 'click' THEN
      UPDATE campaign_metrics 
      SET total_clicks = total_clicks + 1, updated_at = NOW()
      WHERE user_id = user_text 
        AND (campaign_id = campaign_text OR (campaign_id IS NULL AND campaign_text IS NULL)) 
        AND date = event_date;
      
    WHEN 'unsubscribe', 'group_unsubscribe' THEN
      UPDATE campaign_metrics 
      SET unsubscribes = unsubscribes + 1, updated_at = NOW()
      WHERE user_id = user_text 
        AND (campaign_id = campaign_text OR (campaign_id IS NULL AND campaign_text IS NULL)) 
        AND date = event_date;
      
    WHEN 'spam_report' THEN
      UPDATE campaign_metrics 
      SET spam_reports = spam_reports + 1, updated_at = NOW()
      WHERE user_id = user_text 
        AND (campaign_id = campaign_text OR (campaign_id IS NULL AND campaign_text IS NULL)) 
        AND date = event_date;
  END CASE;
  
  -- Recalculate rates
  UPDATE campaign_metrics 
  SET 
    delivery_rate = CASE 
      WHEN emails_sent > 0 THEN ROUND((emails_delivered::DECIMAL / emails_sent::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    bounce_rate = CASE 
      WHEN emails_sent > 0 THEN ROUND((emails_bounced::DECIMAL / emails_sent::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    open_rate = CASE 
      WHEN emails_delivered > 0 THEN ROUND((unique_opens::DECIMAL / emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    click_rate = CASE 
      WHEN emails_delivered > 0 THEN ROUND((unique_clicks::DECIMAL / emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    unsubscribe_rate = CASE 
      WHEN emails_delivered > 0 THEN ROUND((unsubscribes::DECIMAL / emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    updated_at = NOW()
  WHERE user_id = user_text 
    AND (campaign_id = campaign_text OR (campaign_id IS NULL AND campaign_text IS NULL)) 
    AND date = event_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update email tracking status
CREATE OR REPLACE FUNCTION update_email_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update email tracking record
  INSERT INTO email_tracking (
    user_id, campaign_id, email, sg_message_id, status, sent_at
  )
  VALUES (
    NEW.user_id, NEW.campaign_id, NEW.email, NEW.sg_message_id, 
    NEW.event_type, NEW.timestamp
  )
  ON CONFLICT (sg_message_id, email) DO UPDATE SET
    status = CASE
      -- Priority order: spam > unsubscribed > clicked > opened > delivered > sent
      WHEN NEW.event_type IN ('spam_report') THEN 'spam'
      WHEN NEW.event_type IN ('unsubscribe', 'group_unsubscribe') THEN 'unsubscribed'
      WHEN NEW.event_type = 'click' AND email_tracking.status NOT IN ('spam', 'unsubscribed') THEN 'clicked'
      WHEN NEW.event_type = 'open' AND email_tracking.status NOT IN ('spam', 'unsubscribed', 'clicked') THEN 'opened'
      WHEN NEW.event_type = 'delivered' AND email_tracking.status NOT IN ('spam', 'unsubscribed', 'clicked', 'opened') THEN 'delivered'
      WHEN NEW.event_type IN ('bounce', 'blocked') THEN NEW.event_type
      ELSE email_tracking.status
    END,
    delivered_at = CASE WHEN NEW.event_type = 'delivered' THEN NEW.timestamp ELSE email_tracking.delivered_at END,
    first_opened_at = CASE WHEN NEW.event_type = 'open' AND email_tracking.first_opened_at IS NULL THEN NEW.timestamp ELSE email_tracking.first_opened_at END,
    first_clicked_at = CASE WHEN NEW.event_type = 'click' AND email_tracking.first_clicked_at IS NULL THEN NEW.timestamp ELSE email_tracking.first_clicked_at END,
    open_count = CASE WHEN NEW.event_type = 'open' THEN email_tracking.open_count + 1 ELSE email_tracking.open_count END,
    click_count = CASE WHEN NEW.event_type = 'click' THEN email_tracking.click_count + 1 ELSE email_tracking.click_count END,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Create trigger to update metrics when events are inserted
DROP TRIGGER IF EXISTS trigger_update_campaign_metrics ON sendgrid_events;
CREATE TRIGGER trigger_update_campaign_metrics
  AFTER INSERT ON sendgrid_events
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_metrics();

-- Create trigger to update email tracking
DROP TRIGGER IF EXISTS trigger_update_email_tracking ON sendgrid_events;
CREATE TRIGGER trigger_update_email_tracking
  AFTER INSERT ON sendgrid_events
  FOR EACH ROW
  EXECUTE FUNCTION update_email_tracking();

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to recalculate unique opens/clicks (run periodically)
CREATE OR REPLACE FUNCTION recalculate_unique_metrics(campaign_text TEXT, metric_date DATE)
RETURNS VOID AS $$
DECLARE
  unique_opens_count INTEGER;
  unique_clicks_count INTEGER;
  target_user TEXT;
BEGIN
  -- Get the user_id for this campaign
  SELECT user_id INTO target_user 
  FROM campaign_metrics 
  WHERE campaign_id = campaign_text AND date = metric_date 
  LIMIT 1;
  
  IF target_user IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate unique opens for the date
  SELECT COUNT(DISTINCT email) INTO unique_opens_count
  FROM email_tracking 
  WHERE campaign_id = campaign_text 
    AND user_id = target_user
    AND first_opened_at::DATE = metric_date;
  
  -- Calculate unique clicks for the date
  SELECT COUNT(DISTINCT email) INTO unique_clicks_count
  FROM email_tracking 
  WHERE campaign_id = campaign_text 
    AND user_id = target_user
    AND first_clicked_at::DATE = metric_date;
  
  -- Update campaign metrics
  UPDATE campaign_metrics 
  SET 
    unique_opens = unique_opens_count,
    unique_clicks = unique_clicks_count,
    updated_at = NOW()
  WHERE campaign_id = campaign_text AND date = metric_date AND user_id = target_user;
  
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'SendGrid functions and triggers added successfully! 🎉' as status;
SELECT 'Your analytics will now update automatically when webhook events arrive' as message;