// Test the DNS records API for leadsup.io (without authentication for testing)
const domain = 'leadsup.io';
const baseUrl = 'http://localhost:3005';

console.log('Testing DNS Records API for', domain);
console.log('URL:', `${baseUrl}/api/domains/${encodeURIComponent(domain)}/dns-records`);

fetch(`${baseUrl}/api/domains/${encodeURIComponent(domain)}/dns-records`)
  .then(response => response.json())
  .then(data => {
    console.log('\nResponse:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ DNS Records retrieved successfully!');
      console.log('Domain:', data.domain);
      console.log('Source:', data.source);
      console.log('Records count:', data.dnsRecords?.length || 0);
    } else {
      console.log('\n❌ Error:', data.error);
      if (data.error === 'Unauthorized') {
        console.log('\nThis is expected - the API requires authentication.');
        console.log('When you add leadsup.io through the UI, it will work properly.');
      }
    }
  })
  .catch(error => {
    console.error('\nFetch error:', error.message);
  });