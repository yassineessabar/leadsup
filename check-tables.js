const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function checkTables() {
  console.log('🔍 CHECKING AVAILABLE TABLES');
  console.log('============================\n');
  
  const tableNames = [
    'senders', 
    'email_senders', 
    'campaign_senders',
    'gmail_accounts',
    'email_accounts',
    'smtp_accounts'
  ];
  
  for (const tableName of tableNames) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
        
      if (!error) {
        console.log(`✅ Table '${tableName}' exists`);
        if (data && data.length > 0) {
          console.log('   Sample columns:', Object.keys(data[0]).join(', '));
        }
      } else {
        console.log(`❌ Table '${tableName}' does not exist`);
      }
    } catch (e) {
      console.log(`❌ Table '${tableName}' error:`, e.message);
    }
  }
}

checkTables();