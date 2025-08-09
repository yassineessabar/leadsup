-- Fix RLS policies for onboarding
-- Run this in your Supabase SQL Editor

-- 1. Fix customization_settings RLS policy
-- Drop existing policies that might be blocking inserts
DROP POLICY IF EXISTS "Users can only access their own customization settings" ON customization_settings;
DROP POLICY IF EXISTS "Users can insert their own customization settings" ON customization_settings;
DROP POLICY IF EXISTS "Users can update their own customization settings" ON customization_settings;

-- Create proper RLS policies for customization_settings
CREATE POLICY "Users can view own customization settings" ON customization_settings
FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own customization settings" ON customization_settings
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own customization settings" ON customization_settings
FOR UPDATE USING (auth.uid()::text = user_id);

-- Enable RLS on customization_settings if not already enabled
ALTER TABLE customization_settings ENABLE ROW LEVEL SECURITY;

-- 2. Update profile-images bucket to support SVG files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
WHERE id = 'profile-images';

-- 3. Verify review_link RLS policies are working
-- Check if RLS policies exist for review_link
DO $$
BEGIN
    -- Create RLS policies for review_link if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'review_link' AND policyname = 'Users can view own review links'
    ) THEN
        CREATE POLICY "Users can view own review links" ON review_link
        FOR SELECT USING (auth.uid()::text = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'review_link' AND policyname = 'Users can insert own review links'
    ) THEN
        CREATE POLICY "Users can insert own review links" ON review_link
        FOR INSERT WITH CHECK (auth.uid()::text = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'review_link' AND policyname = 'Users can update own review links'
    ) THEN
        CREATE POLICY "Users can update own review links" ON review_link
        FOR UPDATE USING (auth.uid()::text = user_id);
    END IF;
END $$;