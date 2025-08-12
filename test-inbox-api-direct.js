#!/usr/bin/env node

/**
 * Test the inbox API directly with same parameters as frontend
 */

require('dotenv').config({ path: '.env.local' })

async function testInboxAPI() {
  try {
    console.log('🔍 Testing inbox API directly\n')
    
    // Test the exact API call that frontend makes
    const baseUrl = 'http://localhost:3000'
    
    // Test 1: Basic inbox query (default parameters)
    console.log('1. Testing basic inbox query:')
    console.log('=' .repeat(50))
    
    const response1 = await fetch(`${baseUrl}/api/inbox?view=threads&folder=inbox&channel=email&page=1&limit=20`, {
      headers: {
        'Cookie': 'session=your-session-token' // This won't work without real session
      }
    })
    
    if (!response1.ok) {
      console.log(`❌ API call failed: ${response1.status} - ${response1.statusText}`)
      
      // Try without auth to see the structure
      console.log('\n2. Testing without auth (will fail but show structure):')
      console.log('=' .repeat(50))
      const response2 = await fetch(`${baseUrl}/api/inbox?view=threads&folder=inbox&channel=email&page=1&limit=20`)
      const errorData = await response2.json()
      console.log('Response:', JSON.stringify(errorData, null, 2))
      
      console.log('\n💡 The API requires authentication.')
      console.log('📱 Please check your inbox tab in the browser and:')
      console.log('   1. Open browser developer tools (F12)')
      console.log('   2. Go to Network tab')
      console.log('   3. Refresh the inbox tab')
      console.log('   4. Look for the API call to /api/inbox')
      console.log('   5. Check the response to see if our thread is there')
      
      console.log('\n🔧 Alternatively, check browser console for any JavaScript errors')
      console.log('   that might prevent the inbox from updating')
      
      return
    }
    
    const data1 = await response1.json()
    console.log('API Response:', JSON.stringify(data1, null, 2))
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    
    console.log('\n📋 Manual debugging steps:')
    console.log('1. Open your inbox tab in the browser')
    console.log('2. Press F12 to open developer tools')
    console.log('3. Go to Network tab')
    console.log('4. Refresh the page')
    console.log('5. Look for API call to /api/inbox')
    console.log('6. Check if our conversation_id is in the response: YW50aG95MjMyN0BnbWFpbC5jb218dGVz')
    
    console.log('\n🔧 If the thread is in the API response but not showing:')
    console.log('• Check browser console for JavaScript errors')
    console.log('• Check if frontend filters are applied')
    console.log('• Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)')
    console.log('• Clear browser cache/localStorage')
  }
}

testInboxAPI()