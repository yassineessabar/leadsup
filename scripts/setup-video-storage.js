const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupVideoStorage() {
  console.log('🔧 Setting up video storage...')
  
  try {
    // 1. Create storage bucket
    console.log('📦 Creating video-testimonials bucket...')
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('video-testimonials', {
      public: true,
      fileSizeLimit: 104857600, // 100MB
      allowedMimeTypes: ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/x-msvideo']
    })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Bucket creation error:', bucketError)
    } else {
      console.log('✅ Bucket created or already exists')
    }
    
    // 2. Create video_testimonials table
    console.log('📊 Creating video_testimonials table...')
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
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
        
        CREATE INDEX IF NOT EXISTS idx_video_testimonials_customer_email ON video_testimonials(customer_email);
        CREATE INDEX IF NOT EXISTS idx_video_testimonials_review_link_id ON video_testimonials(review_link_id);
        CREATE INDEX IF NOT EXISTS idx_video_testimonials_created_at ON video_testimonials(created_at);
      `
    })
    
    if (tableError) {
      console.error('❌ Table creation error:', tableError)
    } else {
      console.log('✅ Table created successfully')
    }
    
    // 3. Test bucket access
    console.log('🧪 Testing bucket access...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ List buckets error:', listError)
    } else {
      const videoBucket = buckets.find(b => b.name === 'video-testimonials')
      if (videoBucket) {
        console.log('✅ Video testimonials bucket found:', videoBucket)
      } else {
        console.log('❌ Video testimonials bucket not found')
      }
    }
    
    console.log('🎉 Setup complete!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

setupVideoStorage()