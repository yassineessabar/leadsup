#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testExactQuery() {
  console.log('🧪 Testing EXACT sync-due-contacts query...')
  
  const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
  
  try {
    // Test the EXACT query used in sync-due-contacts
    console.log('📊 Running exact query:')
    console.log(`   SELECT * FROM contacts WHERE campaign_id = '${campaignId}'`)
    console.log(`   AND email_status != 'Completed'`)
    console.log(`   AND email_status != 'Replied'`)
    console.log(`   AND email_status != 'Unsubscribed'`)
    console.log(`   AND email_status != 'Bounced'`)
    
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .neq('email_status', 'Completed')
      .neq('email_status', 'Replied') 
      .neq('email_status', 'Unsubscribed')
      .neq('email_status', 'Bounced')
    
    if (contactsError) {
      console.error('❌ Query error:', contactsError)
    } else {
      console.log(`✅ Query result: ${contactsData?.length || 0} contacts found`)
      
      if (contactsData && contactsData.length > 0) {
        console.log('\n📝 Contacts found:')
        contactsData.forEach((c, i) => {
          console.log(`   ${i+1}. ${c.email} (${c.first_name} ${c.last_name})`)
          console.log(`      Status: "${c.email_status}"`)
          console.log(`      Sequence Step: ${c.sequence_step || 0}`)
          console.log(`      Location: ${c.location}`)
          console.log(`      Created: ${c.created_at}`)
          console.log(`      Updated: ${c.updated_at}`)
          console.log('')
        })
      } else {
        console.log('❌ No contacts found! This explains why automation finds 0.')
        
        // Let's check what contacts exist without filters
        console.log('\n🔍 Checking contacts WITHOUT filters...')
        const { data: allContacts } = await supabase
          .from('contacts')
          .select('*')
          .eq('campaign_id', campaignId)
        
        if (allContacts && allContacts.length > 0) {
          console.log(`📋 Found ${allContacts.length} contacts without filters:`)
          allContacts.forEach(c => {
            console.log(`   - ${c.email} - Status: "${c.email_status}" (${c.email_status === null ? 'NULL' : typeof c.email_status})`)
          })
        }
      }
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error)
  }
}

testExactQuery()