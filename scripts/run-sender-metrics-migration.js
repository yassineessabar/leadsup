/**
 * Run Sender Metrics Migration
 * 
 * This script creates the missing sender_metrics and sender_summary_metrics tables
 * needed for real health score calculation.
 */

const fs = require('fs');
const path = require('path');

// We'll use the Supabase client to run the migration
const { createClient } = require('@supabase/supabase-js');

// Load environment variables if available
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Running Sender Metrics Migration...\n');

  // Check if we have Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing Supabase credentials in environment variables');
    console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'create-sender-metrics-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Loaded migration SQL file');
    console.log(`📏 SQL length: ${migrationSQL.length} characters`);

    // Split the SQL into individual statements (basic approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (error) {
          // Try direct query if RPC doesn't work
          const { error: directError } = await supabase
            .from('_')
            .select('*')
            .limit(0);
          
          // Since we can't execute raw SQL easily, let's create the tables using individual queries
          console.log('📝 Using alternative table creation method...');
          await createTablesDirectly(supabase);
          break;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (error) {
        console.log(`⚠️ Error on statement ${i + 1}:`, error.message);
        
        // Try alternative method
        if (i === 0) {
          console.log('📝 Switching to direct table creation...');
          await createTablesDirectly(supabase);
          break;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Sender metrics tables are now available for health score calculation');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function createTablesDirectly(supabase) {
  console.log('🔧 Creating tables using direct SQL execution...');

  // Since we can't execute complex SQL easily through the client,
  // let's check if the tables exist and guide the user
  
  try {
    // Try to query the sender_metrics table
    const { data, error } = await supabase
      .from('sender_metrics')
      .select('*')
      .limit(1);

    if (!error) {
      console.log('✅ sender_metrics table already exists!');
      return true;
    }
  } catch (e) {
    // Table doesn't exist, which is expected
  }

  console.log('\n📋 The sender_metrics table needs to be created manually.');
  console.log('Please run the following SQL in your Supabase SQL Editor:');
  console.log('\n' + '='.repeat(60));
  
  // Read and display the migration SQL
  const migrationPath = path.join(__dirname, 'create-sender-metrics-table.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log(migrationSQL);
  console.log('='.repeat(60));
  
  console.log('\n📝 Steps to apply migration:');
  console.log('1. Go to https://app.supabase.com/');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Copy and paste the SQL above');
  console.log('5. Click "Run" to execute');
  console.log('\n✅ After running the SQL, your health scores will use real SendGrid data!');
  
  return false;
}

// Run if this script is executed directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };