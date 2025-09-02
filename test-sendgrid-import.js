// Test if SendGrid functions can be imported and used
async function testSendGridImport() {
  try {
    console.log('🔍 Testing SendGrid function import...');
    
    // Test the import that's used in the domain route
    const { createDomainAuthentication } = await import('./lib/sendgrid.ts');
    
    console.log('✅ Import successful');
    console.log('🔍 Function type:', typeof createDomainAuthentication);
    
    // Test a simple domain creation
    const testDomain = 'test-import-' + Date.now() + '.com';
    
    console.log(`🧪 Testing domain auth creation for ${testDomain}...`);
    
    const result = await createDomainAuthentication({
      domain: testDomain,
      subdomain: 'mail'
    });
    
    console.log('✅ Function call successful:', result);
    
    // Clean up
    if (result.success && result.id) {
      setTimeout(async () => {
        try {
          const deleteResponse = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${result.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`🗑️ Cleaned up test domain ${testDomain}`);
        } catch (cleanupError) {
          console.log('⚠️ Could not clean up test domain');
        }
      }, 1000);
    }
    
  } catch (error) {
    console.error('❌ Error testing SendGrid import:', error);
    console.error('📋 Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

testSendGridImport();