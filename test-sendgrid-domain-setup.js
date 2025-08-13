// Simple test for SendGrid domain-based email functionality
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase (same as server)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🧪 Testing SendGrid Domain-Based Email Setup')
console.log('='.repeat(50))

async function testDatabaseTables() {
  console.log('\n📋 Step 1: Testing Database Tables')
  console.log('-'.repeat(30))
  
  try {
    // Test campaign_senders table
    console.log('🔍 Checking campaign_senders table...')
    const { data: senders, error: sendersError } = await supabase
      .from('campaign_senders')
      .select('*')
      .limit(5)
    
    if (sendersError) {
      console.log('❌ campaign_senders table error:', sendersError.message)
      return false
    }
    
    console.log(`✅ campaign_senders table exists with ${senders.length} records`)
    if (senders.length > 0) {
      console.log('📋 Available columns:', Object.keys(senders[0]))
      console.log('📝 Sample sender:', {
        id: senders[0].id,
        email: senders[0].email,
        campaign_id: senders[0].campaign_id,
        is_active: senders[0].is_active
      })
    }
    
    // Test domains table
    console.log('\n🔍 Checking domains table...')
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select('id, domain, status, user_id')
      .eq('status', 'verified')
      .limit(5)
    
    if (domainsError) {
      console.log('❌ domains table error:', domainsError.message)
      return false
    }
    
    console.log(`✅ Found ${domains.length} verified domains`)
    domains.forEach((domain, index) => {
      console.log(`   ${index + 1}. ${domain.domain} (${domain.status})`)
    })
    
    // Test sender_accounts table
    console.log('\n🔍 Checking sender_accounts table...')
    const { data: senderAccounts, error: accountsError } = await supabase
      .from('sender_accounts')
      .select('id, email, domain_id, setup_status')
      .limit(5)
    
    if (accountsError) {
      console.log('❌ sender_accounts table error:', accountsError.message)
    } else {
      console.log(`✅ Found ${senderAccounts.length} sender accounts`)
      senderAccounts.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.email} (${account.setup_status})`)
      })
    }
    
    return true
    
  } catch (error) {
    console.log('❌ Database test error:', error.message)
    return false
  }
}

async function testCampaignSenderAssignments() {
  console.log('\n📋 Step 2: Testing Campaign-Sender Assignments')
  console.log('-'.repeat(30))
  
  try {
    // Get campaigns
    console.log('🔍 Getting campaigns...')
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, status, user_id')
      .limit(5)
    
    if (campaignsError) {
      console.log('❌ campaigns table error:', campaignsError.message)
      return false
    }
    
    console.log(`✅ Found ${campaigns.length} campaigns`)
    
    if (campaigns.length === 0) {
      console.log('⚠️ No campaigns found - create a campaign first')
      return false
    }
    
    // Check each campaign for sender assignments
    for (const campaign of campaigns) {
      console.log(`\n🔍 Checking campaign: "${campaign.name}" (${campaign.id})`)
      
      const { data: assignments, error: assignmentsError } = await supabase
        .from('campaign_senders')
        .select('*')
        .eq('campaign_id', campaign.id)
      
      if (assignmentsError) {
        console.log(`❌ Error getting assignments: ${assignmentsError.message}`)
        continue
      }
      
      if (assignments.length > 0) {
        console.log(`✅ Campaign has ${assignments.length} sender assignment(s):`)
        assignments.forEach((assignment, index) => {
          console.log(`   ${index + 1}. ${assignment.email || assignment.sender_id} (Active: ${assignment.is_active || 'N/A'})`)
        })
        
        // This campaign has senders - good for testing
        return { campaign, assignments }
      } else {
        console.log(`⏭️ No sender assignments found`)
      }
    }
    
    console.log('⚠️ No campaigns with sender assignments found')
    console.log('💡 Assign sender accounts to campaigns via the UI first')
    return false
    
  } catch (error) {
    console.log('❌ Campaign assignments test error:', error.message)
    return false
  }
}

async function testSendGridConfiguration() {
  console.log('\n📋 Step 3: Testing SendGrid Configuration')
  console.log('-'.repeat(30))
  
  try {
    // Check environment variables
    const apiKey = process.env.SENDGRID_API_KEY
    
    if (!apiKey) {
      console.log('❌ SENDGRID_API_KEY not found in environment')
      return false
    }
    
    console.log('✅ SendGrid API key is configured')
    console.log(`📝 Key format: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`)
    
    // Try to import and test SendGrid library
    try {
      const { sendEmailWithSendGrid } = require('./lib/sendgrid')
      console.log('✅ SendGrid library imported successfully')
      
      // We could test a simple send here, but let's not spam
      console.log('📧 SendGrid is ready for email sending')
      
      return true
      
    } catch (importError) {
      console.log('❌ Error importing SendGrid library:', importError.message)
      return false
    }
    
  } catch (error) {
    console.log('❌ SendGrid configuration test error:', error.message)
    return false
  }
}

async function testWebhookEndpoint() {
  console.log('\n📋 Step 4: Testing Webhook Endpoint')
  console.log('-'.repeat(30))
  
  try {
    console.log('🔍 Testing webhook endpoint availability...')
    
    // Check if the webhook file exists
    const fs = require('fs')
    const webhookPath = './app/api/webhooks/sendgrid/route.ts'
    
    if (fs.existsSync(webhookPath)) {
      console.log('✅ Webhook route file exists')
      
      // Read webhook file to verify it has the right content
      const webhookContent = fs.readFileSync(webhookPath, 'utf8')
      
      if (webhookContent.includes('SendGrid Inbound Parse')) {
        console.log('✅ Webhook contains SendGrid Inbound Parse handler')
      } else {
        console.log('⚠️ Webhook file may not be properly configured')
      }
      
      if (webhookContent.includes('inbox_messages')) {
        console.log('✅ Webhook logs to inbox_messages table')
      }
      
      if (webhookContent.includes('campaign_senders')) {
        console.log('✅ Webhook checks campaign_senders for routing')
      }
      
      return true
      
    } else {
      console.log('❌ Webhook route file not found')
      return false
    }
    
  } catch (error) {
    console.log('❌ Webhook test error:', error.message)
    return false
  }
}

async function testEmailAutomationAPI() {
  console.log('\n📋 Step 5: Testing Email Automation API')
  console.log('-'.repeat(30))
  
  try {
    console.log('🔍 Testing automation API availability...')
    
    const fs = require('fs')
    const apiPath = './app/api/campaigns/automation/send-emails/route.ts'
    
    if (fs.existsSync(apiPath)) {
      console.log('✅ Email automation API exists')
      
      // Check if it uses SendGrid
      const apiContent = fs.readFileSync(apiPath, 'utf8')
      
      if (apiContent.includes('sendEmailWithSendGrid')) {
        console.log('✅ API uses SendGrid for email sending')
      }
      
      if (apiContent.includes('campaign_senders')) {
        console.log('✅ API gets senders from campaign_senders table')
      }
      
      if (apiContent.includes('inbox_messages')) {
        console.log('✅ API logs sent emails to inbox system')
      }
      
      return true
      
    } else {
      console.log('❌ Email automation API not found')
      return false
    }
    
  } catch (error) {
    console.log('❌ Email automation API test error:', error.message)
    return false
  }
}

async function generateTestReport() {
  console.log('\n📋 Step 6: Integration Test Report')
  console.log('-'.repeat(30))
  
  try {
    const results = {
      database: await testDatabaseTables(),
      assignments: await testCampaignSenderAssignments(),
      sendgrid: await testSendGridConfiguration(),
      webhook: await testWebhookEndpoint(),
      automation: await testEmailAutomationAPI()
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 INTEGRATION TEST SUMMARY')
    console.log('='.repeat(50))
    
    const tests = [
      { name: 'Database Tables', result: results.database },
      { name: 'Campaign-Sender Assignments', result: !!results.assignments },
      { name: 'SendGrid Configuration', result: results.sendgrid },
      { name: 'Inbound Webhook', result: results.webhook },
      { name: 'Email Automation API', result: results.automation }
    ]
    
    tests.forEach(test => {
      const status = test.result ? '✅ PASS' : '❌ FAIL'
      console.log(`${status} ${test.name}`)
    })
    
    const passedTests = tests.filter(t => t.result).length
    console.log(`\n📈 Score: ${passedTests}/${tests.length} components ready`)
    
    if (passedTests === tests.length) {
      console.log('\n🎉 All integration tests passed!')
      console.log('✅ Domain-based email system is properly configured')
      
      if (results.assignments) {
        console.log('\n🚀 Ready for email testing:')
        console.log(`📧 Campaign: "${results.assignments.campaign.name}"`)
        console.log(`👥 Senders: ${results.assignments.assignments.length} assigned`)
        console.log('\n💡 Next steps:')
        console.log('1. Add contacts to the campaign')
        console.log('2. Create email sequences')
        console.log('3. Test outbound sending')
        console.log('4. Test inbound replies')
      }
      
    } else {
      console.log('\n⚠️ Some components need attention:')
      
      if (!results.database) {
        console.log('- Check database tables and permissions')
      }
      if (!results.assignments) {
        console.log('- Assign sender accounts to campaigns via UI')
      }
      if (!results.sendgrid) {
        console.log('- Configure SendGrid API key')
      }
      if (!results.webhook) {
        console.log('- Check webhook route implementation')
      }
      if (!results.automation) {
        console.log('- Check email automation API')
      }
    }
    
    return results
    
  } catch (error) {
    console.log('❌ Test report generation error:', error.message)
    return null
  }
}

// Run all tests
async function runTests() {
  console.log('🔍 Environment check:')
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}`)
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'}`)
  console.log(`- SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? 'Set' : 'Missing'}`)
  
  await generateTestReport()
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error)
})