// Reset sequence_step to 0 for test contacts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetContacts() {
  try {
    console.log('🔧 Resetting contacts sequence_step to 0...')
    
    const { data, error } = await supabase
      .from('contacts')
      .update({
        sequence_step: 0,
        last_contacted_at: null
      })
      .in('id', [1525, 1526])
      .select('id, sequence_step, last_contacted_at')
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log('✅ Contacts reset:', data)
  } catch (error) {
    console.error('❌ Reset error:', error)
  }
}

resetContacts()