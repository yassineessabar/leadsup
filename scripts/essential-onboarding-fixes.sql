-- Essential fixes for onboarding (run these first if you want to test immediately)

-- 1. Ensure store_type column exists for business category
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_type VARCHAR(100);

-- 2. Add required columns to review_link table
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
ADD COLUMN IF NOT EXISTS video_upload_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS enabled_platforms TEXT[] DEFAULT '{}';

-- 3. Create profile-images storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true) 
ON CONFLICT (id) DO NOTHING;