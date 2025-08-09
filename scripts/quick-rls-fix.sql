-- Quick fix for customization_settings RLS policy
-- Run this in Supabase SQL Editor

-- Drop existing policy if it exists and create a new one
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON customization_settings;

-- Create the missing RLS policy for INSERT
CREATE POLICY "Enable insert for authenticated users" ON customization_settings
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- Create profile-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images', 
  'profile-images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Create RLS policies for the storage bucket
CREATE POLICY "Profile images are publicly accessible" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload profile images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-images');