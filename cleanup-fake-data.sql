-- Clean up fake SendGrid metrics that were injected for campaigns with no real activity
-- These are campaigns that have metrics but no contacts and no actual sent emails

-- First, let's see what we're dealing with
SELECT 
  c.id,
  c.name,
  c.sent,
  c.totalPlanned,
  COUNT(contacts.id) as contact_count,
  COUNT(cm.id) as metrics_count,
  cm.emails_sent as metrics_emails_sent
FROM campaigns c
LEFT JOIN contacts ON contacts.campaign_id = c.id
LEFT JOIN campaign_metrics cm ON cm.campaign_id = c.id
GROUP BY c.id, c.name, c.sent, c.totalPlanned, cm.id, cm.emails_sent
HAVING COUNT(contacts.id) = 0 AND (c.sent IS NULL OR c.sent = 0) AND COUNT(cm.id) > 0
ORDER BY c.created_at DESC;

-- Delete fake metrics for campaigns that have no contacts and no actual sent emails
DELETE FROM campaign_metrics 
WHERE campaign_id IN (
  SELECT c.id
  FROM campaigns c
  LEFT JOIN contacts ON contacts.campaign_id = c.id
  WHERE c.id = campaign_metrics.campaign_id
  GROUP BY c.id, c.sent
  HAVING COUNT(contacts.id) = 0 AND (c.sent IS NULL OR c.sent = 0)
);

-- Also clean up any sendgrid_metrics that might have fake data
UPDATE campaigns 
SET 
  sent = NULL,
  sendgrid_metrics = NULL
WHERE id IN (
  SELECT c.id
  FROM campaigns c
  LEFT JOIN contacts ON contacts.campaign_id = c.id
  GROUP BY c.id
  HAVING COUNT(contacts.id) = 0
) AND (sent > 0 OR sendgrid_metrics IS NOT NULL);

-- Show the cleaned campaigns
SELECT 
  c.id,
  c.name,
  c.sent,
  COUNT(contacts.id) as contact_count,
  COUNT(cm.id) as metrics_count
FROM campaigns c
LEFT JOIN contacts ON contacts.campaign_id = c.id
LEFT JOIN campaign_metrics cm ON cm.campaign_id = c.id
GROUP BY c.id, c.name, c.sent
ORDER BY c.created_at DESC
LIMIT 10;