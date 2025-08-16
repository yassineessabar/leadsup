-- Add ALL missing columns to campaign_metrics table for SendGrid sync

-- Add bounces column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaign_metrics' AND column_name = 'bounces') THEN
        ALTER TABLE campaign_metrics ADD COLUMN bounces INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add blocks column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaign_metrics' AND column_name = 'blocks') THEN
        ALTER TABLE campaign_metrics ADD COLUMN blocks INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add total_opens and total_clicks if they don't exist  
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaign_metrics' AND column_name = 'total_opens') THEN
        ALTER TABLE campaign_metrics ADD COLUMN total_opens INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaign_metrics' AND column_name = 'total_clicks') THEN
        ALTER TABLE campaign_metrics ADD COLUMN total_clicks INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add spam_reports if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaign_metrics' AND column_name = 'spam_reports') THEN
        ALTER TABLE campaign_metrics ADD COLUMN spam_reports INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add bounce_rate if it doesn't exist  
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaign_metrics' AND column_name = 'bounce_rate') THEN
        ALTER TABLE campaign_metrics ADD COLUMN bounce_rate DECIMAL(5,2) DEFAULT 0;
    END IF;
END $$;

-- Update the user_metrics table as well
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_metrics' AND column_name = 'blocks') THEN
        ALTER TABLE user_metrics ADD COLUMN blocks INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_metrics' AND column_name = 'total_opens') THEN
        ALTER TABLE user_metrics ADD COLUMN total_opens INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_metrics' AND column_name = 'total_clicks') THEN
        ALTER TABLE user_metrics ADD COLUMN total_clicks INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_metrics' AND column_name = 'spam_reports') THEN
        ALTER TABLE user_metrics ADD COLUMN spam_reports INTEGER DEFAULT 0;
    END IF;
END $$;

SELECT 'Missing columns added successfully!' as status;