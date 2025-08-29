-- Add sender_email column to email_tracking table if it doesn't exist
ALTER TABLE email_tracking 
ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);

-- Create index for performance on the new column
CREATE INDEX IF NOT EXISTS idx_email_tracking_sender_email ON email_tracking(sender_email);

-- Add sender_email column to campaign_metrics table if it doesn't exist
ALTER TABLE campaign_metrics 
ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);

-- Create index for performance on the new column
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_sender_email ON campaign_metrics(sender_email);

-- Update existing records to populate sender_email from sendgrid_events if available
-- This is optional and can be run later if needed
DO $$
BEGIN
    -- Update email_tracking records with sender_email from sendgrid_events
    UPDATE email_tracking et
    SET sender_email = se.event_data->>'sender_email'
    FROM sendgrid_events se
    WHERE et.sg_message_id = se.sg_message_id
    AND et.sender_email IS NULL
    AND se.event_data->>'sender_email' IS NOT NULL;
    
    RAISE NOTICE 'Updated % email_tracking records with sender_email', ROW_COUNT;
    
    -- Update campaign_metrics records with sender_email from sendgrid_events
    UPDATE campaign_metrics cm
    SET sender_email = (
        SELECT DISTINCT se.event_data->>'sender_email'
        FROM sendgrid_events se
        WHERE se.campaign_id = cm.campaign_id::text
        AND se.user_id = cm.user_id::text
        AND date_trunc('day', se.timestamp) = cm.date
        AND se.event_data->>'sender_email' IS NOT NULL
        LIMIT 1
    )
    WHERE cm.sender_email IS NULL;
    
    RAISE NOTICE 'Updated % campaign_metrics records with sender_email', ROW_COUNT;
END $$;

-- Grant necessary permissions
GRANT ALL ON email_tracking TO authenticated;
GRANT ALL ON campaign_metrics TO authenticated;