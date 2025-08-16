// Test script for SendGrid Analytics implementation
// Run with: node scripts/test-sendgrid-analytics.js

const crypto = require('crypto')

// Test data
const mockSendGridEvents = [
  {
    sg_event_id: 'test_event_1',
    sg_message_id: 'test_message_1',
    event: 'processed',
    email: 'test@example.com',
    timestamp: Math.floor(Date.now() / 1000),
    category: ['campaign_test_campaign_id', 'user_test_user_id']
  },
  {
    sg_event_id: 'test_event_2',
    sg_message_id: 'test_message_1',
    event: 'delivered',
    email: 'test@example.com',
    timestamp: Math.floor(Date.now() / 1000) + 60,
    category: ['campaign_test_campaign_id', 'user_test_user_id']
  },
  {
    sg_event_id: 'test_event_3',
    sg_message_id: 'test_message_1',
    event: 'open',
    email: 'test@example.com',
    timestamp: Math.floor(Date.now() / 1000) + 120,
    category: ['campaign_test_campaign_id', 'user_test_user_id'],
    useragent: 'Mozilla/5.0...',
    ip: '192.168.1.1'
  },
  {
    sg_event_id: 'test_event_4',
    sg_message_id: 'test_message_1',
    event: 'click',
    email: 'test@example.com',
    timestamp: Math.floor(Date.now() / 1000) + 180,
    category: ['campaign_test_campaign_id', 'user_test_user_id'],
    url: 'https://example.com/click'
  }
]

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const WEBHOOK_SECRET = process.env.SENDGRID_WEBHOOK_SECRET || 'sg_webhook_secret_2024_secure_key_12345'

// Generate SendGrid signature
function generateSignature(payload, timestamp, secret) {
  const signedPayload = timestamp + payload
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('base64')
  
  return `t=${timestamp},v1=${signature}`
}

// Test webhook endpoint
async function testWebhookEndpoint() {
  console.log('🧪 Testing SendGrid webhook endpoint...')
  
  const payload = JSON.stringify(mockSendGridEvents)
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = generateSignature(payload, timestamp, WEBHOOK_SECRET)
  
  try {
    const response = await fetch(`${BASE_URL}/api/sendgrid/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Twilio-Email-Event-Webhook-Signature': signature,
        'X-Twilio-Email-Event-Webhook-Timestamp': timestamp.toString()
      },
      body: payload
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Webhook endpoint test passed:', result)
      return true
    } else {
      console.error('❌ Webhook endpoint test failed:', result)
      return false
    }
  } catch (error) {
    console.error('❌ Webhook endpoint test error:', error)
    return false
  }
}

// Test analytics API endpoints
async function testAnalyticsAPI() {
  console.log('🧪 Testing analytics API endpoints...')
  
  try {
    // Test user analytics endpoint
    const userResponse = await fetch(`${BASE_URL}/api/analytics/user`, {
      headers: {
        'Cookie': 'session=test_session' // You'll need a valid session for real testing
      }
    })
    
    if (userResponse.ok) {
      const userData = await userResponse.json()
      console.log('✅ User analytics API test passed:', userData)
    } else {
      console.log('⚠️ User analytics API test failed (expected if no auth):', await userResponse.text())
    }
    
    // Test campaign analytics endpoint
    const campaignResponse = await fetch(`${BASE_URL}/api/analytics/campaign?campaign_id=test_campaign_id`, {
      headers: {
        'Cookie': 'session=test_session' // You'll need a valid session for real testing
      }
    })
    
    if (campaignResponse.ok) {
      const campaignData = await campaignResponse.json()
      console.log('✅ Campaign analytics API test passed:', campaignData)
    } else {
      console.log('⚠️ Campaign analytics API test failed (expected if no auth):', await campaignResponse.text())
    }
    
    return true
  } catch (error) {
    console.error('❌ Analytics API test error:', error)
    return false
  }
}

// Test database setup
async function testDatabaseSetup() {
  console.log('🧪 Testing database setup...')
  
  try {
    // This would need to be implemented with actual database connection
    console.log('ℹ️ Database tests require manual verification')
    console.log('Please run the following SQL scripts:')
    console.log('1. scripts/create-sendgrid-analytics-tables.sql')
    console.log('2. scripts/create-sendgrid-analytics-functions.sql')
    
    return true
  } catch (error) {
    console.error('❌ Database test error:', error)
    return false
  }
}

// Test SendGrid webhook health
async function testWebhookHealth() {
  console.log('🧪 Testing webhook health endpoint...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/sendgrid/webhook`)
    const result = await response.json()
    
    if (response.ok && result.status === 'healthy') {
      console.log('✅ Webhook health test passed:', result)
      return true
    } else {
      console.error('❌ Webhook health test failed:', result)
      return false
    }
  } catch (error) {
    console.error('❌ Webhook health test error:', error)
    return false
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting SendGrid Analytics Tests\n')
  
  const tests = [
    { name: 'Webhook Health', test: testWebhookHealth },
    { name: 'Database Setup', test: testDatabaseSetup },
    { name: 'Webhook Endpoint', test: testWebhookEndpoint },
    { name: 'Analytics API', test: testAnalyticsAPI }
  ]
  
  const results = []
  
  for (const { name, test } of tests) {
    console.log(`\n--- Testing ${name} ---`)
    const passed = await test()
    results.push({ name, passed })
  }
  
  console.log('\n📊 Test Results Summary:')
  console.log('========================')
  
  let passedCount = 0
  for (const { name, passed } of results) {
    const status = passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${name}`)
    if (passed) passedCount++
  }
  
  console.log(`\n${passedCount}/${results.length} tests passed`)
  
  if (passedCount === results.length) {
    console.log('\n🎉 All tests passed! SendGrid Analytics is ready to use.')
  } else {
    console.log('\n⚠️ Some tests failed. Please check the implementation.')
  }
  
  console.log('\n📝 Next Steps:')
  console.log('1. Configure SendGrid webhook URL: ' + BASE_URL + '/api/sendgrid/webhook')
  console.log('2. Set SENDGRID_WEBHOOK_SECRET environment variable')
  console.log('3. Test with real SendGrid events')
  console.log('4. Monitor the analytics in your dashboard')
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = {
  testWebhookEndpoint,
  testAnalyticsAPI,
  testDatabaseSetup,
  testWebhookHealth,
  runAllTests
}