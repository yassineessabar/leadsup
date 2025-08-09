-- Create video testimonials table and storage bucket
-- Run this in Supabase SQL Editor

-- 1. Create video_testimonials table
CREATE TABLE IF NOT EXISTS video_testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255),
  video_url TEXT NOT NULL,
  video_file_path TEXT NOT NULL,
  company_name VARCHAR(255),
  review_link_id UUID REFERENCES review_link(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create storage bucket for video testimonials
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-testimonials',
  'video-testimonials', 
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/x-msvideo']
) ON CONFLICT (id) DO NOTHING;

-- 3. Set up Row Level Security (RLS) policies
ALTER TABLE video_testimonials ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all users to insert video testimonials (for public review forms)
CREATE POLICY "Allow public video testimonial uploads" ON video_testimonials
  FOR INSERT WITH CHECK (true);

-- Policy: Allow business owners to view their own video testimonials
CREATE POLICY "Business owners can view their video testimonials" ON video_testimonials
  FOR SELECT USING (
    review_link_id IN (
      SELECT id FROM review_link WHERE user_id = auth.uid()
    )
  );

-- 4. Set up storage policies for video-testimonials bucket
CREATE POLICY "Allow public video uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'video-testimonials');

CREATE POLICY "Allow public video downloads" ON storage.objects
  FOR SELECT USING (bucket_id = 'video-testimonials');

-- Policy: Allow business owners to delete their video testimonials
CREATE POLICY "Business owners can delete their video testimonials" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'video-testimonials' AND 
    name IN (
      SELECT video_file_path FROM video_testimonials vt
      JOIN review_link rl ON vt.review_link_id = rl.id
      WHERE rl.user_id = auth.uid()
    )
  );

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_testimonials_customer_email ON video_testimonials(customer_email);
CREATE INDEX IF NOT EXISTS idx_video_testimonials_review_link_id ON video_testimonials(review_link_id);
CREATE INDEX IF NOT EXISTS idx_video_testimonials_created_at ON video_testimonials(created_at);

-- 6. Add updated_at trigger
CREATE OR REPLACE FUNCTION update_video_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_video_testimonials_updated_at
  BEFORE UPDATE ON video_testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_video_testimonials_updated_at();

-- 7. Verify the setup
SELECT 
  'video_testimonials table created' as status,
  COUNT(*) as record_count
FROM video_testimonials;

SELECT 
  'video-testimonials bucket created' as status,
  public as is_public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'video-testimonials';