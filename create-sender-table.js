require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSenderTable() {
  try {
    console.log('🚀 Creating sender_accounts table...');

    // Check if table exists
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'sender_accounts')

    if (checkError) {
      console.error('Error checking if table exists:', checkError);
      return;
    }

    if (existingTables && existingTables.length > 0) {
      console.log('✅ sender_accounts table already exists');
      return;
    }

    // Create table using raw SQL query
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS sender_accounts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Sender email information
        email TEXT NOT NULL,
        display_name TEXT,
        
        -- Settings
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        
        -- SendGrid integration
        sendgrid_sender_id TEXT,
        sendgrid_status TEXT DEFAULT 'pending' CHECK (sendgrid_status IN ('pending', 'verified', 'failed')),
        sendgrid_verified_at TIMESTAMP WITH TIME ZONE,
        
        -- Statistics
        emails_sent INTEGER DEFAULT 0,
        last_email_sent_at TIMESTAMP WITH TIME ZONE,
        
        -- Metadata
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        UNIQUE(domain_id, email), -- Each email can only exist once per domain
        UNIQUE(domain_id, is_default) WHERE is_default = TRUE -- Only one default sender per domain
      );
    `;

    const { error: createError } = await supabase.rpc('execute_sql', { sql: createTableSQL });

    if (createError) {
      console.log('Table creation failed with RPC, trying direct query...');
      
      // Try a different approach - using a simple insert that will fail if table doesn't exist
      const { error: testError } = await supabase
        .from('sender_accounts')
        .select('id')
        .limit(1)

      if (testError && testError.message.includes('does not exist')) {
        console.log('❌ Table does not exist and cannot be created via client');
        console.log('💡 Please create the table manually in your database using the SQL from scripts/create-sender-accounts-table.sql');
        return;
      } else {
        console.log('✅ sender_accounts table already exists or was created');
      }
    } else {
      console.log('✅ sender_accounts table created successfully');
    }

    // Create indexes
    console.log('Creating indexes...');
    await supabase.rpc('execute_sql', { sql: 'CREATE INDEX IF NOT EXISTS idx_sender_accounts_domain_id ON sender_accounts(domain_id);' });
    await supabase.rpc('execute_sql', { sql: 'CREATE INDEX IF NOT EXISTS idx_sender_accounts_user_id ON sender_accounts(user_id);' });
    await supabase.rpc('execute_sql', { sql: 'CREATE INDEX IF NOT EXISTS idx_sender_accounts_email ON sender_accounts(email);' });

    console.log('✅ Setup complete! You can now manage sender accounts.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSenderTable();