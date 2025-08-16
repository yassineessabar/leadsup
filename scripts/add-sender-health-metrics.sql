-- Health Score Tracking Tables for Sender Accounts
-- This script adds tables to track email metrics for health score calculation

-- ============================================
-- SENDER HEALTH METRICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS sender_health_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_account_id UUID NOT NULL REFERENCES sender_accounts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Email Volume Metrics
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  emails_unsubscribed INTEGER DEFAULT 0,
  emails_marked_spam INTEGER DEFAULT 0,
  
  -- Calculated Rates (stored for performance)
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  open_rate DECIMAL(5,2) DEFAULT 0,
  click_rate DECIMAL(5,2) DEFAULT 0,
  reply_rate DECIMAL(5,2) DEFAULT 0,
  spam_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Health Score Components
  warmup_score INTEGER DEFAULT 0,
  deliverability_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  volume_score INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  overall_health_score INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(sender_account_id, metric_date)
);

-- ============================================
-- SENDER WARMUP TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS sender_warmup_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_account_id UUID NOT NULL REFERENCES sender_accounts(id) ON DELETE CASCADE,
  
  -- Warmup Configuration
  warmup_status TEXT DEFAULT 'inactive' CHECK (warmup_status IN ('inactive', 'active', 'paused', 'completed', 'error')),
  warmup_started_at TIMESTAMP WITH TIME ZONE,
  warmup_completed_at TIMESTAMP WITH TIME ZONE,
  target_daily_volume INTEGER DEFAULT 50,
  
  -- Daily Progress Tracking
  current_day INTEGER DEFAULT 0,
  total_warmup_days INTEGER DEFAULT 30,
  current_daily_sent INTEGER DEFAULT 0,
  current_daily_limit INTEGER DEFAULT 5,
  
  -- Warmup Strategy
  warmup_strategy JSONB DEFAULT '{
    "week1": {"daily_limit": 5, "increment": 2},
    "week2": {"daily_limit": 15, "increment": 3},
    "week3": {"daily_limit": 25, "increment": 5},
    "week4": {"daily_limit": 40, "increment": 10}
  }'::jsonb,
  
  -- Performance Tracking
  total_warmup_sent INTEGER DEFAULT 0,
  total_warmup_bounced INTEGER DEFAULT 0,
  total_warmup_opened INTEGER DEFAULT 0,
  avg_warmup_open_rate DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(sender_account_id)
);

-- ============================================
-- EMAIL SENDING LOGS TABLE (for tracking actual sends)
-- ============================================

CREATE TABLE IF NOT EXISTS email_sending_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_account_id UUID NOT NULL REFERENCES sender_accounts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- Email Details
  recipient_email TEXT NOT NULL,
  subject TEXT,
  message_id TEXT,
  
  -- Sending Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'opened', 'clicked', 'replied', 'unsubscribed', 'spam')),
  bounce_reason TEXT,
  error_message TEXT,
  
  -- Timing
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  email_provider TEXT, -- gmail, outlook, etc.
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_email_logs_sender_date ON email_sending_logs(sender_account_id, sent_at),
  INDEX idx_email_logs_status ON email_sending_logs(status),
  INDEX idx_email_logs_campaign ON email_sending_logs(campaign_id)
);

-- ============================================
-- HEALTH SCORE CALCULATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION calculate_sender_health_score(
  sender_id UUID,
  date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  date_to DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
  health_score INTEGER := 0;
  warmup_score INTEGER := 0;
  deliverability_score INTEGER := 0;
  engagement_score INTEGER := 0;
  volume_score INTEGER := 0;
  reputation_score INTEGER := 0;
  
  -- Metrics
  total_sent INTEGER := 0;
  total_bounced INTEGER := 0;
  total_opened INTEGER := 0;
  total_clicked INTEGER := 0;
  total_replied INTEGER := 0;
  bounce_rate DECIMAL := 0;
  open_rate DECIMAL := 0;
  click_rate DECIMAL := 0;
  reply_rate DECIMAL := 0;
  account_age_days INTEGER := 0;
  warmup_status TEXT := 'inactive';
  warmup_days INTEGER := 0;
BEGIN
  -- Get basic account info
  SELECT 
    EXTRACT(DAYS FROM (CURRENT_DATE - created_at::date)),
    COALESCE(warmup_status, 'inactive')
  INTO account_age_days, warmup_status
  FROM sender_accounts sa
  LEFT JOIN sender_warmup_progress swp ON sa.id = swp.sender_account_id
  WHERE sa.id = sender_id;
  
  -- Get email metrics from logs
  SELECT 
    COUNT(*) FILTER (WHERE status = 'sent'),
    COUNT(*) FILTER (WHERE status = 'bounced'),
    COUNT(*) FILTER (WHERE status = 'opened'),
    COUNT(*) FILTER (WHERE status = 'clicked'),
    COUNT(*) FILTER (WHERE status = 'replied')
  INTO total_sent, total_bounced, total_opened, total_clicked, total_replied
  FROM email_sending_logs
  WHERE sender_account_id = sender_id
    AND sent_at::date BETWEEN date_from AND date_to;
  
  -- Calculate rates
  IF total_sent > 0 THEN
    bounce_rate := (total_bounced::DECIMAL / total_sent) * 100;
    open_rate := (total_opened::DECIMAL / total_sent) * 100;
    click_rate := (total_clicked::DECIMAL / total_sent) * 100;
    reply_rate := (total_replied::DECIMAL / total_sent) * 100;
  END IF;
  
  -- 1. Warmup Score (25% weight)
  CASE warmup_status
    WHEN 'completed' THEN warmup_score := 100;
    WHEN 'active' THEN warmup_score := LEAST(100, (warmup_days / 30.0) * 100);
    WHEN 'paused' THEN warmup_score := 60;
    WHEN 'error' THEN warmup_score := 20;
    ELSE warmup_score := 50;
  END CASE;
  
  -- 2. Deliverability Score (30% weight)
  IF bounce_rate < 1 THEN deliverability_score := 100;
  ELSIF bounce_rate < 2 THEN deliverability_score := 90;
  ELSIF bounce_rate < 5 THEN deliverability_score := 75;
  ELSIF bounce_rate < 10 THEN deliverability_score := 50;
  ELSE deliverability_score := 25;
  END IF;
  
  -- 3. Engagement Score (25% weight)
  IF total_sent > 0 THEN
    engagement_score := LEAST(100, 
      (CASE WHEN open_rate > 25 THEN 40 WHEN open_rate > 20 THEN 32 WHEN open_rate > 15 THEN 24 WHEN open_rate > 10 THEN 16 ELSE 8 END) +
      (CASE WHEN click_rate > 5 THEN 30 WHEN click_rate > 3 THEN 24 WHEN click_rate > 2 THEN 18 WHEN click_rate > 1 THEN 12 ELSE 6 END) +
      (CASE WHEN reply_rate > 3 THEN 30 WHEN reply_rate > 2 THEN 24 WHEN reply_rate > 1 THEN 18 WHEN reply_rate > 0.5 THEN 12 ELSE 6 END)
    );
  ELSE
    engagement_score := 50;
  END IF;
  
  -- 4. Volume Score (10% weight)
  IF total_sent = 0 THEN volume_score := 30;
  ELSIF total_sent < 10 THEN volume_score := 60;
  ELSIF total_sent < 50 THEN volume_score := 85;
  ELSIF total_sent < 100 THEN volume_score := 100;
  ELSE volume_score := 75;
  END IF;
  
  -- 5. Reputation Score (10% weight)
  IF account_age_days > 180 THEN reputation_score := 100;
  ELSIF account_age_days > 90 THEN reputation_score := 85;
  ELSIF account_age_days > 30 THEN reputation_score := 70;
  ELSIF account_age_days > 7 THEN reputation_score := 55;
  ELSE reputation_score := 40;
  END IF;
  
  -- Calculate weighted final score
  health_score := ROUND(
    (warmup_score * 0.25) +
    (deliverability_score * 0.30) +
    (engagement_score * 0.25) +
    (volume_score * 0.10) +
    (reputation_score * 0.10)
  );
  
  -- Update sender account with calculated score
  UPDATE sender_accounts 
  SET 
    health_score = health_score,
    updated_at = NOW()
  WHERE id = sender_id;
  
  -- Store detailed metrics
  INSERT INTO sender_health_metrics (
    sender_account_id, metric_date, emails_sent, emails_bounced, emails_opened, 
    emails_clicked, emails_replied, bounce_rate, open_rate, click_rate, reply_rate,
    warmup_score, deliverability_score, engagement_score, volume_score, 
    reputation_score, overall_health_score
  ) VALUES (
    sender_id, CURRENT_DATE, total_sent, total_bounced, total_opened,
    total_clicked, total_replied, bounce_rate, open_rate, click_rate, reply_rate,
    warmup_score, deliverability_score, engagement_score, volume_score,
    reputation_score, health_score
  )
  ON CONFLICT (sender_account_id, metric_date) 
  DO UPDATE SET
    emails_sent = EXCLUDED.emails_sent,
    emails_bounced = EXCLUDED.emails_bounced,
    emails_opened = EXCLUDED.emails_opened,
    emails_clicked = EXCLUDED.emails_clicked,
    emails_replied = EXCLUDED.emails_replied,
    bounce_rate = EXCLUDED.bounce_rate,
    open_rate = EXCLUDED.open_rate,
    click_rate = EXCLUDED.click_rate,
    reply_rate = EXCLUDED.reply_rate,
    warmup_score = EXCLUDED.warmup_score,
    deliverability_score = EXCLUDED.deliverability_score,
    engagement_score = EXCLUDED.engagement_score,
    volume_score = EXCLUDED.volume_score,
    reputation_score = EXCLUDED.reputation_score,
    overall_health_score = EXCLUDED.overall_health_score,
    updated_at = NOW();
  
  RETURN health_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sender_health_metrics_sender_date 
  ON sender_health_metrics(sender_account_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_sender_warmup_status 
  ON sender_warmup_progress(warmup_status);

CREATE INDEX IF NOT EXISTS idx_sender_health_score 
  ON sender_accounts(health_score DESC);

-- ============================================
-- SAMPLE DATA INSERTION (for testing)
-- ============================================

-- Insert sample warmup progress for existing senders
INSERT INTO sender_warmup_progress (sender_account_id, warmup_status, warmup_started_at, current_day, total_warmup_days)
SELECT 
  id,
  CASE 
    WHEN warmup_status = 'completed' THEN 'completed'
    WHEN warmup_status = 'warming_up' THEN 'active'
    ELSE 'inactive'
  END,
  created_at,
  LEAST(30, EXTRACT(DAYS FROM (NOW() - created_at))),
  30
FROM sender_accounts
WHERE NOT EXISTS (
  SELECT 1 FROM sender_warmup_progress WHERE sender_account_id = sender_accounts.id
);

COMMENT ON TABLE sender_health_metrics IS 'Daily metrics for calculating sender account health scores';
COMMENT ON TABLE sender_warmup_progress IS 'Tracks the warmup progress and strategy for sender accounts';
COMMENT ON TABLE email_sending_logs IS 'Logs all email sending activity for health score calculation';
COMMENT ON FUNCTION calculate_sender_health_score IS 'Calculates health score based on warmup, deliverability, engagement, volume, and reputation metrics';