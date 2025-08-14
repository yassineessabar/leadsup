require('dotenv').config({ path: '.env.local' });

async function testRedirectFlow() {
  console.log('🔧 Testing Manual Config Redirect Flow');
  console.log('======================================\n');

  // Test 1: Create a domain via API (simulating manual config)
  console.log('📋 Step 1: Testing domain creation via API...');
  
  try {
    const response = await fetch('http://localhost:3002/api/domains', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'test-redirect.com',
        replySubdomain: 'reply',
        verificationType: 'manual'
      })
    });

    const data = await response.json();
    console.log(`📡 API Response: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Domain creation successful');
      console.log(`   Domain: ${data.domain?.domain}`);
      console.log(`   DNS Records: ${data.dnsRecords?.length || 0} records`);
      console.log(`   Existing Domain: ${data.existingDomain ? 'Yes' : 'No'}`);
      
      // Test 2: Verify the domain can be found for redirect
      console.log('\n📋 Step 2: Testing domain lookup for redirect...');
      
      const domainsResponse = await fetch('http://localhost:3002/api/domains', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const domainsData = await domainsResponse.json();
      
      if (domainsResponse.ok) {
        const foundDomain = domainsData.domains?.find(d => d.domain === 'test-redirect.com');
        
        if (foundDomain) {
          console.log('✅ Domain found in domains list');
          console.log(`   ID: ${foundDomain.id}`);
          console.log(`   Status: ${foundDomain.status}`);
          console.log('✅ Redirect should work correctly');
        } else {
          console.log('❌ Domain not found in domains list');
          console.log('Available domains:', domainsData.domains?.map(d => d.domain));
        }
      } else {
        console.log('❌ Failed to fetch domains list');
        console.log('Data:', domainsData);
      }
      
    } else {
      console.log('❌ Domain creation failed');
      console.log('Error:', data.error);
      
      if (data.error?.includes('Domain already exists')) {
        console.log('ℹ️  This is expected for existing domains - redirect should still work');
      }
    }

  } catch (error) {
    console.error('❌ API Error:', error.message);
    console.log('ℹ️  Make sure the development server is running on port 3002');
  }

  console.log('\n💡 Manual Testing Steps:');
  console.log('   1. Open http://localhost:3002 in browser');
  console.log('   2. Go to Domains tab');
  console.log('   3. Click "Add Domain" button');
  console.log('   4. Enter a domain name');
  console.log('   5. Click "Add Domain" (should analyze and show manual setup)');
  console.log('   6. Click "Continue with Manual Setup"');
  console.log('   7. Check if it redirects to verification page with DNS records');
  
  console.log('\n🎯 Expected Behavior:');
  console.log('   - After clicking "Continue with Manual Setup"');
  console.log('   - Should close modal and navigate to verification view');
  console.log('   - Should show DNS setup page with records to copy');
  console.log('   - Page should contain: "Back to Domains Setup [domain] Follow these steps to connect your domain"');
}

testRedirectFlow().catch(console.error);