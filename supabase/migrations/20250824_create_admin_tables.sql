-- Add is_admin flag to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create automation_logs table for tracking all automation activities
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    campaign_id UUID,
    action_type TEXT NOT NULL, -- 'scraping_started', 'scraping_completed', 'email_sent', 'email_failed', etc.
    action_details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_automation_logs_campaign 
        FOREIGN KEY (campaign_id) 
        REFERENCES campaigns(id) 
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_campaign_id ON automation_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_action_type ON automation_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at DESC);

-- Enable RLS for automation_logs
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for automation_logs
-- Only admins can read all logs
CREATE POLICY "Admins can view all automation logs" ON automation_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Users can only see their own logs
CREATE POLICY "Users can view own automation logs" ON automation_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- System can insert logs (using service role)
CREATE POLICY "System can insert automation logs" ON automation_logs
    FOR INSERT
    WITH CHECK (true);

-- Create a view for account activity summary (for admin panel)
CREATE OR REPLACE VIEW account_activity_summary AS
SELECT 
    p.user_id,
    p.is_admin,
    u.email as user_email,
    COUNT(DISTINCT c.id) as total_campaigns,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'draft') as draft_campaigns,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') as active_campaigns,
    COUNT(DISTINCT c.id) FILTER (WHERE c.scraping_status = 'running') as scraping_in_progress,
    COUNT(DISTINCT c.id) FILTER (WHERE c.scraping_status = 'completed') as scraping_completed,
    COUNT(DISTINCT ct.id) as total_contacts,
    COUNT(DISTINCT et.id) FILTER (WHERE et.sent_at >= CURRENT_DATE) as emails_sent_today,
    COUNT(DISTINCT sa.id) as sender_accounts_count,
    MAX(al.created_at) as last_activity,
    COALESCE(
        JSONB_AGG(
            DISTINCT jsonb_build_object(
                'email', sa.email,
                'is_active', COALESCE(sa.is_active, true),
                'daily_send_limit', COALESCE(sa.daily_send_limit, 50),
                'emails_sent_today', COALESCE(sa.emails_sent_today, 0),
                'sendgrid_status', COALESCE(sa.sendgrid_status, 'unknown')
            )
        ) FILTER (WHERE sa.id IS NOT NULL),
        '[]'::jsonb
    ) as sender_accounts_details
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN campaigns c ON c.user_id = p.user_id
LEFT JOIN contacts ct ON ct.user_id = p.user_id
LEFT JOIN email_tracking et ON et.campaign_id::text = c.id::text
LEFT JOIN sender_accounts sa ON sa.user_id = p.user_id
LEFT JOIN automation_logs al ON al.user_id = p.user_id
GROUP BY p.user_id, p.is_admin, u.email;

-- Grant select on the view to authenticated users
GRANT SELECT ON account_activity_summary TO authenticated;

-- Add RLS policy for the view (admin only)
CREATE POLICY "Only admins can view account activity summary" ON account_activity_summary
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Set the admin user (replace with actual admin email)
-- You'll need to run this manually with the correct email after deployment
-- UPDATE profiles SET is_admin = true WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');