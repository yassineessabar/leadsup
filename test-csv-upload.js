const fs = require('fs');

async function testCsvUpload() {
  console.log('🧪 Testing CSV Upload with Daily Limit Enforcement');
  console.log('=' .repeat(60));
  
  const campaignId = '6c91a9b3-c4fc-46be-bc0f-68ecdffd1e77';
  
  // Read the CSV file
  const csvContent = fs.readFileSync('test-contacts-v2.csv', 'utf8');
  console.log('📄 CSV content preview:');
  console.log(csvContent.split('\n').slice(0, 4).join('\n')); // Show first 4 lines
  
  // Create FormData for the upload
  const formData = new FormData();
  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
  formData.append('csvFile', csvBlob, 'test-contacts-v2.csv');
  
  console.log('\n📤 Uploading CSV to campaign:', campaignId);
  
  try {
    const response = await fetch(`http://localhost:3002/api/campaigns/${campaignId}/contacts/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        // Add session cookie for authentication
        'Cookie': 'session=session_157004d8-201b-48ce-9610-af5b3ecbc820_1756800694509_bfvev6s7p'
      }
    });
    
    const result = await response.json();
    
    console.log('📊 Upload Response:');
    console.log('  Status:', response.status);
    console.log('  Success:', result.success);
    console.log('  Message:', result.message);
    console.log('  Imported:', result.importedCount);
    console.log('  Duplicates:', result.duplicateCount);
    console.log('  Total processed:', result.totalProcessed);
    console.log('  Scheduled emails:', result.scheduledEmailsCount);
    
    if (!result.success) {
      console.log('❌ Upload failed:', result.error);
    } else {
      console.log('✅ Upload completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
  }
}

testCsvUpload();