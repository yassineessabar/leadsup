// Test that domain verification creates SendGrid sender identities
require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDomainVerificationFlow() {
  console.log('🧪 Testing Domain Verification → Sender Identity Creation Flow\n')
  
  // Step 1: Check a verified domain (e.g., leadsupzone.co)
  const { data: domains } = await supabase
    .from('domains')
    .select('*')
    .eq('domain', 'leadsupzone.co')
    .single()
  
  if (!domains) {
    console.log('❌ Domain leadsupzone.co not found')
    return
  }
  
  console.log(`📋 Domain found: ${domains.domain} (ID: ${domains.id})\n`)
  
  // Step 2: Check sender accounts for this domain
  const { data: senders } = await supabase
    .from('sender_accounts')
    .select('*')
    .eq('domain_id', domains.id)
  
  console.log(`📧 Found ${senders?.length || 0} sender accounts:`)
  senders?.forEach(sender => {
    const status = sender.sendgrid_status || 'not_created'
    const icon = status === 'verified' ? '✅' : '⏳'
    console.log(`  ${icon} ${sender.email} - SendGrid status: ${status}`)
  })
  
  // Step 3: Test the verification endpoint
  console.log(`\n🔄 Calling domain verification endpoint for ${domains.domain}...`)
  
  try {
    const response = await fetch(`http://localhost:3000/api/domains/${domains.id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add a mock session cookie if needed
        'Cookie': 'session=mock-session-for-testing'
      }
    })
    
    const result = await response.json()
    
    if (result.success && result.domainReady) {
      console.log(`\n✅ Domain verification successful!`)
      console.log(`   Domain status: ${result.status}`)
      console.log(`   Domain ready: ${result.domainReady}`)
      
      // Wait a moment for async operations
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Step 4: Check if sender identities were created
      console.log(`\n📊 Checking updated sender accounts...`)
      
      const { data: updatedSenders } = await supabase
        .from('sender_accounts')
        .select('*')
        .eq('domain_id', domains.id)
      
      console.log(`\n📧 Updated sender accounts:`)
      updatedSenders?.forEach(sender => {
        const status = sender.sendgrid_status || 'not_created'
        const icon = status === 'verified' ? '✅' : status === 'failed' ? '❌' : '⏳'
        console.log(`  ${icon} ${sender.email}`)
        console.log(`      SendGrid Status: ${status}`)
        console.log(`      SendGrid ID: ${sender.sendgrid_sender_id || 'none'}`)
      })
      
      // Check SendGrid directly
      console.log(`\n🔍 Verifying in SendGrid...`)
      
      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/verified_senders', {
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      const sendgridData = await sendgridResponse.json()
      
      if (sendgridData.results) {
        const domainSenders = sendgridData.results.filter(s => 
          s.from_email.endsWith('@leadsupzone.co')
        )
        
        console.log(`\n📋 SendGrid verified senders for leadsupzone.co:`)
        domainSenders.forEach(sender => {
          console.log(`  ✅ ${sender.from_email} (ID: ${sender.id})`)
        })
      }
      
    } else {
      console.log(`\n❌ Domain verification failed or domain not ready`)
      console.log(`   Response:`, result)
    }
    
  } catch (error) {
    console.error(`\n❌ Error testing verification:`, error.message)
  }
}

testDomainVerificationFlow()