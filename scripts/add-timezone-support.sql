-- Add timezone support to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS timezone_group VARCHAR(10) DEFAULT 'T1' CHECK (timezone_group IN ('T1', 'T2', 'T3', 'T4')),
ADD COLUMN IF NOT EXISTS timezone_name VARCHAR(50) DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT -5; -- Hours from UTC

-- Add timezone configuration table
CREATE TABLE IF NOT EXISTS timezone_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone_group VARCHAR(10) NOT NULL CHECK (timezone_group IN ('T1', 'T2', 'T3', 'T4')),
  timezone_name VARCHAR(50) NOT NULL,
  utc_offset INTEGER NOT NULL, -- Hours from UTC
  send_window_start TIME DEFAULT '09:00:00', -- Local time to start sending
  send_window_end TIME DEFAULT '17:00:00', -- Local time to stop sending
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, timezone_group)
);

-- Insert default timezone configurations
INSERT INTO timezone_configs (user_id, timezone_group, timezone_name, utc_offset, description) 
VALUES 
  -- You'll need to replace 'YOUR_USER_ID' with actual user IDs
  (gen_random_uuid(), 'T1', 'America/New_York', -5, 'Eastern Time Zone'),
  (gen_random_uuid(), 'T2', 'America/Chicago', -6, 'Central Time Zone'),
  (gen_random_uuid(), 'T3', 'Europe/London', 0, 'UK/Europe Time Zone'),
  (gen_random_uuid(), 'T4', 'Asia/Singapore', 8, 'Asia Pacific Time Zone')
ON CONFLICT DO NOTHING;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_contacts_timezone_group ON contacts(timezone_group);
CREATE INDEX IF NOT EXISTS idx_contacts_campaign_timezone ON contacts(campaign_id, timezone_group);

-- Create a function to calculate next send time based on timezone
CREATE OR REPLACE FUNCTION calculate_next_send_time(
  p_contact_timezone VARCHAR(10),
  p_campaign_id UUID,
  p_base_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  v_timezone_config RECORD;
  v_campaign_settings RECORD;
  v_local_time TIME;
  v_send_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get timezone configuration
  SELECT * INTO v_timezone_config
  FROM timezone_configs
  WHERE timezone_group = p_contact_timezone
  LIMIT 1;
  
  -- Get campaign settings
  SELECT * INTO v_campaign_settings
  FROM campaign_settings
  WHERE campaign_id = p_campaign_id;
  
  -- Calculate local time for the contact's timezone
  v_local_time := (p_base_time AT TIME ZONE v_timezone_config.timezone_name)::TIME;
  
  -- If current local time is within send window, return now
  IF v_local_time >= v_timezone_config.send_window_start 
     AND v_local_time <= v_timezone_config.send_window_end THEN
    RETURN p_base_time;
  END IF;
  
  -- If before send window, schedule for start of window today
  IF v_local_time < v_timezone_config.send_window_start THEN
    v_send_time := (DATE(p_base_time AT TIME ZONE v_timezone_config.timezone_name) + 
                    v_timezone_config.send_window_start) AT TIME ZONE v_timezone_config.timezone_name;
    RETURN v_send_time;
  END IF;
  
  -- If after send window, schedule for start of window tomorrow
  v_send_time := (DATE(p_base_time AT TIME ZONE v_timezone_config.timezone_name) + 
                  INTERVAL '1 day' + 
                  v_timezone_config.send_window_start) AT TIME ZONE v_timezone_config.timezone_name;
  RETURN v_send_time;
END;
$$ LANGUAGE plpgsql;

-- Update contact_sequences to include timezone-aware scheduling
ALTER TABLE contact_sequences
ADD COLUMN IF NOT EXISTS contact_timezone VARCHAR(10),
ADD COLUMN IF NOT EXISTS scheduled_local_time TIME,
ADD COLUMN IF NOT EXISTS actual_send_time TIMESTAMP WITH TIME ZONE;

-- Grant permissions
GRANT ALL ON timezone_configs TO authenticated;