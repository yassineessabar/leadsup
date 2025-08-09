-- Create automation_jobs table to track scheduled email/SMS automation
CREATE TABLE IF NOT EXISTS automation_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    review_id UUID,
    template_id UUID,
    template_type TEXT NOT NULL CHECK (template_type IN ('email', 'sms')),
    
    -- Customer information
    customer_id TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    
    -- Scheduling information
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    trigger_type TEXT NOT NULL, -- 'immediate', 'after_purchase', 'weekly', 'monthly'
    wait_days INTEGER DEFAULT 0,
    
    -- Job status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Execution tracking
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_jobs_user_id ON automation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_status ON automation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_scheduled_for ON automation_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_template_type ON automation_jobs(template_type);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_review_id ON automation_jobs(review_id);

-- Add foreign key constraints
ALTER TABLE automation_jobs 
ADD CONSTRAINT fk_automation_jobs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add RLS (Row Level Security) policies
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own automation jobs
CREATE POLICY automation_jobs_user_access ON automation_jobs
    FOR ALL USING (user_id = auth.uid());

-- Policy: Service role can access all records (for cron jobs)
CREATE POLICY automation_jobs_service_access ON automation_jobs
    FOR ALL USING (current_setting('role') = 'service_role');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_automation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER automation_jobs_updated_at
    BEFORE UPDATE ON automation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_jobs_updated_at();

-- Add comments
COMMENT ON TABLE automation_jobs IS 'Tracks scheduled email and SMS automation jobs';
COMMENT ON COLUMN automation_jobs.template_type IS 'Type of template: email or sms';
COMMENT ON COLUMN automation_jobs.trigger_type IS 'What triggered the automation: immediate, after_purchase, weekly, monthly';
COMMENT ON COLUMN automation_jobs.wait_days IS 'Number of days to wait before sending (used with trigger_type)';
COMMENT ON COLUMN automation_jobs.status IS 'Current status of the job: pending, processing, completed, failed, cancelled';