require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runSQL(filename) {
  try {
    const sql = fs.readFileSync(filename, 'utf8');
    console.log(`📄 Running SQL from: ${filename}`);
    
    // Split SQL by statements and run them individually
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_statement: statement + ';' 
        });
        
        if (error) {
          console.error('❌ Error:', error.message);
        } else if (data) {
          console.log('✅', data);
        }
      }
    }
  } catch (error) {
    console.error('❌ Script Error:', error.message);
  }
}

// Get filename from command line args
const filename = process.argv[2];
if (!filename) {
  console.error('Usage: node run-sql.js <filename>');
  process.exit(1);
}

runSQL(filename);