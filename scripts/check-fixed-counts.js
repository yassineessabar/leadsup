#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function checkFixedCounts() {
  const { data: threads } = await supabase
    .from('inbox_threads')
    .select('message_count, contact_email')
    .eq('user_id', '1ecada7a-a538-4ee5-a193-14f5c482f387')
  
  console.log('✅ Updated thread counts:')
  threads.forEach(thread => {
    console.log(`📧 ${thread.contact_email}: ${thread.message_count} message(s)`)
    const moreMessages = thread.message_count > 1 ? thread.message_count - 1 : 0
    if (moreMessages > 0) {
      const plural = moreMessages !== 1 ? 's' : ''
      console.log(`   → Will show: ${moreMessages} more message${plural}`)
    } else {
      console.log(`   → No "more messages" indicator will show`)
    }
  })
}

checkFixedCounts()