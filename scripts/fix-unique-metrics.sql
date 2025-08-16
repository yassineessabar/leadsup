-- Fix unique metrics calculation
-- The triggers are updating total_opens and total_clicks but not unique_opens and unique_clicks

-- Function to recalculate unique metrics for a specific campaign and date
CREATE OR REPLACE FUNCTION recalculate_unique_metrics_for_date(
  p_campaign_id TEXT,
  p_user_id TEXT,
  p_date DATE
)
RETURNS VOID AS $$
DECLARE
  unique_opens_count INTEGER;
  unique_clicks_count INTEGER;
BEGIN
  -- Calculate unique opens for the date
  SELECT COUNT(DISTINCT email) INTO unique_opens_count
  FROM email_tracking 
  WHERE campaign_id = p_campaign_id 
    AND user_id = p_user_id
    AND first_opened_at IS NOT NULL
    AND first_opened_at::DATE = p_date;
  
  -- Calculate unique clicks for the date
  SELECT COUNT(DISTINCT email) INTO unique_clicks_count
  FROM email_tracking 
  WHERE campaign_id = p_campaign_id 
    AND user_id = p_user_id
    AND first_clicked_at IS NOT NULL
    AND first_clicked_at::DATE = p_date;
  
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
  WHERE campaign_id = p_campaign_id 
    AND user_id = p_user_id 
    AND date = p_date;
    
END;
$$ LANGUAGE plpgsql;

-- Recalculate for today's data
SELECT recalculate_unique_metrics_for_date(
  'ac2fa28f-5360-4fa2-80c6-0c3cc217785b',
  'd155d4c2-2f06-45b7-9c90-905e3648e8df', 
  '2025-08-16'::DATE
);

SELECT 'Unique metrics recalculated!' as status;