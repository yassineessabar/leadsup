const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumn() {
  try {
    // Try to select sequence_schedule to see if column exists
    const { data, error } = await supabase
      .from('contacts')
      .select('id, sequence_schedule')
      .limit(1)
    
    if (error) {
      if (error.message.includes('sequence_schedule')) {
        console.log('❌ sequence_schedule column does not exist yet')
        console.log('📋 Need to add the column first')
        return false
      } else {
        console.error('❌ Other error:', error)
        return false
      }
    }
    
    console.log('✅ sequence_schedule column exists')
    console.log('📊 Sample data:', data?.[0])
    return true
    
  } catch (error) {
    console.error('❌ Error checking column:', error.message)
    return false
  }
}

checkColumn()