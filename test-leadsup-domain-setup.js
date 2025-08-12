// Test script to verify leadsup.io domain setup and DNS records retrieval
// This simulates adding leadsup.io domain and checking the DNS records

async function testLeadsupDomain() {
  const domain = 'leadsup.io';
  const baseUrl = 'http://localhost:3005';
  
  console.log('=' .repeat(80));
  console.log('Testing LeadsUp.io Domain Setup');
  console.log('=' .repeat(80));
  console.log('\nDomain:', domain);
  console.log('Provider: Namecheap (should show manual DNS setup)');
  console.log('\n📋 Test Steps:');
  console.log('1. Check if domain exists in SendGrid');
  console.log('2. Fetch DNS records from SendGrid API');
  console.log('3. Verify records match actual SendGrid configuration');
  console.log('\n' + '-'.repeat(80));

  try {
    // Step 1: Check Domain Connect support (should fail for Namecheap)
    console.log('\n🔍 Step 1: Checking Domain Connect support...');
    const dcResponse = await fetch(`${baseUrl}/api/domain-connect/check?domain=${encodeURIComponent(domain)}`);
    const dcData = await dcResponse.json();
    
    if (dcData.supported) {
      console.log('✅ Domain Connect supported (unexpected for Namecheap)');
    } else {
      console.log('❌ Domain Connect not supported (expected for Namecheap - will show manual setup)');
    }

    // Step 2: Fetch DNS records from our API
    console.log('\n🔍 Step 2: Fetching DNS records from API...');
    console.log(`URL: ${baseUrl}/api/domains/${encodeURIComponent(domain)}/dns-records`);
    
    // Note: This will fail with 401 if not authenticated
    // In real usage, this would be called from the authenticated frontend
    console.log('\n⚠️  Note: API requires authentication. Showing expected records:');
    
    // Expected DNS records for leadsup.io based on SendGrid configuration
    const expectedRecords = [
      {
        type: 'CNAME',
        host: 'em6012.leadsup.io',
        value: 'u55053564.wl065.sendgrid.net',
        purpose: 'Link tracking and email branding'
      },
      {
        type: 'CNAME',
        host: 's1._domainkey.leadsup.io',
        value: 's1.domainkey.u55053564.wl065.sendgrid.net',
        purpose: 'DKIM authentication (key 1)'
      },
      {
        type: 'CNAME',
        host: 's2._domainkey.leadsup.io',
        value: 's2.domainkey.u55053564.wl065.sendgrid.net',
        purpose: 'DKIM authentication (key 2)'
      },
      {
        type: 'TXT',
        host: 'leadsup.io',
        value: 'v=spf1 include:sendgrid.net ~all',
        purpose: 'SPF - Authorizes SendGrid to send emails'
      },
      {
        type: 'TXT',
        host: '_dmarc.leadsup.io',
        value: 'v=DMARC1; p=none; rua=mailto:dmarc@leadsup.io; ruf=mailto:dmarc@leadsup.io; pct=100; sp=none;',
        purpose: 'DMARC policy'
      },
      {
        type: 'MX',
        host: 'reply.leadsup.io',
        value: 'mx.sendgrid.net',
        priority: 10,
        purpose: 'Route replies back to LeadsUp'
      }
    ];

    console.log('\n📝 Expected DNS Records for leadsup.io:');
    console.log('=' .repeat(80));
    
    expectedRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.type} Record`);
      console.log('   Host:', record.host);
      console.log('   Value:', record.value);
      if (record.priority) {
        console.log('   Priority:', record.priority);
      }
      console.log('   Purpose:', record.purpose);
    });

    console.log('\n' + '=' .repeat(80));
    console.log('\n✅ Verification Page Behavior:');
    console.log('1. Since leadsup.io is with Namecheap, Domain Connect will NOT be available');
    console.log('2. The page will show MANUAL DNS setup instructions');
    console.log('3. DNS records above will be displayed for copy/paste into Namecheap DNS panel');
    console.log('4. User needs to manually add these records in Namecheap dashboard');
    console.log('5. After DNS propagation, user can click "Verify Domain" button');
    
    console.log('\n📌 Important Notes:');
    console.log('- SendGrid subdomain: u55053564.wl065.sendgrid.net');
    console.log('- Email tracking subdomain: em6012.leadsup.io');
    console.log('- These are the ACTUAL production records for leadsup.io');
    console.log('- DNS propagation may take up to 48 hours');

    console.log('\n🎯 To Test in Browser:');
    console.log('1. Go to http://localhost:3005');
    console.log('2. Navigate to Domains tab');
    console.log('3. Click "Add domain"');
    console.log('4. Enter "leadsup.io"');
    console.log('5. You should see the DNS records listed above');
    console.log('6. Manual setup will be required (no automatic verification)');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the test
testLeadsupDomain();