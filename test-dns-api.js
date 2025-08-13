// Test the DNS records API directly to see what it returns
async function testDnsRecordsApi() {
  try {
    console.log('🧪 Testing DNS records API for leadsupbase.co...');
    
    // This will test if the API is properly detecting and replacing fake records
    const response = await fetch('http://localhost:3000/api/domains/leadsupbase.co/dns-records');
    
    if (!response.ok) {
      console.log(`❌ API responded with status: ${response.status}`);
      const text = await response.text();
      console.log('Error response:', text);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ API Response:');
    console.log('- Success:', data.success);
    console.log('- Source:', data.source);
    console.log('- Records count:', data.records?.length || 0);
    
    if (data.records && data.records.length > 0) {
      console.log('\\n📋 DNS Records:');
      data.records.forEach((record, index) => {
        console.log(`${index + 1}. ${record.type} ${record.host} → ${record.value}`);
      });
      
      // Check if any records are fake
      const fakeRecords = data.records.filter(record => 
        record.host === 'mail' || 
        record.host === 'url1234' || 
        (record.value && record.value.includes('u1234567.wl123.sendgrid.net'))
      );
      
      if (fakeRecords.length > 0) {
        console.log(`\\n❌ Found ${fakeRecords.length} FAKE records:`);
        fakeRecords.forEach(record => {
          console.log(`  - ${record.type} ${record.host} → ${record.value}`);
        });
      } else {
        console.log('\\n✅ All records appear to be REAL SendGrid records!');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDnsRecordsApi();