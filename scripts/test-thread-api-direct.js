#!/usr/bin/env node

/**
 * Test Thread API Direct
 * 
 * This script tests the thread messages API by making a direct HTTP call
 * to identify the JSON parsing error.
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function testThreadAPIDirect() {
  console.log('🔍 TESTING THREAD API ENDPOINT DIRECTLY\n')

  try {
    const conversationId = 'ZWNvbW0yNDA1QGdtYWlsLmNvbXxlY29t'
    const url = `http://localhost:3000/api/inbox/${conversationId}/messages`
    
    console.log(`📞 Making request to: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log(`📊 Response status: ${response.status}`)
    console.log(`📋 Response headers:`)
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`)
    }

    // Get raw response text first
    const responseText = await response.text()
    console.log(`\n📄 Raw response (first 500 chars):`)
    console.log(responseText.substring(0, 500))

    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(responseText)
      console.log('\n✅ JSON Parse Success:')
      console.log(JSON.stringify(jsonData, null, 2))
    } catch (jsonError) {
      console.log('\n❌ JSON Parse Failed:')
      console.log('Error:', jsonError.message)
      console.log('\n📋 This is likely why the UI gets "Unexpected token" error')
      
      // Check if it's HTML (error page)
      if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
        console.log('🚨 Response is HTML (likely an error page)')
      }
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

// Run the test
testThreadAPIDirect().then(() => {
  console.log('\n✅ Direct API test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})