// Fix DNS records for leadsupbase.co domain
// This will clear the stored fake records so the API fetches real SendGrid records

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixDNSRecords() {
  try {
    console.log('🔧 Fixing DNS records for leadsupbase.co...')
    
    // Find the domain
    const { data: domains, error: findError } = await supabase
      .from('domains')
      .select('*')
      .eq('domain', 'leadsupbase.co')
    
    if (findError) {
      console.error('❌ Error finding domain:', findError)
      return
    }
    
    if (!domains || domains.length === 0) {
      console.log('⚠️ Domain leadsupbase.co not found in database')
      return
    }
    
    const domain = domains[0]
    console.log(`📋 Found domain: ${domain.domain} (ID: ${domain.id})`)
    console.log(`📋 Current DNS records count: ${domain.dns_records?.length || 0}`)
    
    // Clear the stored DNS records so the API fetches fresh ones from SendGrid
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        dns_records: null, // Clear stored records
        updated_at: new Date().toISOString()
      })
      .eq('id', domain.id)
    
    if (updateError) {
      console.error('❌ Error updating domain:', updateError)
      return
    }
    
    console.log('✅ DNS records cleared successfully!')
    console.log('✅ Next API call will fetch real SendGrid records instead of fake ones')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixDNSRecords()