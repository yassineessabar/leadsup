-- Add is_admin flag to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create automation_logs table for tracking all automation activities
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    campaign_id TEXT,
    action_type TEXT NOT NULL,
    action_details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_campaign_id ON automation_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_action_type ON automation_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at DESC);

-- Enable RLS for automation_logs
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for automation_logs
DROP POLICY IF EXISTS "Admins can view all automation logs" ON automation_logs;
CREATE POLICY "Admins can view all automation logs" ON automation_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

DROP POLICY IF EXISTS "Users can view own automation logs" ON automation_logs;
CREATE POLICY "Users can view own automation logs" ON automation_logs
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert automation logs" ON automation_logs;
CREATE POLICY "System can insert automation logs" ON automation_logs
    FOR INSERT
    WITH CHECK (true);

-- Create a simpler view that works with various schemas
DROP VIEW IF EXISTS account_activity_summary;
CREATE OR REPLACE VIEW account_activity_summary AS
SELECT 
    p.user_id,
    COALESCE(p.is_admin, false) as is_admin,
    u.email as user_email,
    -- Campaign counts (handle different ID types)
    COALESCE((
        SELECT COUNT(*) FROM campaigns c 
        WHERE c.user_id = p.user_id
    ), 0) as total_campaigns,
    COALESCE((
        SELECT COUNT(*) FROM campaigns c 
        WHERE c.user_id = p.user_id AND c.status = 'draft'
    ), 0) as draft_campaigns,
    COALESCE((
        SELECT COUNT(*) FROM campaigns c 
        WHERE c.user_id = p.user_id AND c.status = 'active'
    ), 0) as active_campaigns,
    COALESCE((
        SELECT COUNT(*) FROM campaigns c 
        WHERE c.user_id = p.user_id AND c.scraping_status = 'running'
    ), 0) as scraping_in_progress,
    COALESCE((
        SELECT COUNT(*) FROM campaigns c 
        WHERE c.user_id = p.user_id AND c.scraping_status = 'completed'
    ), 0) as scraping_completed,
    -- Contact counts
    COALESCE((
        SELECT COUNT(*) FROM contacts ct 
        WHERE ct.user_id = p.user_id
    ), 0) as total_contacts,
    -- Email counts for today (handle different ID types in email_tracking)
    COALESCE((
        SELECT COUNT(*) FROM email_tracking et
        JOIN campaigns c ON (et.campaign_id = c.id::text OR et.campaign_id::uuid = c.id)
        WHERE c.user_id = p.user_id 
        AND et.sent_at >= CURRENT_DATE
    ), 0) as emails_sent_today,
    -- Sender account counts (check multiple possible table names)
    COALESCE(
        COALESCE((
            SELECT COUNT(*) FROM sender_accounts sa 
            WHERE sa.user_id = p.user_id
        ), 0) + 
        COALESCE((
            SELECT COUNT(*) FROM smtp_accounts sa 
            WHERE sa.user_id = p.user_id
        ), 0),
        0
    ) as sender_accounts_count,
    -- Last activity
    GREATEST(
        COALESCE((SELECT MAX(created_at) FROM automation_logs al WHERE al.user_id = p.user_id), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(created_at) FROM campaigns c WHERE c.user_id = p.user_id), '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(created_at) FROM contacts ct WHERE ct.user_id = p.user_id), '1970-01-01'::timestamptz)
    ) as last_activity,
    -- Sender account details (simplified)
    '[]'::jsonb as sender_accounts_details
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.user_id IS NOT NULL;

-- Grant select on the view to authenticated users
GRANT SELECT ON account_activity_summary TO authenticated;

-- Note: Views automatically inherit RLS from their underlying tables
-- We handle admin-only access in the API layer instead of at the database level

-- Add helpful comments
COMMENT ON TABLE automation_logs IS 'Tracks all automation activities across the platform for admin monitoring';
COMMENT ON VIEW account_activity_summary IS 'Admin view providing aggregated account activity metrics';

-- Sample admin user setup (commented out - run manually)
-- UPDATE profiles SET is_admin = true WHERE user_id = (SELECT id FROM auth.users WHERE email = 'weleadsup@gmail.com');