-- Ensure all onboarding columns exist in the database
-- Run this in Supabase SQL Editor

-- 1. Add profile_picture_url to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- 2. Add platform_links as JSONB to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS platform_links JSONB DEFAULT '{}';

-- 3. Ensure review_link table has links column for additional platforms
ALTER TABLE review_link 
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]';

-- 4. Create storage bucket for profile images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images', 
  'profile-images', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 5. Ensure RLS policies exist for storage
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Profile images are publicly accessible'
  ) THEN
    CREATE POLICY "Profile images are publicly accessible" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'profile-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload profile images'
  ) THEN
    CREATE POLICY "Users can upload profile images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'profile-images');
  END IF;
END $$;

-- 6. Verify columns exist
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'profile_picture_url' THEN '✅ Profile picture URL column exists'
    WHEN column_name = 'platform_links' THEN '✅ Platform links column exists'
    ELSE column_name
  END as status
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('profile_picture_url', 'platform_links');

-- 7. Check review_link columns
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'google_review_link' THEN '✅ Google link column exists'
    WHEN column_name = 'facebook_review_link' THEN '✅ Facebook link column exists'
    WHEN column_name = 'trustpilot_review_link' THEN '✅ Trustpilot link column exists'
    WHEN column_name = 'links' THEN '✅ Additional links column exists'
    ELSE column_name
  END as status
FROM information_schema.columns 
WHERE table_name = 'review_link' 
AND column_name IN ('google_review_link', 'facebook_review_link', 'trustpilot_review_link', 'links');