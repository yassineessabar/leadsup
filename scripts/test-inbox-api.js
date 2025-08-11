#!/usr/bin/env node

/**
 * Test Inbox API Script
 * 
 * This script tests the inbox API directly to see if messages
 * are now showing up after fixing the folder filter.
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:3000'

async function testInboxAPI() {
  console.log('🧪 TESTING INBOX API ENDPOINTS\n')

  try {
    // Test 1: Get sent folder (threads view)
    console.log('📤 Test 1: GET /api/inbox?folder=sent&view=threads')
    
    const threadsResponse = await fetch(`${BASE_URL}/api/inbox?folder=sent&view=threads&limit=10`)
    const threadsResult = await threadsResponse.json()
    
    console.log(`Status: ${threadsResponse.status}`)
    console.log('Response:', JSON.stringify(threadsResult, null, 2))

    // Test 2: Get sent folder (messages view)
    console.log('\n📧 Test 2: GET /api/inbox?folder=sent&view=messages')
    
    const messagesResponse = await fetch(`${BASE_URL}/api/inbox?folder=sent&view=messages&limit=10`)
    const messagesResult = await messagesResponse.json()
    
    console.log(`Status: ${messagesResponse.status}`)
    console.log('Response:', JSON.stringify(messagesResult, null, 2))

    // Test 3: Get all folders (should show counts)
    console.log('\n📁 Test 3: GET /api/inbox/folders')
    
    const foldersResponse = await fetch(`${BASE_URL}/api/inbox/folders`)
    const foldersResult = await foldersResponse.json()
    
    console.log(`Status: ${foldersResponse.status}`)
    console.log('Response:', JSON.stringify(foldersResult, null, 2))

    // Test 4: Try inbox folder too
    console.log('\n📥 Test 4: GET /api/inbox?folder=inbox&view=threads')
    
    const inboxResponse = await fetch(`${BASE_URL}/api/inbox?folder=inbox&view=threads&limit=10`)
    const inboxResult = await inboxResponse.json()
    
    console.log(`Status: ${inboxResponse.status}`)
    console.log('Response:', JSON.stringify(inboxResult, null, 2))

    // Analysis
    console.log('\n🔍 ANALYSIS:')
    
    if (threadsResponse.status === 401 || messagesResponse.status === 401) {
      console.log('❌ Authentication required - you need to be logged in')
      console.log('💡 Try accessing the inbox through your browser first')
    } else {
      if (threadsResult.success && threadsResult.data?.length > 0) {
        console.log('✅ Threads view working - messages should appear in UI')
      } else {
        console.log('⚠️ Threads view not returning data')
      }
      
      if (messagesResult.success && messagesResult.data?.length > 0) {
        console.log('✅ Messages view working - individual messages available')
      } else {
        console.log('⚠️ Messages view not returning data')
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testInboxAPI().then(() => {
  console.log('\n✅ API test complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test script failed:', error)
  process.exit(1)
})