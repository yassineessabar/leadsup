const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSequences() {
  const campaignId = '2e2fbedd-6df7-4db5-928a-ab96e2e5658e'
  
  const { data: sequences, error } = await supabase
    .from('campaign_sequences')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('step_number')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('\n📋 Campaign Sequences:')
  console.log('===============================================')
  
  for (const seq of sequences) {
    console.log(`\nStep ${seq.step_number}:`)
    console.log(`   Subject: ${seq.subject}`)
    console.log(`   Timing: ${seq.timing_days} days`)
    console.log(`   Unit: ${seq.timing_unit}`)
  }
}

checkSequences()