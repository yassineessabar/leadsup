const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

async function testCreateDomainAuth() {
  if (!SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not set');
    return;
  }

  console.log('🧪 Testing SendGrid domain authentication creation...');
  
  const testDomain = 'test-domain-' + Date.now() + '.com';
  
  try {
    console.log(`🔐 Creating domain authentication for ${testDomain}...`);
    
    const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain: testDomain,
        subdomain: 'mail',
        ips: [],
        custom_spf: false,
        default: false
      })
    });
    
    console.log(`📋 Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Domain authentication created successfully!');
      console.log('📋 Result:', JSON.stringify(result, null, 2));
      
      // Clean up - delete the test domain
      setTimeout(async () => {
        try {
          await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${result.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`🗑️ Cleaned up test domain ${testDomain}`);
        } catch (cleanupError) {
          console.log('⚠️ Could not clean up test domain');
        }
      }, 2000);
      
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Domain authentication creation failed:');
      console.log('📋 Error:', JSON.stringify(errorData, null, 2));
      
      // Check API key permissions
      if (response.status === 403) {
        console.log('🔑 API key may lack domain authentication permissions');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing domain creation:', error);
  }
}

testCreateDomainAuth();