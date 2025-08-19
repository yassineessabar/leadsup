#!/usr/bin/env node

/**
 * Test Automation API Directly
 * Helps verify if the deployment is updated and working
 */

async function testAutomationAPI() {
  console.log('🧪 Testing Automation API Directly')
  console.log('═'.repeat(50))
  
  // Get the app URL from environment or ask user to set it
  const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  
  if (!APP_URL) {
    console.log('❌ Please set APP_URL environment variable')
    console.log('   Example: export APP_URL="https://your-app.vercel.app"')
    console.log('   Or: export APP_URL="http://localhost:3002"')
    process.exit(1)
  }
  
  const testUrl = `${APP_URL}/api/automation/process-scheduled?testMode=true&lookAhead=5`
  
  console.log(`🌐 Testing URL: ${testUrl}`)
  console.log(`⏰ Test Time: ${new Date().toISOString()}`)
  console.log('')
  
  try {
    console.log('📡 Making API request...')
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Error Response:')
      console.log(errorText.substring(0, 500) + '...')
      return
    }
    
    const data = await response.json()
    
    console.log('\n✅ SUCCESS! API Response:')
    console.log('─'.repeat(50))
    console.log(`🎯 Processed: ${data.processed || 0}`)
    console.log(`📧 Sent: ${data.sent || 0}`)
    console.log(`⏭️  Skipped: ${data.skipped || 0}`)
    console.log(`❌ Errors: ${data.errors || 0}`)
    console.log(`⏱️  Execution Time: ${data.executionTimeMs || 0}ms`)
    console.log(`🧪 Test Mode: ${data.testMode}`)
    
    if (data.results && data.results.length > 0) {
      console.log('\n📋 Detailed Results:')
      data.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.contactEmail}`)
        console.log(`     Status: ${result.status}`)
        if (result.error) {
          console.log(`     Error: ${result.error}`)
        }
        if (result.reason) {
          console.log(`     Reason: ${result.reason}`)
        }
      })
    }
    
    // Check for the old error
    const hasOldError = data.results?.some(r => r.error?.includes('campaignSequences is not defined'))
    
    if (hasOldError) {
      console.log('\n🚨 OLD ERROR DETECTED!')
      console.log('   The API is still running the old code with the campaignSequences bug.')
      console.log('   This suggests the deployment hasnt updated yet.')
      console.log('\n💡 Solutions:')
      console.log('   1. Wait a few minutes for the deployment to update')
      console.log('   2. Check your deployment platform (Vercel/Netlify) for build status')
      console.log('   3. Try redeploying manually')
    } else {
      console.log('\n✅ Code appears to be updated (no campaignSequences error)')
    }
    
  } catch (error) {
    console.log('\n❌ Request failed:')
    console.log(error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused - is the app running?')
      console.log('   For local: npm run dev')
      console.log('   For deployed: check deployment status')
    }
  }
}

// Run the test
testAutomationAPI()
  .then(() => {
    console.log('\n🏁 Test complete')
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })