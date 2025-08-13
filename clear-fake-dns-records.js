// Clear fake DNS records so API fetches real ones from SendGrid
const { createClient } = require('@supabase/supabase-js')

// You'll need to provide these from your .env file
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables')
  console.log('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function clearFakeDnsRecords() {
  try {
    console.log('🔧 Clearing fake DNS records for all domains...')
    
    // Find all domains with stored DNS records
    const { data: domains, error: findError } = await supabase
      .from('domains')
      .select('*')
      .not('dns_records', 'is', null)
    
    if (findError) {
      console.error('❌ Error finding domains:', findError)
      return
    }
    
    console.log(`📋 Found ${domains?.length || 0} domains with stored DNS records`)
    
    if (!domains || domains.length === 0) {
      console.log('✅ No domains with stored DNS records found')
      return
    }
    
    // Show which domains have fake records (check for "mail" or "url1234")
    const domainsWithFakeRecords = domains.filter(domain => {
      const records = domain.dns_records || []
      return records.some(record => 
        record.host === 'mail' || 
        record.host === 'url1234' || 
        (record.value && record.value.includes('u1234567.wl123.sendgrid.net'))
      )
    })
    
    console.log(`🎯 Found ${domainsWithFakeRecords.length} domains with fake DNS records:`)
    domainsWithFakeRecords.forEach(domain => {
      console.log(`  - ${domain.domain} (ID: ${domain.id})`)
    })
    
    if (domainsWithFakeRecords.length === 0) {
      console.log('✅ No fake DNS records found!')
      return
    }
    
    // Clear the fake DNS records
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        dns_records: null, // Clear stored records
        updated_at: new Date().toISOString()
      })
      .in('id', domainsWithFakeRecords.map(d => d.id))
    
    if (updateError) {
      console.error('❌ Error clearing DNS records:', updateError)
      return
    }
    
    console.log(`✅ Cleared fake DNS records for ${domainsWithFakeRecords.length} domains`)
    console.log('🚀 Next DNS API call will fetch REAL SendGrid records!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

clearFakeDnsRecords()