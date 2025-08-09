-- Add missing fields to users table for onboarding data
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS business_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_description TEXT,
ADD COLUMN IF NOT EXISTS selected_template VARCHAR(50),
ADD COLUMN IF NOT EXISTS selected_platforms TEXT[], -- Array of platform names
ADD COLUMN IF NOT EXISTS platform_links JSONB, -- JSON object with platform URLs
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_business_category ON users(business_category);
CREATE INDEX IF NOT EXISTS idx_users_selected_platforms ON users USING GIN(selected_platforms);

-- 3. Update existing users to have default values
UPDATE users 
SET 
  selected_platforms = COALESCE(selected_platforms, '{}'),
  platform_links = COALESCE(platform_links, '{}')
WHERE selected_platforms IS NULL OR platform_links IS NULL;

-- 4. Create a dedicated onboarding_data table as an alternative
CREATE TABLE IF NOT EXISTS onboarding_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  business_category VARCHAR(100),
  business_description TEXT,
  selected_platforms TEXT[],
  platform_links JSONB,
  profile_picture_url TEXT,
  display_name VARCHAR(255),
  bio TEXT,
  selected_template VARCHAR(50),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 5. Create RLS policies for onboarding_data
ALTER TABLE onboarding_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding data" ON onboarding_data
FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own onboarding data" ON onboarding_data
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own onboarding data" ON onboarding_data
FOR UPDATE USING (auth.uid()::text = user_id);

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_data_user_id ON onboarding_data(user_id);