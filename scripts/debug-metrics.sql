-- Debug script to check what's in the database

-- Check raw SendGrid events
SELECT 
  event_type,
  COUNT(*) as count,
  campaign_id,
  user_id
FROM sendgrid_events 
WHERE campaign_id = 'ac2fa28f-5360-4fa2-80c6-0c3cc217785b'
GROUP BY event_type, campaign_id, user_id
ORDER BY event_type;

-- Check campaign metrics aggregated data
SELECT 
  campaign_id,
  user_id,
  date,
  emails_sent,
  emails_delivered,
  emails_bounced,
  emails_blocked,
  unique_opens,
  total_opens,
  unique_clicks,
  total_clicks,
  delivery_rate,
  open_rate,
  click_rate
FROM campaign_metrics 
WHERE campaign_id = 'ac2fa28f-5360-4fa2-80c6-0c3cc217785b'
ORDER BY date DESC;

-- Check email tracking data
SELECT 
  campaign_id,
  COUNT(*) as total_emails,
  COUNT(CASE WHEN first_opened_at IS NOT NULL THEN 1 END) as unique_opens,
  COUNT(CASE WHEN first_clicked_at IS NOT NULL THEN 1 END) as unique_clicks
FROM email_tracking 
WHERE campaign_id = 'ac2fa28f-5360-4fa2-80c6-0c3cc217785b'
GROUP BY campaign_id;