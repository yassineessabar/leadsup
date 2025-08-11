#!/usr/bin/env node

/**
 * Test New Thread API
 * 
 * This script tests the updated thread messages API using query parameters
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function testNewThreadAPI() {
  console.log('🔍 TESTING NEW THREAD API FORMAT\n')

  try {
    const conversationId = 'ZWNvbW0yNDA1QGdtYWlsLmNvbXxlY29t'
    const url = `http://localhost:3000/api/inbox?conversation_id=${encodeURIComponent(conversationId)}`
    
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
      console.log('\n✅ JSON Parse Success!')
      console.log(`📊 Found ${jsonData.data?.length || 0} messages`)
      
      if (jsonData.success && jsonData.data && jsonData.data.length > 0) {
        console.log('\n📧 Sample messages:')
        jsonData.data.forEach((msg, i) => {
          console.log(`  ${i + 1}. ${msg.direction.toUpperCase()} - ${msg.formatted_date}`)
          console.log(`     "${msg.body_text?.substring(0, 80)}..."`)
        })
        console.log('\n🎉 SUCCESS! Thread messages API is working!')
      }
    } catch (jsonError) {
      console.log('\n❌ JSON Parse Failed:')
      console.log('Error:', jsonError.message)
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

// Run the test
testNewThreadAPI().then(() => {
  console.log('\n✅ New thread API test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})