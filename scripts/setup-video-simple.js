const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupVideoStorage() {
  console.log('🔧 Setting up video storage...')
  
  try {
    // 1. Create storage bucket with correct options
    console.log('📦 Creating video-testimonials bucket...')
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('video-testimonials', {
      public: true
    })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Bucket creation error:', bucketError)
    } else {
      console.log('✅ Bucket created or already exists')
    }
    
    // 2. Create video_testimonials table using direct SQL
    console.log('📊 Creating video_testimonials table...')
    const { error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'video_testimonials')
    
    // Since we can't execute DDL directly, let's try to insert a test record to see if table exists
    const { error: testError } = await supabase
      .from('video_testimonials')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.log('⚠️ Table may not exist. Please run the SQL script manually in Supabase dashboard.')
      console.log('📋 SQL to run:')
      console.log(`
CREATE TABLE IF NOT EXISTS video_testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255),
  video_url TEXT NOT NULL,
  video_file_path TEXT NOT NULL,
  company_name VARCHAR(255),
  review_link_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
      `)
    } else {
      console.log('✅ Table exists')
    }
    
    // 3. Test bucket access
    console.log('🧪 Testing bucket access...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ List buckets error:', listError)
    } else {
      console.log('📦 Available buckets:', buckets.map(b => b.name))
      const videoBucket = buckets.find(b => b.name === 'video-testimonials')
      if (videoBucket) {
        console.log('✅ Video testimonials bucket found:', videoBucket)
      } else {
        console.log('❌ Video testimonials bucket not found')
      }
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

setupVideoStorage()