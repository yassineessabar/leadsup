const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTable() {
  try {
    console.log('🔧 Creating video_testimonials table...')
    
    // Test if table exists
    const { data: testData, error: testError } = await supabase
      .from('video_testimonials')
      .select('id')
      .limit(1)
    
    if (!testError) {
      console.log('✅ Table already exists!')
      return
    }
    
    console.log('📊 Table does not exist. Creating with INSERT method...')
    
    // Try to create a table by attempting an insert - this will fail but might create the table
    try {
      await supabase
        .from('video_testimonials')
        .insert({
          customer_name: 'test',
          customer_email: 'test@test.com',
          video_url: 'test',
          video_file_path: 'test'
        })
    } catch (insertError) {
      console.log('🔍 Insert failed as expected:', insertError.message)
    }
    
    // Test connection to see available tables
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (!tableError) {
      console.log('📋 Available tables:', tables.map(t => t.table_name))
    }
    
    console.log('⚠️ Please create the table manually in Supabase SQL Editor with this SQL:')
    console.log(`
CREATE TABLE video_testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255),
  video_url TEXT NOT NULL,
  video_file_path TEXT NOT NULL,
  company_name VARCHAR(255),
  review_link_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createTable()