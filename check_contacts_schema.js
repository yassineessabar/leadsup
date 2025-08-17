const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSchema() {
  try {
    console.log('🔍 Checking contacts table schema...')
    
    // Try to get one contact to see the structure
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    if (contacts && contacts.length > 0) {
      console.log('✅ Found contact with columns:')
      console.log(Object.keys(contacts[0]))
      console.log('\n📋 Sample contact:')
      console.log(contacts[0])
    } else {
      console.log('ℹ️ No contacts found in table')
      
      // Try to insert a minimal contact to see what's required
      console.log('🧪 Testing minimal insert...')
      const { data, error: insertError } = await supabase
        .from('contacts')
        .insert({
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User'
        })
        .select()
      
      if (insertError) {
        console.log('❌ Insert failed:', insertError)
        console.log('This tells us what columns are required')
      } else {
        console.log('✅ Minimal insert worked:', data)
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkSchema()