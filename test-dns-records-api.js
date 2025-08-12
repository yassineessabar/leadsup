// Test script to verify DNS records API
// Using native fetch in Node.js 18+

async function testDnsRecordsApi() {
  console.log('Testing DNS Records API for leadsup.io domain...\n');
  
  const domain = 'leadsup.io';
  const apiUrl = `http://localhost:3005/api/domains/${encodeURIComponent(domain)}/dns-records`;
  
  try {
    console.log(`Fetching DNS records from: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you would need proper authentication
        // For testing, you might need to add a session cookie
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Success! DNS Records retrieved:\n');
      console.log('Source:', data.source);
      console.log('Domain:', data.domain);
      console.log('\nDNS Records:');
      console.log('=' .repeat(80));
      
      data.dnsRecords.forEach((record, index) => {
        console.log(`\n${index + 1}. ${record.type} Record`);
        console.log('   Host:', record.host);
        console.log('   Value:', record.value);
        if (record.priority) {
          console.log('   Priority:', record.priority);
        }
        console.log('   Purpose:', record.purpose);
      });
      
      console.log('\n' + '=' .repeat(80));
      console.log('\nTotal DNS Records:', data.dnsRecords.length);
      
      // Check for required record types
      const recordTypes = data.dnsRecords.map(r => r.type);
      console.log('\nRecord Types Present:');
      console.log('- SPF (TXT):', recordTypes.includes('TXT') ? '✅' : '❌');
      console.log('- DKIM (CNAME):', recordTypes.includes('CNAME') ? '✅' : '❌');
      console.log('- MX:', recordTypes.includes('MX') ? '✅' : '❌');
      
    } else {
      console.error('\n❌ Error:', data.error || 'Failed to fetch DNS records');
      console.error('Response status:', response.status);
      
      if (response.status === 401) {
        console.log('\n⚠️  Note: You may need to be authenticated. Try accessing through the web UI first.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error making request:', error.message);
    console.log('\n⚠️  Make sure the development server is running on port 3005');
  }
}

// Run the test
testDnsRecordsApi();