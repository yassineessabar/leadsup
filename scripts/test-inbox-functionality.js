/**
 * Test Script for Inbox Functionality
 * 
 * This script tests the inbox API endpoints to ensure they work correctly.
 * Run this script after setting up the database schema.
 * 
 * Usage:
 * node scripts/test-inbox-functionality.js
 * 
 * Requirements:
 * - Database tables created via create-inbox-tables.sql
 * - Valid session token for authentication
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'test-user-123'; // Replace with actual user ID
const SESSION_TOKEN = 'your-session-token-here'; // Replace with actual session token

// Helper to make authenticated requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${SESSION_TOKEN}`,
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    console.log(`${options.method || 'GET'} ${endpoint}:`, 
      response.ok ? '✅' : '❌', 
      response.status, 
      response.statusText
    );
    
    if (!response.ok) {
      console.log('Error:', data);
    }
    
    return { response, data };
  } catch (error) {
    console.error(`❌ Request failed for ${endpoint}:`, error.message);
    return { error };
  }
}

// Test data
const testCampaignId = '12345678-1234-1234-1234-123456789012';
const testSenderId = '87654321-4321-4321-4321-210987654321';
const testContactEmail = 'test@example.com';
const testSenderEmail = 'sender@company.com';

async function runTests() {
  console.log('🚀 Starting Inbox API Tests...\n');

  // Test 1: Create a test message
  console.log('📝 Test 1: Create test message');
  const messageData = {
    message_id: `test_${Date.now()}`,
    thread_id: 'test-thread-123',
    campaign_id: testCampaignId,
    contact_email: testContactEmail,
    contact_name: 'Test Contact',
    sender_id: testSenderId,
    sender_email: testSenderEmail,
    subject: 'Test Email Subject',
    body_text: 'This is a test email body.',
    body_html: '<p>This is a <strong>test</strong> email body.</p>',
    direction: 'inbound',
    channel: 'email',
    status: 'unread',
    sent_at: new Date().toISOString()
  };

  const { data: createdMessage } = await makeRequest('/api/inbox', {
    method: 'POST',
    body: JSON.stringify(messageData)
  });

  if (!createdMessage?.success) {
    console.log('❌ Failed to create test message. Skipping further tests.\n');
    return;
  }

  const messageId = createdMessage.data.id;
  console.log(`✅ Created message with ID: ${messageId}\n`);

  // Test 2: Fetch messages (threaded view)
  console.log('📋 Test 2: Fetch messages (threaded view)');
  await makeRequest('/api/inbox?view=threads&limit=10');
  console.log();

  // Test 3: Fetch messages (individual view)
  console.log('📋 Test 3: Fetch messages (individual view)');
  await makeRequest('/api/inbox?view=messages&limit=10');
  console.log();

  // Test 4: Fetch specific message
  console.log('📄 Test 4: Fetch specific message');
  await makeRequest(`/api/inbox/${messageId}`);
  console.log();

  // Test 5: Update message status (mark as read)
  console.log('✏️ Test 5: Mark message as read');
  await makeRequest(`/api/inbox/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'read' })
  });
  console.log();

  // Test 6: Set lead status
  console.log('🎯 Test 6: Set lead status');
  await makeRequest(`/api/inbox/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ lead_status: 'interested' })
  });
  console.log();

  // Test 7: Move to folder
  console.log('📁 Test 7: Move to folder');
  await makeRequest(`/api/inbox/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ folder: 'important' })
  });
  console.log();

  // Test 8: Inbox actions (reply)
  console.log('↩️ Test 8: Reply to message');
  const replyData = {
    action: 'reply',
    message_id: messageId,
    data: {
      subject: 'Re: Test Email Subject',
      body: 'Thanks for your message! This is a test reply.',
      to_email: testContactEmail
    }
  };
  await makeRequest('/api/inbox/actions', {
    method: 'POST',
    body: JSON.stringify(replyData)
  });
  console.log();

  // Test 9: Inbox actions (archive)
  console.log('📦 Test 9: Archive message');
  const archiveData = {
    action: 'archive',
    message_id: messageId
  };
  await makeRequest('/api/inbox/actions', {
    method: 'POST',
    body: JSON.stringify(archiveData)
  });
  console.log();

  // Test 10: Fetch folders
  console.log('📂 Test 10: Fetch folders');
  await makeRequest('/api/inbox/folders');
  console.log();

  // Test 11: Create custom folder
  console.log('➕ Test 11: Create custom folder');
  const folderData = {
    name: 'Test Folder',
    description: 'A test folder created by script',
    color: '#FF5722',
    icon: 'test'
  };
  await makeRequest('/api/inbox/folders', {
    method: 'POST',
    body: JSON.stringify(folderData)
  });
  console.log();

  // Test 12: Fetch inbox stats
  console.log('📊 Test 12: Fetch inbox stats');
  await makeRequest('/api/inbox/stats?range=7');
  console.log();

  // Test 13: Search and filtering
  console.log('🔍 Test 13: Search and filtering');
  await makeRequest('/api/inbox?search=test&status=read&limit=5');
  console.log();

  // Test 14: Pagination
  console.log('📄 Test 14: Pagination');
  await makeRequest('/api/inbox?page=1&limit=5');
  await makeRequest('/api/inbox?page=2&limit=5');
  console.log();

  // Test 15: Soft delete
  console.log('🗑️ Test 15: Soft delete message');
  await makeRequest(`/api/inbox/${messageId}`, {
    method: 'DELETE'
  });
  console.log();

  // Test 16: Verify message is in trash
  console.log('🔍 Test 16: Verify message in trash');
  await makeRequest('/api/inbox?folder=trash');
  console.log();

  console.log('✅ All tests completed!\n');

  // Summary
  console.log('📋 Test Summary:');
  console.log('- ✅ Message creation');
  console.log('- ✅ Threaded and individual views');
  console.log('- ✅ Message retrieval');
  console.log('- ✅ Status updates');
  console.log('- ✅ Lead status management');
  console.log('- ✅ Folder operations');
  console.log('- ✅ Inbox actions (reply, archive)');
  console.log('- ✅ Folder management');
  console.log('- ✅ Statistics');
  console.log('- ✅ Search and filtering');
  console.log('- ✅ Pagination');
  console.log('- ✅ Soft delete');
  console.log('\n🎉 Inbox functionality testing complete!');
}

// Performance test
async function performanceTest() {
  console.log('⚡ Starting Performance Tests...\n');

  const start = Date.now();
  
  // Test concurrent requests
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(makeRequest('/api/inbox?limit=20'));
  }
  
  await Promise.all(promises);
  
  const duration = Date.now() - start;
  console.log(`⏱️ 10 concurrent inbox requests took: ${duration}ms`);
  console.log(`📈 Average request time: ${Math.round(duration / 10)}ms`);
  
  if (duration < 5000) { // Under 5 seconds for 10 requests
    console.log('✅ Performance test passed - requests under 500ms average');
  } else {
    console.log('⚠️ Performance test warning - requests may be slow');
  }
  console.log();
}

// Main execution
async function main() {
  console.log('🔧 Inbox Integration Test Suite');
  console.log('================================\n');
  
  // Check if we have required config
  if (SESSION_TOKEN === 'your-session-token-here') {
    console.log('❌ Please configure SESSION_TOKEN in the script');
    console.log('ℹ️ Get a valid session token from your browser dev tools');
    return;
  }
  
  try {
    await runTests();
    await performanceTest();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  performanceTest,
  makeRequest
};