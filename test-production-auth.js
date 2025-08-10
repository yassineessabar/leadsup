/**
 * Test Production Authentication
 * Find the correct credentials for production
 */

async function testProductionAuth() {
  console.log('🔐 Testing Production Authentication');
  console.log('=' .repeat(50));
  console.log('');

  const url = 'https://app.leadsup.io/api/campaigns/automation/process-pending';
  
  // Test different credential combinations
  const testCredentials = [
    { username: 'admin', password: 'password', desc: 'Default fallback' },
    { username: 'admin', password: 'admin', desc: 'Common alternative' },
    { username: 'n8n', password: 'password', desc: 'N8N specific' },
    { username: 'automation', password: 'password', desc: 'Automation specific' },
    { username: 'leadsup', password: 'leadsup2024', desc: 'App specific' },
    { username: 'api', password: 'api123', desc: 'API specific' }
  ];

  console.log('🧪 Testing Different Credential Combinations:');
  console.log('-'.repeat(50));

  for (const cred of testCredentials) {
    try {
      console.log(`\\n🔍 Testing: ${cred.username}:${cred.password} (${cred.desc})`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${cred.username}:${cred.password}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.log('   ❌ 401 Unauthorized - Wrong credentials');
      } else if (response.ok) {
        console.log('   ✅ SUCCESS! These are the correct credentials');
        console.log(`   🎯 Username: ${cred.username}`);
        console.log(`   🎯 Password: ${cred.password}`);
        
        const data = await response.json();
        console.log(`   📊 Response: ${data.success ? 'success' : 'error'}`);
        if (data.data) {
          console.log(`   📧 Campaigns: ${data.data.length}`);
        }
        
        console.log('\\n🔧 UPDATE YOUR N8N WORKFLOW:');
        console.log('   1. Go to n8n credentials');
        console.log('   2. Edit "Unnamed credential 2"');
        console.log(`   3. Set Username: ${cred.username}`);
        console.log(`   4. Set Password: ${cred.password}`);
        return; // Found working credentials
      } else {
        console.log(`   ⚠️  ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\\n❌ None of the test credentials worked');
  console.log('\\n🔍 NEXT STEPS:');
  console.log('');
  
  console.log('1. 🌐 Check Production Environment Variables:');
  console.log('   → N8N_API_USERNAME (if set, overrides "admin")');
  console.log('   → N8N_API_PASSWORD (if set, overrides "password")');
  console.log('');
  
  console.log('2. 🔧 Set Environment Variables in Production:');
  console.log('   → Vercel/Netlify: Set N8N_API_USERNAME=admin, N8N_API_PASSWORD=password');
  console.log('   → Or use different values and update n8n credentials');
  console.log('');
  
  console.log('3. 🧪 Test with curl:');
  console.log('   curl -u "USERNAME:PASSWORD" https://app.leadsup.io/api/campaigns/automation/process-pending');
  console.log('');
  
  console.log('4. 📝 Alternative: Hardcode credentials temporarily');
  console.log('   → Update process-pending/route.ts to use fixed values');
  console.log('   → const expectedUsername = "admin"');
  console.log('   → const expectedPassword = "password"');
}

// Also check what the API expects by testing the response
async function checkAPIEndpoint() {
  console.log('\\n🔍 Checking API Endpoint Details:');
  console.log('-'.repeat(40));
  
  try {
    const response = await fetch('https://app.leadsup.io/api/campaigns/automation/process-pending');
    
    console.log(`Status: ${response.status}`);
    console.log(`WWW-Authenticate: ${response.headers.get('www-authenticate')}`);
    
    const text = await response.text();
    console.log(`Response: ${text}`);
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

testProductionAuth().then(() => checkAPIEndpoint());