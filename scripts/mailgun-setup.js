#!/usr/bin/env node

/**
 * Mailgun Setup Script
 * 
 * This script helps you set up Mailgun for direct email capture
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function setupMailgun() {
  console.log('📧 MAILGUN SETUP & TEST')
  console.log('=======================\n')
  
  const API_KEY = process.env.MAILGUN_API_KEY
  
  if (!API_KEY || API_KEY === 'your-mailgun-api-key') {
    console.error('❌ MAILGUN_API_KEY not configured')
    console.log('Add to .env.local: MAILGUN_API_KEY=your-key')
    return
  }
  
  console.log(`🔑 Using API Key: ${API_KEY.substring(0, 10)}...`)
  console.log('')
  
  try {
    console.log('🔍 Step 1: Check Mailgun Account Info')
    console.log('====================================')
    
    // Get account info
    const accountResponse = await fetch('https://api.mailgun.net/v3/account', {
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${API_KEY}`).toString('base64')}`
      }
    })
    
    if (accountResponse.ok) {
      const accountData = await accountResponse.json()
      console.log('✅ Mailgun account active')
      console.log(`   Account ID: ${accountData.account?.id || 'N/A'}`)
      console.log(`   Email: ${accountData.account?.email || 'N/A'}`)
    } else {
      console.log('❌ Failed to get account info')
      const error = await accountResponse.text()
      console.log('Error:', error)
    }
    
    console.log('')
    console.log('🔍 Step 2: List Domains')
    console.log('======================')
    
    // List domains
    const domainsResponse = await fetch('https://api.mailgun.net/v3/domains', {
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${API_KEY}`).toString('base64')}`
      }
    })
    
    if (domainsResponse.ok) {
      const domainsData = await domainsResponse.json()
      console.log(`📧 Found ${domainsData.total_count} domain(s):`)
      
      domainsData.items?.forEach((domain, i) => {
        console.log(`   ${i + 1}. ${domain.name}`)
        console.log(`      Status: ${domain.state}`)
        console.log(`      Type: ${domain.type}`)
        console.log(`      Created: ${new Date(domain.created_at).toLocaleString()}`)
        console.log('')
      })
      
      // Use the first domain for testing
      const testDomain = domainsData.items?.[0]?.name
      if (testDomain) {
        console.log(`🎯 Using domain for testing: ${testDomain}`)
        
        console.log('')
        console.log('🔍 Step 3: Test Webhook Endpoint')
        console.log('===============================')
        
        // Test our webhook endpoint
        const webhookUrl = 'http://localhost:3000/api/webhooks/mailgun'
        console.log(`📡 Testing webhook: ${webhookUrl}`)
        
        try {
          const webhookResponse = await fetch(webhookUrl)
          if (webhookResponse.ok) {
            const webhookData = await webhookResponse.json()
            console.log('✅ Webhook endpoint is accessible')
            console.log(`   Status: ${webhookData.status}`)
          } else {
            console.log('❌ Webhook endpoint not accessible')
            console.log('   Make sure your app is running: npm run dev')
          }
        } catch (error) {
          console.log('❌ Cannot reach webhook endpoint')
          console.log('   Make sure your app is running: npm run dev')
        }
        
        console.log('')
        console.log('🔍 Step 4: Setup Instructions')
        console.log('============================')
        console.log('')
        console.log('To complete Mailgun setup:')
        console.log('')
        console.log('1. 🌐 Go to Mailgun Dashboard: https://app.mailgun.com/')
        console.log('2. 📧 Go to Receiving → Routes')
        console.log('3. ➕ Create New Route:')
        console.log('')
        console.log('   Priority: 10')
        console.log(`   Expression: match_recipient(".*@${testDomain}")`)
        console.log('   Action: forward("https://your-app.com/api/webhooks/mailgun")')
        console.log('   Description: LeadsUp Email Capture')
        console.log('')
        console.log('4. 💾 Save Route')
        console.log('')
        console.log('5. 🧪 Test by sending email to: test@' + testDomain)
        console.log('')
        
        console.log('📋 Your Webhook URLs:')
        console.log('=====================')
        console.log('🏠 Local (for testing): http://localhost:3000/api/webhooks/mailgun')
        console.log('🌍 Production: https://your-app.com/api/webhooks/mailgun')
        console.log('')
        
        console.log('⚠️  Important Notes:')
        console.log('===================')
        console.log('• Use HTTPS in production (required by Mailgun)')
        console.log('• Configure webhook signing key for security')
        console.log('• Test with real emails to verify routing')
        console.log('')
        
      } else {
        console.log('⚠️  No domains found')
        console.log('Add a domain in Mailgun dashboard first')
      }
      
    } else {
      console.log('❌ Failed to get domains')
      const error = await domainsResponse.text()
      console.log('Error:', error)
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.log('')
    console.log('Troubleshooting:')
    console.log('• Check your API key is correct')
    console.log('• Verify internet connection')
    console.log('• Make sure Mailgun account is active')
  }
  
  console.log('')
  console.log('🎯 Next Steps:')
  console.log('=============')
  console.log('1. Set up route in Mailgun dashboard')
  console.log('2. Test: node scripts/test-mailgun-webhook.js')
  console.log('3. Send real email to test domain')
  console.log('4. Monitor: node scripts/monitor-real-response.js')
}

// Run setup
setupMailgun().then(() => {
  console.log('✅ Mailgun setup complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Setup failed:', error)
  process.exit(1)
})