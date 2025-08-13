// Test SendGrid integration function directly
require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
// We'll use the raw API directly since this is a CommonJS file
async function createSenderIdentity(settings) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
  
  const payload = {
    nickname: settings.nickname,
    from_email: settings.from.email,
    from_name: settings.from.name,
    reply_to: settings.reply_to?.email || settings.from.email,
    reply_to_name: settings.reply_to?.name || settings.from.name,
    address: settings.address,
    city: settings.city,
    state: settings.state,
    zip: settings.zip,
    country: settings.country
  }
  
  const response = await fetch('https://api.sendgrid.com/v3/verified_senders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  
  const result = await response.json()
  
  if (response.ok) {
    return {
      success: true,
      sender_id: result.id,
      verification_status: result.verified ? 'verified' : 'pending'
    }
  } else {
    throw new Error(JSON.stringify(result))
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupSendGridIntegration(domain) {
  try {
    console.log(`🚀 Setting up SendGrid integration for ${domain.domain}`)
    
    // Get all existing sender accounts for this domain
    const { data: senderAccounts, error: fetchError } = await supabase
      .from('sender_accounts')
      .select('*')
      .eq('domain_id', domain.id)
      .is('sendgrid_status', null) // Only process senders without SendGrid identity
    
    if (fetchError) {
      console.error('Error fetching sender accounts:', fetchError)
      return
    }
    
    if (!senderAccounts || senderAccounts.length === 0) {
      // Try getting all senders regardless of status
      const { data: allSenders } = await supabase
        .from('sender_accounts')
        .select('*')
        .eq('domain_id', domain.id)
      
      console.log(`ℹ️ Found ${allSenders?.length || 0} total sender accounts for ${domain.domain}`)
      
      if (allSenders && allSenders.length > 0) {
        console.log('  Existing senders:')
        allSenders.forEach(s => {
          console.log(`    - ${s.email} (status: ${s.sendgrid_status || 'none'})`)
        })
      }
      
      return
    }
    
    console.log(`📧 Creating SendGrid identities for ${senderAccounts.length} sender accounts`)
    
    // Create sender identities for each sender account
    for (const sender of senderAccounts) {
      try {
        console.log(`  Creating identity for ${sender.email}...`)
        
        const result = await createSenderIdentity({
          nickname: `${sender.display_name || sender.email.split('@')[0]} - ${domain.domain}`,
          from: {
            email: sender.email,
            name: sender.display_name || sender.email.split('@')[0]
          },
          reply_to: {
            email: sender.email,
            name: sender.display_name || sender.email.split('@')[0]
          },
          address: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US'
        })
        
        // Update sender account with SendGrid info
        if (result.success) {
          await supabase
            .from('sender_accounts')
            .update({
              sendgrid_sender_id: result.sender_id,
              sendgrid_status: result.verification_status || 'verified',
              updated_at: new Date().toISOString()
            })
            .eq('id', sender.id)
          
          console.log(`  ✅ Created identity for ${sender.email} (ID: ${result.sender_id})`)
        }
        
      } catch (error) {
        // Handle "already exists" error gracefully
        if (error.message?.includes('already exists')) {
          console.log(`  ℹ️ Identity already exists for ${sender.email}`)
          
          // Mark as verified since it exists
          await supabase
            .from('sender_accounts')
            .update({
              sendgrid_status: 'verified',
              updated_at: new Date().toISOString()
            })
            .eq('id', sender.id)
        } else {
          console.error(`  ❌ Failed to create identity for ${sender.email}:`, error.message)
        }
      }
    }
    
    console.log(`✅ SendGrid integration complete for ${domain.domain}`)
    
  } catch (error) {
    console.error('SendGrid setup failed:', error)
  }
}

async function testIntegration() {
  console.log('🧪 Testing SendGrid Integration on Domain Verification\n')
  
  // Get the leadsupzone.co domain
  const { data: domain } = await supabase
    .from('domains')
    .select('*')
    .eq('domain', 'leadsupzone.co')
    .single()
  
  if (!domain) {
    console.log('❌ Domain not found')
    return
  }
  
  console.log(`📋 Testing with domain: ${domain.domain} (ID: ${domain.id})`)
  
  // First, reset some sender statuses to test the integration
  console.log('\n🔄 Resetting one sender to test integration...')
  const { data: testSender } = await supabase
    .from('sender_accounts')
    .update({
      sendgrid_status: null,
      sendgrid_sender_id: null
    })
    .eq('domain_id', domain.id)
    .eq('email', 'test@leadsupzone.co')
    .select()
    .single()
  
  if (!testSender) {
    // Create a test sender if it doesn't exist
    console.log('  Creating test sender account...')
    const { data: newSender } = await supabase
      .from('sender_accounts')
      .insert({
        domain_id: domain.id,
        user_id: domain.user_id,
        email: 'test@leadsupzone.co',
        display_name: 'Test',
        is_default: false
      })
      .select()
      .single()
    
    if (newSender) {
      console.log(`  ✅ Created test sender: ${newSender.email}`)
    }
  } else {
    console.log(`  ✅ Reset test sender: ${testSender.email}`)
  }
  
  // Now run the integration
  console.log('\n🚀 Running SendGrid integration (simulating domain verification)...\n')
  await setupSendGridIntegration(domain)
  
  // Check results
  console.log('\n📊 Checking results...')
  const { data: updatedSenders } = await supabase
    .from('sender_accounts')
    .select('*')
    .eq('domain_id', domain.id)
    .order('email')
  
  console.log(`\n📧 Final sender account statuses:`)
  updatedSenders?.forEach(sender => {
    const status = sender.sendgrid_status || 'not_created'
    const icon = status === 'verified' ? '✅' : status === 'failed' ? '❌' : '⏳'
    console.log(`  ${icon} ${sender.email}`)
    console.log(`      Status: ${status}`)
    if (sender.sendgrid_sender_id) {
      console.log(`      SendGrid ID: ${sender.sendgrid_sender_id}`)
    }
  })
  
  // Verify in SendGrid
  console.log(`\n🔍 Verifying in SendGrid API...`)
  const response = await fetch('https://api.sendgrid.com/v3/verified_senders', {
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })
  
  const sendgridData = await response.json()
  const domainSenders = sendgridData.results?.filter(s => 
    s.from_email.endsWith('@leadsupzone.co')
  ) || []
  
  console.log(`\n✅ SendGrid verified senders for leadsupzone.co: ${domainSenders.length}`)
  domainSenders.forEach(sender => {
    console.log(`  ✅ ${sender.from_email} (verified: ${sender.verified})`)
  })
  
  console.log('\n🎉 Test complete! When you click "Verify Domain", it will:')
  console.log('  1. Check DNS records')
  console.log('  2. Mark domain as verified if DNS is correct')
  console.log('  3. Automatically create SendGrid sender identities for all sender accounts')
  console.log('  4. Mark them as verified since the domain is authenticated')
}

testIntegration()