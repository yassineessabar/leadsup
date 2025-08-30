const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  // Check what columns exist in campaign_sequences
  const { data: sequences, error } = await supabase
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', '2e2fbedd-6df7-4db5-928a-ab96e2e5658e')
    .limit(1)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  if (sequences && sequences.length > 0) {
    console.log('\n📋 Campaign Sequences Schema:')
    console.log('Available columns:', Object.keys(sequences[0]))
    console.log('\nFirst sequence:', sequences[0])
  } else {
    console.log('No sequences found for this campaign')
  }
}

checkSchema()