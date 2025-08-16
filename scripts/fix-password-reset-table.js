const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function fixPasswordResetTable() {
  try {
    console.log('🔄 Checking password_reset_tokens table structure...')
    
    // First, check if the table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.log('Table structure issue detected:', tableError.message)
      
      if (tableError.message.includes('does not exist')) {
        console.log('Creating password_reset_tokens table from scratch...')
        
        // Table doesn't exist, create it
        console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:')
        console.log('\n' + `
-- Create password_reset_tokens table
CREATE TABLE password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes for performance
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Disable RLS for this table since it's only accessed by server-side code
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
        `.trim() + '\n')
        
      } else if (tableError.message.includes('used_at does not exist')) {
        console.log('Adding missing used_at column...')
        
        console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:')
        console.log('\n' + `
-- Add missing used_at column
ALTER TABLE password_reset_tokens 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE NULL;

-- Disable RLS if not already disabled
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
        `.trim() + '\n')
      }
      
      return
    }
    
    console.log('✅ Table exists and is accessible')
    
    // Try to add the used_at column if it's missing
    console.log('🔄 Attempting to add used_at column if missing...')
    
    // This will work if the column doesn't exist, or do nothing if it does
    console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor to ensure the table has all required columns:')
    console.log('\n' + `
-- Ensure used_at column exists
ALTER TABLE password_reset_tokens 
ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE NULL;

-- Disable RLS 
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
    `.trim() + '\n')
    
  } catch (error) {
    console.error('❌ Error checking table:', error.message)
  }
}

fixPasswordResetTable()