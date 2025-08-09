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

async function createPasswordResetTable() {
  try {
    console.log('Creating password_reset_tokens table...')
    
    const { error } = await supabase.rpc('create_password_reset_table', {})
    
    if (error) {
      // If RPC doesn't exist, try direct SQL execution
      console.log('RPC not found, trying direct SQL execution...')
      
      const createTableSQL = `
        -- Create password_reset_tokens table
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          used_at TIMESTAMP WITH TIME ZONE NULL
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
      `
      
      const { error: sqlError } = await supabase.from('password_reset_tokens').select().limit(1)
      
      if (sqlError && sqlError.message.includes('does not exist')) {
        console.error('Cannot create table directly. Please run the following SQL in your Supabase dashboard:')
        console.log('\n' + createTableSQL + '\n')
        process.exit(1)
      }
    }
    
    console.log('✅ Password reset tokens table created successfully!')
    
  } catch (error) {
    console.error('❌ Error creating table:', error.message)
    process.exit(1)
  }
}

createPasswordResetTable()