-- Add video testimonial link field to review_link table
-- Run this in Supabase SQL Editor

-- 1. Add video_testimonial_link column if it doesn't exist
ALTER TABLE review_link 
ADD COLUMN IF NOT EXISTS video_testimonial_link TEXT;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_review_link_video_testimonial ON review_link(video_testimonial_link);

-- 3. Verify the column was added
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'video_testimonial_link' THEN '✅ Video testimonial link column exists'
    ELSE column_name
  END as status
FROM information_schema.columns 
WHERE table_name = 'review_link' 
AND column_name = 'video_testimonial_link';