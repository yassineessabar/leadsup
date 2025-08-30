// Test script to check why next_email_due is not being saved
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testNextEmailDue() {
  console.log('🔍 Testing next_email_due field...')
  
  // 1. Check if columns exist
  console.log('\n1. Checking table schema...')
  const { data: columns, error: schemaError } = await supabase
    .rpc('get_table_columns', { table_name: 'contacts' })
    .select()
  
  if (schemaError) {
    console.log('❌ Schema check failed, trying direct query...')
    
    // Try direct query to see column structure - test only next_email_due first
    const { data: sample, error: sampleError } = await supabase
      .from('contacts')
      .select('id, next_email_due')
      .limit(1)
    
    if (sampleError) {
      console.log('❌ Column error:', sampleError.message)
      return
    } else {
      console.log('✅ Columns exist - sample contact:')
      console.log('📋 Available columns:', Object.keys(sample[0]))
      console.log('📧 Contact:', sample[0].email, 'next_email_due:', sample[0].next_email_due)
    }
  } else {
    console.log('✅ Table columns:', columns)
  }
  
  // 2. Test direct update of next_email_due
  console.log('\n2. Testing direct update...')
  const testDate = new Date()
  testDate.setHours(testDate.getHours() + 1) // 1 hour from now
  
  // Get a contact to test with  
  const { data: contacts, error: getError } = await supabase
    .from('contacts')
    .select('*')
    .limit(1)
  
  if (getError) {
    console.log('❌ Error getting contact:', getError.message)
    return
  }
  
  if (!contacts || contacts.length === 0) {
    console.log('❌ No contacts found')
    return
  }
  
  const testContact = contacts[0]
  console.log(`📧 Testing with contact: ${testContact.email} (ID: ${testContact.id})`)
  console.log(`📅 Current next_email_due: ${testContact.next_email_due}`)
  
  // Try to update next_email_due only (without timezone)
  const { data: updateResult, error: updateError } = await supabase
    .from('contacts')
    .update({ 
      next_email_due: testDate.toISOString()
    })
    .eq('id', testContact.id)
    .select('id, email, next_email_due')
  
  if (updateError) {
    console.log('❌ Update error:', updateError.message)
    console.log('❌ Update error details:', updateError)
  } else {
    console.log('✅ Update successful:', updateResult)
  }
  
  // 3. Verify the update worked
  console.log('\n3. Verifying update...')
  const { data: verify, error: verifyError } = await supabase
    .from('contacts')
    .select('id, email, next_email_due')
    .eq('id', testContact.id)
    .single()
  
  if (verifyError) {
    console.log('❌ Verify error:', verifyError.message)
  } else {
    console.log('✅ Final state:', verify)
  }
  
  // 4. Check campaign sequences
  console.log('\n4. Checking campaign sequences...')
  const { data: sequences, error: seqError } = await supabase
    .from('campaign_sequences')
    .select('*')
    .limit(5)
  
  if (seqError) {
    console.log('❌ Sequences error:', seqError.message)
  } else {
    console.log('📋 Campaign sequences:', sequences)
  }
  
  // 5. Check all contacts next_email_due values
  console.log('\n5. Checking all contacts next_email_due...')
  const { data: allContacts, error: allError } = await supabase
    .from('contacts')
    .select('id, email, next_email_due, sequence_step')
    .order('id')
  
  if (allError) {
    console.log('❌ All contacts error:', allError.message)
  } else {
    console.log('📊 All contacts timing:')
    allContacts.forEach(c => {
      console.log(`   ${c.email}: step=${c.sequence_step}, next_due=${c.next_email_due}`)
    })
  }
}

testNextEmailDue().catch(console.error)