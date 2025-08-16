-- Sender-Specific Metrics Table for Health Score Calculation
-- This table aggregates email events per sender account for health scoring

-- ============================================
-- SENDER METRICS AGGREGATION TABLE
-- ============================================

-- Table for sender-level aggregated metrics (real-time from webhook events)
CREATE TABLE IF NOT EXISTS sender_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  sender_email TEXT NOT NULL, -- The actual sending email address
  
  -- Date for daily aggregations
  date DATE NOT NULL,
  
  -- Core delivery metrics
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_blocked INTEGER DEFAULT 0,
  emails_deferred INTEGER DEFAULT 0,
  
  -- Engagement metrics
  unique_opens INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  
  -- Negative metrics
  unsubscribes INTEGER DEFAULT 0,
  spam_reports INTEGER DEFAULT 0,
  
  -- Calculated rates (stored for performance)
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  reply_rate DECIMAL(5,2) DEFAULT 0.00,
  unsubscribe_rate DECIMAL(5,2) DEFAULT 0.00,
  spam_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Health score components (calculated from metrics)
  warmup_score INTEGER DEFAULT 0,
  deliverability_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  volume_score INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  overall_health_score INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique metrics per sender per date
  UNIQUE(user_id, sender_email, date)
);

-- ============================================
-- SENDER SUMMARY METRICS TABLE (ROLLING)
-- ============================================

-- Table for sender-level rolling metrics (last 30/90 days for health calculation)
CREATE TABLE IF NOT EXISTS sender_summary_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_account_id TEXT, -- Reference to sender_accounts.id if available
  
  -- Rolling periods
  period_days INTEGER NOT NULL CHECK (period_days IN (7, 30, 90)),
  
  -- Core delivery metrics
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_blocked INTEGER DEFAULT 0,
  
  -- Engagement metrics
  unique_opens INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  unique_replies INTEGER DEFAULT 0,
  
  -- Negative metrics
  unsubscribes INTEGER DEFAULT 0,
  spam_reports INTEGER DEFAULT 0,
  
  -- Calculated rates
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  reply_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Health score breakdown
  warmup_score INTEGER DEFAULT 0,
  deliverability_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  volume_score INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  overall_health_score INTEGER DEFAULT 0,
  
  -- Account metadata for health calculation
  account_age_days INTEGER DEFAULT 0,
  warmup_status TEXT DEFAULT 'unknown',
  sending_days_active INTEGER DEFAULT 0,
  avg_daily_volume DECIMAL(8,2) DEFAULT 0.00,
  
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique metrics per sender per period
  UNIQUE(user_id, sender_email, period_days)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Sender metrics indexes
CREATE INDEX IF NOT EXISTS idx_sender_metrics_user_id ON sender_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_sender_metrics_sender_email ON sender_metrics(sender_email);
CREATE INDEX IF NOT EXISTS idx_sender_metrics_date ON sender_metrics(date);
CREATE INDEX IF NOT EXISTS idx_sender_metrics_user_sender ON sender_metrics(user_id, sender_email);

-- Sender summary metrics indexes
CREATE INDEX IF NOT EXISTS idx_sender_summary_user_id ON sender_summary_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_sender_summary_sender_email ON sender_summary_metrics(sender_email);
CREATE INDEX IF NOT EXISTS idx_sender_summary_period ON sender_summary_metrics(period_days);
CREATE INDEX IF NOT EXISTS idx_sender_summary_user_sender ON sender_summary_metrics(user_id, sender_email);
CREATE INDEX IF NOT EXISTS idx_sender_summary_account_id ON sender_summary_metrics(sender_account_id);

-- ============================================
-- FUNCTIONS FOR UPDATING SENDER METRICS
-- ============================================

-- Function to update sender-specific metrics when events are inserted
CREATE OR REPLACE FUNCTION update_sender_metrics()
RETURNS TRIGGER AS $$
DECLARE
  event_date DATE;
  user_text TEXT;
  sender_text TEXT;
BEGIN
  -- Extract date from timestamp and get sender email
  event_date := NEW.timestamp::DATE;
  user_text := NEW.user_id;
  
  -- Extract sender email from event data or use a default extraction method
  -- This assumes the sender email is in the 'from' field of event_data JSONB
  sender_text := COALESCE(NEW.event_data->>'from', NEW.email);
  
  -- Skip if we can't determine sender
  IF sender_text IS NULL OR sender_text = '' THEN
    RETURN NEW;
  END IF;
  
  -- Insert or update sender metrics for this date
  INSERT INTO sender_metrics (user_id, sender_email, date)
  VALUES (user_text, sender_text, event_date)
  ON CONFLICT (user_id, sender_email, date) DO NOTHING;
  
  -- Update specific metrics based on event type
  CASE NEW.event_type
    WHEN 'processed' THEN
      UPDATE sender_metrics 
      SET emails_sent = emails_sent + 1, updated_at = NOW()
      WHERE user_id = user_text AND sender_email = sender_text AND date = event_date;
      
    WHEN 'delivered' THEN
      UPDATE sender_metrics 
      SET emails_delivered = emails_delivered + 1, updated_at = NOW()
      WHERE user_id = user_text AND sender_email = sender_text AND date = event_date;
      
    WHEN 'bounce' THEN
      UPDATE sender_metrics 
      SET emails_bounced = emails_bounced + 1, updated_at = NOW()
      WHERE user_id = user_text AND sender_email = sender_text AND date = event_date;
      
    WHEN 'blocked' THEN
      UPDATE sender_metrics 
      SET emails_blocked = emails_blocked + 1, updated_at = NOW()
      WHERE user_id = user_text AND sender_email = sender_text AND date = event_date;
      
    WHEN 'deferred' THEN
      UPDATE sender_metrics 
      SET emails_deferred = emails_deferred + 1, updated_at = NOW()
      WHERE user_id = user_text AND sender_email = sender_text AND date = event_date;
      
    WHEN 'open' THEN
      UPDATE sender_metrics 
      SET total_opens = total_opens + 1, updated_at = NOW()
      WHERE user_id = user_text AND sender_email = sender_text AND date = event_date;
      
    WHEN 'click' THEN
      UPDATE sender_metrics 
      SET total_clicks = total_clicks + 1, updated_at = NOW()
      WHERE user_id = user_text AND sender_email = sender_text AND date = event_date;
      
    WHEN 'unsubscribe', 'group_unsubscribe' THEN
      UPDATE sender_metrics 
      SET unsubscribes = unsubscribes + 1, updated_at = NOW()
      WHERE user_id = user_text AND sender_email = sender_text AND date = event_date;
      
    WHEN 'spam_report' THEN
      UPDATE sender_metrics 
      SET spam_reports = spam_reports + 1, updated_at = NOW()
      WHERE user_id = user_text AND sender_email = sender_text AND date = event_date;
  END CASE;
  
  -- Recalculate rates for this sender
  UPDATE sender_metrics 
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
    spam_rate = CASE 
      WHEN emails_delivered > 0 THEN ROUND((spam_reports::DECIMAL / emails_delivered::DECIMAL) * 100, 2)
      ELSE 0 
    END,
    updated_at = NOW()
  WHERE user_id = user_text AND sender_email = sender_text AND date = event_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update sender metrics when events are inserted
DROP TRIGGER IF EXISTS trigger_update_sender_metrics ON sendgrid_events;
CREATE TRIGGER trigger_update_sender_metrics
  AFTER INSERT ON sendgrid_events
  FOR EACH ROW
  EXECUTE FUNCTION update_sender_metrics();

-- ============================================
-- FUNCTION TO CALCULATE ROLLING SENDER METRICS
-- ============================================

-- Function to calculate and update rolling sender metrics
CREATE OR REPLACE FUNCTION calculate_sender_summary_metrics(
  p_user_id TEXT,
  p_sender_email TEXT DEFAULT NULL,
  p_period_days INTEGER DEFAULT 30
)
RETURNS VOID AS $$
DECLARE
  sender_record RECORD;
  account_created_at TIMESTAMP WITH TIME ZONE;
  account_age INTEGER;
  warmup_status_calc TEXT;
BEGIN
  -- If specific sender provided, process only that sender
  IF p_sender_email IS NOT NULL THEN
    -- Get account creation date from sender_accounts if available
    SELECT created_at INTO account_created_at
    FROM sender_accounts 
    WHERE email = p_sender_email AND user_id = p_user_id
    LIMIT 1;
    
    -- Calculate account age
    account_age := COALESCE(EXTRACT(DAYS FROM (NOW() - account_created_at))::INTEGER, 0);
    
    -- Determine warmup status based on account age and activity
    IF account_age >= 30 THEN
      warmup_status_calc := 'completed';
    ELSIF account_age >= 7 THEN
      warmup_status_calc := 'warming_up';
    ELSE
      warmup_status_calc := 'inactive';
    END IF;
    
    -- Calculate and upsert summary metrics for this sender
    INSERT INTO sender_summary_metrics (
      user_id, sender_email, sender_account_id, period_days,
      emails_sent, emails_delivered, emails_bounced, emails_blocked,
      unique_opens, total_opens, unique_clicks, total_clicks,
      unsubscribes, spam_reports,
      delivery_rate, bounce_rate, open_rate, click_rate,
      account_age_days, warmup_status, sending_days_active, avg_daily_volume
    )
    SELECT 
      p_user_id,
      p_sender_email,
      (SELECT id FROM sender_accounts WHERE email = p_sender_email AND user_id = p_user_id LIMIT 1),
      p_period_days,
      COALESCE(SUM(emails_sent), 0) as total_sent,
      COALESCE(SUM(emails_delivered), 0) as total_delivered,
      COALESCE(SUM(emails_bounced), 0) as total_bounced,
      COALESCE(SUM(emails_blocked), 0) as total_blocked,
      COALESCE(SUM(unique_opens), 0) as total_unique_opens,
      COALESCE(SUM(total_opens), 0) as total_all_opens,
      COALESCE(SUM(unique_clicks), 0) as total_unique_clicks,
      COALESCE(SUM(total_clicks), 0) as total_all_clicks,
      COALESCE(SUM(unsubscribes), 0) as total_unsubscribes,
      COALESCE(SUM(spam_reports), 0) as total_spam_reports,
      -- Calculate rates
      CASE 
        WHEN SUM(emails_sent) > 0 THEN ROUND((SUM(emails_delivered)::DECIMAL / SUM(emails_sent)::DECIMAL) * 100, 2)
        ELSE 0 
      END as calc_delivery_rate,
      CASE 
        WHEN SUM(emails_sent) > 0 THEN ROUND((SUM(emails_bounced)::DECIMAL / SUM(emails_sent)::DECIMAL) * 100, 2)
        ELSE 0 
      END as calc_bounce_rate,
      CASE 
        WHEN SUM(emails_delivered) > 0 THEN ROUND((SUM(unique_opens)::DECIMAL / SUM(emails_delivered)::DECIMAL) * 100, 2)
        ELSE 0 
      END as calc_open_rate,
      CASE 
        WHEN SUM(emails_delivered) > 0 THEN ROUND((SUM(unique_clicks)::DECIMAL / SUM(emails_delivered)::DECIMAL) * 100, 2)
        ELSE 0 
      END as calc_click_rate,
      account_age,
      warmup_status_calc,
      COUNT(DISTINCT date) as active_days,
      CASE 
        WHEN COUNT(DISTINCT date) > 0 THEN ROUND(SUM(emails_sent)::DECIMAL / COUNT(DISTINCT date)::DECIMAL, 2)
        ELSE 0 
      END as daily_volume_avg
    FROM sender_metrics
    WHERE user_id = p_user_id 
      AND sender_email = p_sender_email 
      AND date >= CURRENT_DATE - INTERVAL '%s days' % p_period_days
    ON CONFLICT (user_id, sender_email, period_days) DO UPDATE SET
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
      delivery_rate = EXCLUDED.delivery_rate,
      bounce_rate = EXCLUDED.bounce_rate,
      open_rate = EXCLUDED.open_rate,
      click_rate = EXCLUDED.click_rate,
      account_age_days = EXCLUDED.account_age_days,
      warmup_status = EXCLUDED.warmup_status,
      sending_days_active = EXCLUDED.sending_days_active,
      avg_daily_volume = EXCLUDED.avg_daily_volume,
      last_calculated = NOW(),
      updated_at = NOW();
      
  ELSE
    -- Process all senders for the user
    FOR sender_record IN 
      SELECT DISTINCT sender_email 
      FROM sender_metrics 
      WHERE user_id = p_user_id
    LOOP
      PERFORM calculate_sender_summary_metrics(p_user_id, sender_record.sender_email, p_period_days);
    END LOOP;
  END IF;
  
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE sender_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sender_summary_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all operations" ON sender_metrics FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sender_summary_metrics FOR ALL USING (true);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'Sender metrics tables created successfully! 📊' as status;
SELECT 'Tables: sender_metrics, sender_summary_metrics' as tables_created;
SELECT 'Real-time sender health tracking now available' as feature;