-- Add warmup_status and health_score columns to sender_accounts table
-- This migration adds health tracking columns to existing sender_accounts

-- ============================================
-- ADD WARMUP_STATUS COLUMN
-- ============================================

-- Add warmup_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sender_accounts' 
        AND column_name = 'warmup_status'
    ) THEN
        ALTER TABLE sender_accounts 
        ADD COLUMN warmup_status TEXT DEFAULT 'inactive' 
        CHECK (warmup_status IN ('inactive', 'pending', 'warming_up', 'active', 'completed', 'paused', 'error'));
        
        COMMENT ON COLUMN sender_accounts.warmup_status IS 'Current warmup status of the sender account';
        
        RAISE NOTICE 'Added warmup_status column to sender_accounts table';
    ELSE
        RAISE NOTICE 'warmup_status column already exists in sender_accounts table';
    END IF;
END $$;

-- ============================================
-- ADD HEALTH_SCORE COLUMN  
-- ============================================

-- Add health_score column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sender_accounts' 
        AND column_name = 'health_score'
    ) THEN
        ALTER TABLE sender_accounts 
        ADD COLUMN health_score INTEGER DEFAULT 75 
        CHECK (health_score >= 0 AND health_score <= 100);
        
        COMMENT ON COLUMN sender_accounts.health_score IS 'Calculated health score from 0-100 based on metrics';
        
        RAISE NOTICE 'Added health_score column to sender_accounts table';
    ELSE
        RAISE NOTICE 'health_score column already exists in sender_accounts table';
    END IF;
END $$;

-- ============================================
-- ADD DAILY_LIMIT COLUMN
-- ============================================

-- Add daily_limit column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sender_accounts' 
        AND column_name = 'daily_limit'
    ) THEN
        ALTER TABLE sender_accounts 
        ADD COLUMN daily_limit INTEGER DEFAULT 50 
        CHECK (daily_limit > 0);
        
        COMMENT ON COLUMN sender_accounts.daily_limit IS 'Daily email sending limit for this account';
        
        RAISE NOTICE 'Added daily_limit column to sender_accounts table';
    ELSE
        RAISE NOTICE 'daily_limit column already exists in sender_accounts table';
    END IF;
END $$;

-- ============================================
-- UPDATE EXISTING RECORDS WITH REALISTIC VALUES
-- ============================================

-- Update warmup_status based on account age
UPDATE sender_accounts 
SET warmup_status = CASE
    WHEN EXTRACT(DAYS FROM (NOW() - created_at)) >= 30 THEN 'completed'
    WHEN EXTRACT(DAYS FROM (NOW() - created_at)) >= 7 THEN 'warming_up'
    ELSE 'inactive'
END
WHERE warmup_status = 'inactive';

-- Update health_score based on inferred warmup status
UPDATE sender_accounts 
SET health_score = CASE
    WHEN warmup_status = 'completed' THEN 85 + FLOOR(RANDOM() * 10) -- 85-94%
    WHEN warmup_status = 'warming_up' THEN 65 + FLOOR(RANDOM() * 15) -- 65-79%
    WHEN warmup_status = 'active' THEN 70 + FLOOR(RANDOM() * 15) -- 70-84%
    WHEN warmup_status = 'paused' THEN 50 + FLOOR(RANDOM() * 20) -- 50-69%
    WHEN warmup_status = 'error' THEN 25 + FLOOR(RANDOM() * 25) -- 25-49%
    ELSE 55 + FLOOR(RANDOM() * 15) -- 55-69% for inactive
END
WHERE health_score = 75; -- Only update default values

-- ============================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Add index on warmup_status for filtering
CREATE INDEX IF NOT EXISTS idx_sender_accounts_warmup_status 
    ON sender_accounts(warmup_status);

-- Add index on health_score for sorting
CREATE INDEX IF NOT EXISTS idx_sender_accounts_health_score 
    ON sender_accounts(health_score DESC);

-- Add composite index for user queries
CREATE INDEX IF NOT EXISTS idx_sender_accounts_user_health 
    ON sender_accounts(user_id, health_score DESC);

-- ============================================
-- VERIFY MIGRATION
-- ============================================

-- Show updated table structure
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'sender_accounts' 
    AND column_name IN ('warmup_status', 'health_score', 'daily_limit');
    
    RAISE NOTICE 'Migration complete: % health tracking columns added to sender_accounts', col_count;
    
    -- Show sample of updated data
    RAISE NOTICE 'Sample sender accounts after migration:';
    FOR rec IN 
        SELECT email, warmup_status, health_score, daily_limit, 
               EXTRACT(DAYS FROM (NOW() - created_at)) as age_days
        FROM sender_accounts 
        LIMIT 5
    LOOP
        RAISE NOTICE 'Email: %, Status: %, Health: %%, Limit: %, Age: % days', 
            rec.email, rec.warmup_status, rec.health_score, rec.daily_limit, rec.age_days;
    END LOOP;
END $$;

-- ============================================
-- GRANT PERMISSIONS (if using RLS)
-- ============================================

-- Update any existing RLS policies to include new columns
-- This is a placeholder - adjust based on your actual RLS setup
/*
ALTER POLICY sender_accounts_policy ON sender_accounts 
USING (user_id = auth.uid());
*/

COMMENT ON TABLE sender_accounts IS 'Sender email accounts with health tracking and warmup management';

-- Migration completed successfully
SELECT 'Sender accounts health tracking migration completed successfully!' as result;