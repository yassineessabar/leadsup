require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testVerificationLogic() {
  console.log('🔍 Testing Domain Verification Logic (Bypassing Auth)');
  console.log('=================================================\n');

  // Step 1: Get a domain to test with
  console.log('📋 Step 1: Getting domain to test verification...');
  const { data: domains, error } = await supabase
    .from('domains')
    .select('*')
    .in('status', ['pending', 'verified'])
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error) {
    console.error('❌ Error fetching domains:', error);
    return;
  }
  
  if (!domains || domains.length === 0) {
    console.log('⚠️  No suitable domains found for testing');
    return;
  }

  const testDomain = domains[0];
  console.log(`🎯 Testing with: ${testDomain.domain} (${testDomain.status})`);
  console.log(`   DNS Records: ${testDomain.dns_records ? testDomain.dns_records.length : 0} stored`);

  // Step 2: Simulate the verification process manually
  console.log('\n🔧 Step 2: Testing DNS verification process...');
  
  try {
    // Import the DNS verification functions from the API route
    const dns = require('dns');
    const { promisify } = require('util');
    const resolveTxt = promisify(dns.resolveTxt);
    const resolveCname = promisify(dns.resolveCname);
    
    // Use stored DNS records from domain
    const dnsRecords = testDomain.dns_records || [];
    console.log(`📋 Found ${dnsRecords.length} DNS records to verify:`);
    
    dnsRecords.forEach((record, i) => {
      console.log(`   ${i+1}. ${record.type} ${record.host} → ${record.value} (${record.purpose})`);
    });

    // Test a few key records to see if they resolve
    let verifiedCount = 0;
    let totalCount = dnsRecords.length;

    for (const record of dnsRecords.slice(0, 3)) { // Test first 3 records
      console.log(`\n🔍 Testing ${record.type} record: ${record.host}.${testDomain.domain}`);
      
      try {
        let hostname = record.host === '@' ? testDomain.domain : `${record.host}.${testDomain.domain}`;
        
        if (record.type === 'TXT') {
          const txtRecords = await resolveTxt(hostname);
          const found = txtRecords.flat().find(r => r.includes(record.value.substring(0, 10))); // Partial match
          console.log(`   📝 TXT lookup: ${found ? '✅ Found matching' : '❌ Not found'}`);
          if (found) verifiedCount++;
        } else if (record.type === 'CNAME') {
          const cnameRecords = await resolveCname(hostname);
          const found = cnameRecords[0];
          const matches = found === record.value;
          console.log(`   📝 CNAME lookup: ${matches ? '✅ Exact match' : '❌ Mismatch'} (${found || 'Not found'})`);
          if (matches) verifiedCount++;
        }
        
      } catch (dnsError) {
        console.log(`   ⚠️  DNS lookup failed: ${dnsError.code || dnsError.message}`);
      }
    }

    console.log(`\n📊 Quick DNS Test Results: ${verifiedCount}/${Math.min(3, totalCount)} records verified`);

  } catch (testError) {
    console.error('❌ DNS testing failed:', testError.message);
  }

  // Step 3: Check current SendGrid setup for this domain
  console.log('\n🔐 Step 3: Checking SendGrid setup...');
  
  try {
    // Check for sender accounts
    const { data: senders } = await supabase
      .from('sender_accounts')
      .select('*')
      .eq('domain_id', testDomain.id);

    console.log(`👤 Found ${senders?.length || 0} sender accounts for this domain:`);
    if (senders && senders.length > 0) {
      senders.forEach(sender => {
        console.log(`   - ${sender.email} (Status: ${sender.sendgrid_status || 'unknown'}, ID: ${sender.sendgrid_sender_id || 'none'})`);
      });
    }

    // Test SendGrid API connection
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (sendgridApiKey) {
      console.log('\n📡 Testing SendGrid API connection...');
      
      const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const domains = await response.json();
        console.log(`✅ SendGrid API connected - found ${domains.length} authenticated domains`);
        
        // Check if our test domain is in SendGrid
        const ourDomain = domains.find(d => d.domain === testDomain.domain);
        if (ourDomain) {
          console.log(`🎯 Found ${testDomain.domain} in SendGrid (ID: ${ourDomain.id}, Valid: ${ourDomain.valid})`);
        } else {
          console.log(`⚠️  ${testDomain.domain} not found in SendGrid authenticated domains`);
        }
      } else {
        console.log(`❌ SendGrid API error: ${response.status} ${response.statusText}`);
      }
    } else {
      console.log('⚠️  No SendGrid API key found');
    }

  } catch (sendgridError) {
    console.error('❌ SendGrid check failed:', sendgridError.message);
  }

  // Step 4: Simulate what happens when verification passes
  console.log('\n🚀 Step 4: Simulating successful verification scenario...');
  
  if (testDomain.status === 'verified') {
    console.log('✅ Domain is already verified - checking if SendGrid setup was triggered...');
    
    // Check verification history
    const { data: history } = await supabase
      .from('domain_verification_history')
      .select('*')
      .eq('domain_id', testDomain.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (history && history.length > 0) {
      console.log(`📚 Found ${history.length} verification attempts:`);
      history.forEach((attempt, i) => {
        console.log(`   ${i+1}. ${attempt.status} at ${new Date(attempt.created_at).toLocaleString()}`);
        if (attempt.verification_details?.report?.summary) {
          const summary = attempt.verification_details.report.summary;
          console.log(`      Records: ${summary.passedRecords}/${summary.totalRecords} passed`);
        }
      });
    } else {
      console.log('⚠️  No verification history found');
    }
  } else {
    console.log(`⚠️  Domain status is '${testDomain.status}' - would need successful DNS verification to trigger SendGrid setup`);
  }

  // Step 5: Test auto-verification module
  console.log('\n🔄 Step 5: Testing auto-verification system...');
  
  try {
    // Try to import and test the auto-verification module
    const fs = require('fs');
    const autoVerifyPath = './lib/auto-verify-senders.ts';
    
    if (fs.existsSync(autoVerifyPath)) {
      console.log('✅ Auto-verify module exists');
      
      // Test if we can call the domain-specific auto-verify function
      try {
        // This would normally be called from the verification route
        console.log(`🔄 Auto-verification would be triggered for ${testDomain.domain}`);
        console.log('   This includes:');
        console.log('   - Checking domain authentication in SendGrid');
        console.log('   - Auto-verifying any unverified sender identities');
        console.log('   - Updating sender status in database');
      } catch (autoError) {
        console.log(`⚠️  Auto-verification simulation failed: ${autoError.message}`);
      }
    } else {
      console.log('⚠️  Auto-verify module not found');
    }
  } catch (moduleError) {
    console.error('❌ Auto-verification test failed:', moduleError.message);
  }

  console.log('\n🏁 Verification Logic Test Complete');
  console.log('\n💡 Summary:');
  console.log('   1. Domain verification checks DNS records against stored configuration');
  console.log('   2. When DKIM records pass → domain status becomes "verified"');
  console.log('   3. Verified domains trigger setupSendGridIntegration()');
  console.log('   4. SendGrid integration creates/verifies sender identities');
  console.log('   5. Auto-verification ensures senders become verified for authenticated domains');
}

testVerificationLogic().catch(console.error);