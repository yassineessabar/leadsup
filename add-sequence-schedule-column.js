const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addSequenceScheduleColumn() {
  try {
    console.log('📊 Adding sequence_schedule column to contacts table...')
    
    // Add the column using raw SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add sequence_schedule column to store full contact sequence timing
        ALTER TABLE contacts 
        ADD COLUMN IF NOT EXISTS sequence_schedule JSONB;
        
        -- Add index for performance when querying schedule data  
        CREATE INDEX IF NOT EXISTS idx_contacts_sequence_schedule 
        ON contacts USING GIN (sequence_schedule);
      `
    })
    
    if (error) {
      console.error('❌ Error adding column:', error)
      return
    }
    
    console.log('✅ Successfully added sequence_schedule column')
    
    // Test that the column was added
    const { data: testContact } = await supabase
      .from('contacts')
      .select('id, sequence_schedule')
      .limit(1)
      .single()
    
    if (testContact) {
      console.log('✅ Column is accessible, current value:', testContact.sequence_schedule)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

addSequenceScheduleColumn()