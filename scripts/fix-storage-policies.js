const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixStoragePolicies() {
  console.log('🔧 Fixing storage policies for video-testimonials bucket...')
  
  try {
    // Test upload with service role
    console.log('🧪 Testing upload with service role...')
    
    const testFile = Buffer.from('test video content')
    const testFileName = `test-${Date.now()}.txt`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-testimonials')
      .upload(testFileName, testFile, {
        contentType: 'text/plain'
      })
    
    if (uploadError) {
      console.error('❌ Service role upload failed:', uploadError)
      
      console.log('💡 Storage policies need to be created manually in Supabase:')
      console.log(`
-- Go to Supabase Dashboard > Storage > Policies
-- Add these policies for the 'video-testimonials' bucket:

-- Policy 1: Allow public uploads
CREATE POLICY "Allow public video uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'video-testimonials');

-- Policy 2: Allow public downloads  
CREATE POLICY "Allow public video downloads" ON storage.objects
  FOR SELECT USING (bucket_id = 'video-testimonials');
      `)
    } else {
      console.log('✅ Service role upload successful:', uploadData.path)
      
      // Clean up test file
      await supabase.storage
        .from('video-testimonials')
        .remove([testFileName])
      console.log('🧹 Test file cleaned up')
    }
    
    // Test bucket settings
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (!listError) {
      const bucket = buckets.find(b => b.name === 'video-testimonials')
      console.log('📦 Bucket settings:', bucket)
      
      if (!bucket.public) {
        console.log('⚠️ Bucket is not public - this might cause issues')
        console.log('💡 To fix: Set bucket to public in Supabase Dashboard > Storage')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixStoragePolicies()