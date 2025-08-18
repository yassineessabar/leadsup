-- Additional database functions for warming system
-- Run this after the main warming schema

-- Function to safely increment warmup campaign counters
CREATE OR REPLACE FUNCTION increment_warmup_counter(
  warmup_id UUID,
  counter_field TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Use dynamic SQL to increment the specified counter
  IF counter_field = 'emails_sent_today' THEN
    UPDATE warmup_campaigns 
    SET emails_sent_today = emails_sent_today + 1,
        updated_at = NOW()
    WHERE id = warmup_id;
  ELSIF counter_field = 'opens_today' THEN
    UPDATE warmup_campaigns 
    SET opens_today = opens_today + 1,
        updated_at = NOW()
    WHERE id = warmup_id;
  ELSIF counter_field = 'replies_today' THEN
    UPDATE warmup_campaigns 
    SET replies_today = replies_today + 1,
        updated_at = NOW()
    WHERE id = warmup_id;
  ELSIF counter_field = 'clicks_today' THEN
    UPDATE warmup_campaigns 
    SET clicks_today = clicks_today + 1,
        updated_at = NOW()
    WHERE id = warmup_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely increment recipient email counters
CREATE OR REPLACE FUNCTION increment_recipient_counter(
  recipient_email TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE warmup_recipients 
  SET emails_received_today = emails_received_today + 1,
      updated_at = NOW()
  WHERE email = recipient_email;
END;
$$ LANGUAGE plpgsql;

-- Function to get warming campaign progress
CREATE OR REPLACE FUNCTION get_warming_progress(
  p_campaign_id UUID
)
RETURNS TABLE(
  sender_email TEXT,
  phase INTEGER,
  day_in_phase INTEGER,
  total_days INTEGER,
  daily_target INTEGER,
  emails_sent_today INTEGER,
  opens_today INTEGER,
  replies_today INTEGER,
  current_health_score INTEGER,
  target_health_score INTEGER,
  status TEXT,
  progress_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wc.sender_email::TEXT,
    wc.phase,
    wc.day_in_phase,
    wc.total_warming_days,
    wc.daily_target,
    wc.emails_sent_today,
    wc.opens_today,
    wc.replies_today,
    wc.current_health_score,
    wc.target_health_score,
    wc.status::TEXT,
    CASE 
      WHEN wc.target_health_score > 0 THEN
        ROUND((wc.current_health_score::DECIMAL / wc.target_health_score::DECIMAL) * 100, 2)
      ELSE 0
    END as progress_percentage
  FROM warmup_campaigns wc
  WHERE wc.campaign_id = p_campaign_id
  ORDER BY wc.sender_email;
END;
$$ LANGUAGE plpgsql;

-- Function to get warming daily statistics
CREATE OR REPLACE FUNCTION get_warming_daily_stats(
  p_warmup_campaign_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  date DATE,
  emails_sent INTEGER,
  emails_opened INTEGER,
  emails_replied INTEGER,
  open_rate DECIMAL,
  reply_rate DECIMAL,
  health_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wds.date,
    wds.emails_sent,
    wds.emails_opened,
    wds.emails_replied,
    wds.open_rate,
    wds.reply_rate,
    wds.health_score
  FROM warmup_daily_stats wds
  WHERE wds.warmup_campaign_id = p_warmup_campaign_id
    AND wds.date >= CURRENT_DATE - INTERVAL '%s days' % p_days_back
  ORDER BY wds.date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate and update daily statistics
CREATE OR REPLACE FUNCTION calculate_warming_daily_stats()
RETURNS VOID AS $$
DECLARE
  warmup_record RECORD;
  yesterday DATE;
  stats_record RECORD;
BEGIN
  yesterday := CURRENT_DATE - INTERVAL '1 day';
  
  -- Loop through all active warming campaigns
  FOR warmup_record IN 
    SELECT id, sender_email FROM warmup_campaigns WHERE status = 'active'
  LOOP
    -- Calculate yesterday's statistics
    SELECT 
      COUNT(*) FILTER (WHERE activity_type = 'send') as emails_sent,
      COUNT(*) FILTER (WHERE activity_type = 'open') as emails_opened,
      COUNT(*) FILTER (WHERE activity_type = 'reply') as emails_replied,
      COUNT(*) FILTER (WHERE activity_type = 'click') as emails_clicked
    INTO stats_record
    FROM warmup_activities 
    WHERE warmup_campaign_id = warmup_record.id
      AND DATE(executed_at) = yesterday
      AND success = true;
    
    -- Calculate rates
    INSERT INTO warmup_daily_stats (
      warmup_campaign_id,
      date,
      emails_sent,
      emails_opened,
      emails_replied,
      emails_clicked,
      open_rate,
      reply_rate,
      click_rate
    ) VALUES (
      warmup_record.id,
      yesterday,
      COALESCE(stats_record.emails_sent, 0),
      COALESCE(stats_record.emails_opened, 0),
      COALESCE(stats_record.emails_replied, 0),
      COALESCE(stats_record.emails_clicked, 0),
      CASE 
        WHEN COALESCE(stats_record.emails_sent, 0) > 0 THEN
          ROUND((COALESCE(stats_record.emails_opened, 0)::DECIMAL / stats_record.emails_sent::DECIMAL) * 100, 2)
        ELSE 0
      END,
      CASE 
        WHEN COALESCE(stats_record.emails_sent, 0) > 0 THEN
          ROUND((COALESCE(stats_record.emails_replied, 0)::DECIMAL / stats_record.emails_sent::DECIMAL) * 100, 2)
        ELSE 0
      END,
      CASE 
        WHEN COALESCE(stats_record.emails_opened, 0) > 0 THEN
          ROUND((COALESCE(stats_record.emails_clicked, 0)::DECIMAL / stats_record.emails_opened::DECIMAL) * 100, 2)
        ELSE 0
      END
    )
    ON CONFLICT (warmup_campaign_id, date) 
    DO UPDATE SET
      emails_sent = EXCLUDED.emails_sent,
      emails_opened = EXCLUDED.emails_opened,
      emails_replied = EXCLUDED.emails_replied,
      emails_clicked = EXCLUDED.emails_clicked,
      open_rate = EXCLUDED.open_rate,
      reply_rate = EXCLUDED.reply_rate,
      click_rate = EXCLUDED.click_rate,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_warmup_counter TO authenticated;
GRANT EXECUTE ON FUNCTION increment_recipient_counter TO authenticated;
GRANT EXECUTE ON FUNCTION get_warming_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_warming_daily_stats TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_warming_daily_stats TO authenticated;

-- Create a scheduled job to calculate daily stats (if using pg_cron extension)
-- SELECT cron.schedule('calculate-warming-stats', '0 1 * * *', 'SELECT calculate_warming_daily_stats();');

SELECT 'Warming system functions created successfully!' as result;