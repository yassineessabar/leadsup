#!/usr/bin/env node

console.log('🔐 Gmail OAuth Setup Test\n')

// Test configuration
const baseURL = 'http://localhost:3000'
const email = 'essabar.yassine@gmail.com'

async function testOAuthSetup() {
  console.log('1️⃣ Starting OAuth setup for:', email)
  
  try {
    // Step 1: Get OAuth authorization URL
    const response = await fetch(`${baseURL}/api/auth/gmail-oauth?email=${email}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
      }
    })
    
    const data = await response.json()
    
    if (!data.success) {
      console.error('❌ Failed to get OAuth URL:', data.error)
      return
    }
    
    console.log('\n✅ OAuth authorization URL generated!')
    console.log('📋 Instructions:')
    data.instructions.forEach(instruction => console.log('   ', instruction))
    
    console.log('\n🔗 Authorization URL:')
    console.log(data.authorization_url)
    
    console.log('\n📋 Next steps:')
    console.log('1. Copy the URL above')
    console.log('2. Open it in your browser') 
    console.log('3. Sign in with Gmail account:', email)
    console.log('4. Grant permissions')
    console.log('5. You\'ll be redirected with the authorization code')
    console.log('6. Run the command shown on the callback page')
    
    console.log('\n🎯 Required Environment Variables:')
    console.log('   GMAIL_CLIENT_ID=your_client_id')
    console.log('   GMAIL_CLIENT_SECRET=your_client_secret')
    console.log('   GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail-oauth/callback')
    
    if (!process.env.GMAIL_CLIENT_ID) {
      console.log('\n⚠️  Missing GMAIL_CLIENT_ID - You need to:')
      console.log('   1. Go to https://console.cloud.google.com/')
      console.log('   2. Create OAuth 2.0 Client ID')
      console.log('   3. Add redirect URI: http://localhost:3000/api/auth/gmail-oauth/callback')
      console.log('   4. Set environment variables')
    }
    
  } catch (error) {
    console.error('❌ Error testing OAuth setup:', error.message)
  }
}

// Run the test
testOAuthSetup()