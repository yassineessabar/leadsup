-- Fix onboarding database schema issues
-- Run these commands in your Supabase SQL editor

-- 1. Ensure users table has store_type column (should already exist based on schema)
-- This column will store the business category
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS store_type VARCHAR(100);

-- 2. Ensure review_link table has all required columns
-- Add missing columns that are required for the onboarding flow
ALTER TABLE review_link 
ADD COLUMN IF NOT EXISTS review_qr_code TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS rating_page_content TEXT DEFAULT 'Thank you for choosing us! Please leave us a review.',
ADD COLUMN IF NOT EXISTS redirect_message TEXT DEFAULT 'Thank you for your review!',
ADD COLUMN IF NOT EXISTS internal_notification_message TEXT DEFAULT 'New review received',
ADD COLUMN IF NOT EXISTS video_upload_message TEXT DEFAULT 'Upload a video review',
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#1E40AF',
ADD COLUMN IF NOT EXISTS background_color VARCHAR(7) DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS text_color VARCHAR(7) DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS button_text_color VARCHAR(7) DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS button_style VARCHAR(50) DEFAULT 'rounded',
ADD COLUMN IF NOT EXISTS font VARCHAR(50) DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS show_badge BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS header_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS initial_view_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS negative_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_upload_settings JSONB DEFAULT '{}';

-- 3. Ensure enabled_platforms column exists and is of correct type
ALTER TABLE review_link 
ADD COLUMN IF NOT EXISTS enabled_platforms TEXT[] DEFAULT '{}';

-- 4. Create profile-images storage bucket for profile image uploads
-- Note: This needs to be run in Supabase dashboard Storage section or via RPC
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images', 
  'profile-images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 5. Set up RLS (Row Level Security) policies for profile-images bucket
-- Allow authenticated users to upload their own profile images
CREATE POLICY "Users can upload profile images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to profile images
CREATE POLICY "Profile images are publicly accessible" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'profile-images');

-- Allow users to update their own profile images
CREATE POLICY "Users can update own profile images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own profile images
CREATE POLICY "Users can delete own profile images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. Add company_logo_url column to review_link if it doesn't exist
ALTER TABLE review_link 
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- 7. Ensure customization_settings table has all required columns
ALTER TABLE customization_settings
ADD COLUMN IF NOT EXISTS welcome_message_title TEXT,
ADD COLUMN IF NOT EXISTS welcome_message_body TEXT,
ADD COLUMN IF NOT EXISTS thank_you_message_title TEXT,
ADD COLUMN IF NOT EXISTS thank_you_message_body TEXT,
ADD COLUMN IF NOT EXISTS branding_logo_url TEXT,
ADD COLUMN IF NOT EXISTS branding_primary_color VARCHAR(7) DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS branding_secondary_color VARCHAR(7) DEFAULT '#1E40AF',
ADD COLUMN IF NOT EXISTS redirect_delay_seconds INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS redirect_platform_url TEXT;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_store_type ON users(store_type);
CREATE INDEX IF NOT EXISTS idx_review_link_user_id ON review_link(user_id);
CREATE INDEX IF NOT EXISTS idx_review_link_enabled_platforms ON review_link USING GIN(enabled_platforms);
CREATE INDEX IF NOT EXISTS idx_customization_settings_user_id ON customization_settings(user_id);

-- 9. Update any existing review_link entries to have default values for new columns
UPDATE review_link 
SET 
  review_qr_code = COALESCE(review_qr_code, ''),
  rating_page_content = COALESCE(rating_page_content, 'Thank you for choosing us! Please leave us a review.'),
  redirect_message = COALESCE(redirect_message, 'Thank you for your review!'),
  internal_notification_message = COALESCE(internal_notification_message, 'New review received'),
  video_upload_message = COALESCE(video_upload_message, 'Upload a video review'),
  primary_color = COALESCE(primary_color, '#3B82F6'),
  secondary_color = COALESCE(secondary_color, '#1E40AF'),
  background_color = COALESCE(background_color, '#FFFFFF'),
  text_color = COALESCE(text_color, '#000000'),
  button_text_color = COALESCE(button_text_color, '#FFFFFF'),
  button_style = COALESCE(button_style, 'rounded'),
  font = COALESCE(font, 'Inter'),
  show_badge = COALESCE(show_badge, true),
  links = COALESCE(links, '[]'::jsonb),
  header_settings = COALESCE(header_settings, '{}'::jsonb),
  initial_view_settings = COALESCE(initial_view_settings, '{}'::jsonb),
  negative_settings = COALESCE(negative_settings, '{}'::jsonb),
  video_upload_settings = COALESCE(video_upload_settings, '{}'::jsonb),
  enabled_platforms = COALESCE(enabled_platforms, '{}')
WHERE 
  review_qr_code IS NULL OR
  rating_page_content IS NULL OR
  redirect_message IS NULL OR
  internal_notification_message IS NULL OR
  video_upload_message IS NULL OR
  primary_color IS NULL OR
  secondary_color IS NULL OR
  background_color IS NULL OR
  text_color IS NULL OR
  button_text_color IS NULL OR
  button_style IS NULL OR
  font IS NULL OR
  show_badge IS NULL OR
  links IS NULL OR
  header_settings IS NULL OR
  initial_view_settings IS NULL OR
  negative_settings IS NULL OR
  video_upload_settings IS NULL OR
  enabled_platforms IS NULL;

-- 10. Refresh schema cache to avoid cache issues
-- This is specific to Supabase and may need to be done via dashboard
NOTIFY pgrst, 'reload schema';