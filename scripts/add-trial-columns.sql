-- Add trial-related columns to users table
-- Run this in your Supabase SQL editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS trial_start_date timestamptz,
ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
ADD COLUMN IF NOT EXISTS trial_ending_notified boolean DEFAULT false;

-- Create index for faster trial-related queries
CREATE INDEX IF NOT EXISTS idx_users_trial_end_date ON users(trial_end_date) WHERE trial_end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Update existing users to set trial_ending_notified default
UPDATE users 
SET trial_ending_notified = false 
WHERE trial_ending_notified IS NULL;

-- Add comment to table
COMMENT ON COLUMN users.trial_start_date IS 'When the user trial period started';
COMMENT ON COLUMN users.trial_end_date IS 'When the user trial period ends';
COMMENT ON COLUMN users.trial_ending_notified IS 'Whether user has been notified that trial is ending';

-- Optional: Create a view for trial status
CREATE OR REPLACE VIEW user_trial_status AS
SELECT 
  id,
  email,
  subscription_status,
  subscription_type,
  trial_start_date,
  trial_end_date,
  trial_ending_notified,
  CASE 
    WHEN subscription_status = 'trialing' AND trial_end_date > NOW() THEN true
    ELSE false
  END as is_in_trial,
  CASE 
    WHEN subscription_status = 'trialing' AND trial_end_date IS NOT NULL THEN 
      GREATEST(0, EXTRACT(epoch FROM (trial_end_date - NOW())) / 86400)::integer
    ELSE 0
  END as days_left_in_trial,
  CASE 
    WHEN subscription_status = 'trialing' AND trial_end_date IS NOT NULL THEN 
      trial_end_date <= NOW() + INTERVAL '2 days'
    ELSE false
  END as trial_ending_soon
FROM users;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT ON user_trial_status TO authenticated;