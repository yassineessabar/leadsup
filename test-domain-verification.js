require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEndToEndVerification() {
  console.log('🔍 Testing End-to-End Domain Verification Process');
  console.log('==========================================\n');

  // Step 1: Check current domains
  console.log('📋 Step 1: Checking current domains in database...');
  const { data: domains, error } = await supabase
    .from('domains')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('❌ Error fetching domains:', error);
    return;
  }
  
  console.log(`✅ Found ${domains.length} domains:`);
  domains.forEach(domain => {
    console.log(`  - ${domain.domain} (${domain.status}) - ${domain.description}`);
  });

  // Step 2: Find a domain to test verification with
  let testDomain = domains.find(d => d.status === 'pending' || d.status === 'verified');
  
  if (!testDomain) {
    console.log('\n⚠️  No suitable domain found for testing. Need a domain with status "pending" or "verified"');
    return;
  }

  console.log(`\n🎯 Step 2: Testing verification with domain: ${testDomain.domain}`);
  console.log(`   Current status: ${testDomain.status}`);
  console.log(`   Description: ${testDomain.description}`);

  // Step 3: Test the verification API endpoint
  console.log('\n🔧 Step 3: Calling DNS verification endpoint...');
  
  try {
    const response = await fetch(`http://localhost:3000/api/domains/${testDomain.id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    console.log(`📡 API Response Status: ${response.status}`);
    console.log(`📊 API Response:`, JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Verification API call successful!');
      
      // Check if SendGrid setup was triggered
      if (result.sendGridSetup) {
        console.log('🔐 SendGrid Setup Results:');
        console.log(`  - Domain Auth: ${result.sendGridSetup.domainAuth?.configured ? 'CONFIGURED' : 'FAILED'}`);
        console.log(`  - Sender Creation: ${result.sendGridSetup.sendersCreated || 0} senders created`);
        console.log(`  - Auto-verification: ${result.sendGridSetup.autoVerificationResult || 'Not attempted'}`);
      }
    } else {
      console.log('❌ Verification failed:', result.error);
    }

  } catch (fetchError) {
    console.error('❌ Error calling verification endpoint:', fetchError.message);
    console.log('ℹ️  This might be because the development server is not running.');
    console.log('   Try running: npm run dev');
  }

  // Step 4: Check domain status after verification attempt
  console.log('\n📋 Step 4: Checking domain status after verification...');
  const { data: updatedDomain } = await supabase
    .from('domains')
    .select('*')
    .eq('id', testDomain.id)
    .single();

  if (updatedDomain) {
    console.log(`✅ Updated domain status: ${updatedDomain.status}`);
    console.log(`📝 Updated description: ${updatedDomain.description}`);
    
    if (updatedDomain.status !== testDomain.status) {
      console.log('🔄 Domain status changed during verification!');
    }
  }

  // Step 5: Check sender accounts for this domain
  console.log('\n👤 Step 5: Checking sender accounts for this domain...');
  const { data: senders } = await supabase
    .from('sender_accounts')
    .select('*')
    .eq('domain_id', testDomain.id);

  if (senders && senders.length > 0) {
    console.log(`✅ Found ${senders.length} sender accounts:`);
    senders.forEach(sender => {
      console.log(`  - ${sender.from_email} (${sender.status}) - SendGrid ID: ${sender.sendgrid_id || 'None'}`);
    });
  } else {
    console.log('⚠️  No sender accounts found for this domain');
  }

  console.log('\n🏁 End-to-End Verification Test Complete');
}

testEndToEndVerification().catch(console.error);