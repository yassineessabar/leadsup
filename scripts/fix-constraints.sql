-- Fix constraint issues for SendGrid triggers

-- Add unique constraints for the triggers to work properly
ALTER TABLE campaign_metrics 
DROP CONSTRAINT IF EXISTS unique_campaign_date;

ALTER TABLE campaign_metrics 
ADD CONSTRAINT unique_campaign_date UNIQUE (user_id, campaign_id, date);

ALTER TABLE user_metrics
DROP CONSTRAINT IF EXISTS unique_user_date;

ALTER TABLE user_metrics
ADD CONSTRAINT unique_user_date UNIQUE (user_id, date);

ALTER TABLE email_tracking
DROP CONSTRAINT IF EXISTS unique_msg_email;

ALTER TABLE email_tracking
ADD CONSTRAINT unique_msg_email UNIQUE (sg_message_id, email);

SELECT 'Constraints fixed successfully!' as status;