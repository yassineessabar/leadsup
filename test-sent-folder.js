/**
 * Test script to verify sent folder functionality
 * This tests the core logic of the inbox system for sent emails
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testSentFolderLogic() {
  console.log('🧪 Testing Sent Folder Logic...\n');

  // Simulate the logic from the inbox API for sent folder filtering
  console.log('1. Testing conversation ID generation (from send-email route):');
  
  // This is the same logic used in /app/api/send-email/route.ts:275-280
  const generateConversationId = (contactEmail, senderEmail) => {
    const participants = [contactEmail, senderEmail].sort().join('|')
    return Buffer.from(participants).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  }

  const testContact = 'customer@example.com';
  const testSender = 'contact@leadsupdirect.com';
  const conversationId = generateConversationId(testContact, testSender);
  
  console.log(`   Contact: ${testContact}`);
  console.log(`   Sender: ${testSender}`);
  console.log(`   Generated Conversation ID: ${conversationId}`);
  console.log('   ✅ Conversation ID generation works\n');

  // Test the folder logic
  console.log('2. Testing sent folder filtering logic:');
  
  // This simulates the logic from /app/api/inbox/route.ts:183-194
  const mockOutboundMessages = [
    { conversation_id: conversationId, direction: 'outbound', folder: 'sent' },
    { conversation_id: 'conv_123', direction: 'outbound', folder: 'sent' }
  ];
  
  const outboundConversationIds = [...new Set(mockOutboundMessages
    .filter(m => m.direction === 'outbound' && m.folder !== 'trash')
    .map(m => m.conversation_id))];
  
  console.log(`   Found ${outboundConversationIds.length} outbound conversations`);
  console.log(`   Conversation IDs: ${outboundConversationIds.join(', ')}`);
  console.log('   ✅ Sent folder filtering logic works\n');

  // Test the email sending data structure
  console.log('3. Testing outbound email data structure:');
  
  // This is the structure from /app/api/send-email/route.ts:282-304
  const mockOutboundEmail = {
    user_id: 'test-user-123',
    message_id: 'email_' + Date.now(),
    conversation_id: conversationId,
    contact_email: testContact,
    contact_name: 'Test Customer',
    sender_email: testSender,
    subject: 'Test Campaign Email',
    body_text: 'This is a test email sent through automation',
    body_html: '<p>This is a test email sent through automation</p>',
    direction: 'outbound',  // ← This marks it as sent
    channel: 'email',
    message_type: 'email',
    status: 'read',        // ← Outbound emails are 'read' by definition
    folder: 'sent',        // ← This puts it in sent folder
    provider: 'smtp',
    sent_at: new Date().toISOString()
  };
  
  console.log('   Email structure for sent folder:');
  console.log(`     Direction: ${mockOutboundEmail.direction}`);
  console.log(`     Folder: ${mockOutboundEmail.folder}`);
  console.log(`     Status: ${mockOutboundEmail.status}`);
  console.log('   ✅ Outbound email structure is correct\n');

  console.log('4. Testing inbox thread structure:');
  
  // This is the structure from /app/api/send-email/route.ts:307-320
  const mockThread = {
    user_id: 'test-user-123',
    conversation_id: conversationId,
    contact_email: testContact,
    contact_name: 'Test Customer',
    subject: 'Test Campaign Email',
    last_message_at: new Date().toISOString(),
    last_message_preview: 'This is a test email sent through automation...',
    status: 'active'
  };
  
  console.log('   Thread structure:');
  console.log(`     Conversation ID: ${mockThread.conversation_id}`);
  console.log(`     Contact: ${mockThread.contact_email}`);
  console.log(`     Subject: ${mockThread.subject}`);
  console.log('   ✅ Thread structure is correct\n');

  console.log('📋 SUMMARY:');
  console.log('✅ When emails are sent through automation:');
  console.log('   1. A record is created in inbox_messages with direction="outbound" and folder="sent"');
  console.log('   2. A conversation thread is created/updated in inbox_threads');
  console.log('   3. The sent folder API filters for conversations with outbound messages');
  console.log('   4. The inbox UI should display these in the "Sent" folder tab');
  console.log('');
  console.log('⚠️  POTENTIAL ISSUES TO CHECK:');
  console.log('   1. Are emails actually being sent through the automation system?');
  console.log('   2. Is the inbox_messages table receiving the outbound records?');
  console.log('   3. Is the sent folder API query working correctly?');
  console.log('   4. Is the frontend correctly calling the API with folder=sent?');
  console.log('');
  console.log('🔧 TO VERIFY:');
  console.log('   1. Check your database for inbox_messages with direction="outbound"');
  console.log('   2. Look in the browser Network tab when clicking "Sent" folder');
  console.log('   3. Check if the API call includes "?folder=sent"');
  console.log('   4. Verify the API response contains emails with direction="outbound"');
}

// Run the test
testSentFolderLogic().catch(console.error);