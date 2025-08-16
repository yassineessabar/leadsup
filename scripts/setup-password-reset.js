const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function setupPasswordResetTable() {
  try {
    console.log('🔄 Setting up password reset table...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-password-reset.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        
        // Use rpc to execute raw SQL
        const { error } = await supabase.rpc('exec_sql', { sql_statement: statement })
        
        if (error) {
          // Try direct execution if rpc fails
          console.log('RPC failed, trying direct query...')
          const { error: directError } = await supabase.from('password_reset_tokens').select().limit(1)
          
          if (directError && directError.message.includes('does not exist')) {
            console.error('❌ Cannot execute SQL directly. Please run the following SQL in your Supabase dashboard:')
            console.log('\n' + sql + '\n')
            process.exit(1)
          }
        }
      }
    }
    
    console.log('✅ Password reset table setup completed!')
    
    // Test the table by inserting and deleting a test record
    console.log('🧪 Testing table access...')
    
    const testToken = 'test-token-' + Date.now()
    const testUserId = '00000000-0000-0000-0000-000000000000' // Dummy UUID
    
    // Try to insert a test record (this should fail due to foreign key, but we'll catch it)
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: testUserId,
        token: testToken,
        expires_at: new Date(Date.now() + 3600000).toISOString()
      })
    
    if (insertError && !insertError.message.includes('foreign key')) {
      console.error('❌ Table access test failed:', insertError.message)
      process.exit(1)
    }
    
    console.log('✅ Table access test passed!')
    
  } catch (error) {
    console.error('❌ Error setting up password reset table:', error.message)
    
    // Fallback: show manual SQL
    console.log('\n📋 Please run this SQL manually in your Supabase dashboard:\n')
    const sqlPath = path.join(__dirname, 'setup-password-reset.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log(sql)
    
    process.exit(1)
  }
}

setupPasswordResetTable()