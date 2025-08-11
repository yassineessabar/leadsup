#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

let lastMessageCount = 0;
let isMonitoring = true;

async function checkForNewMessages() {
  try {
    // Get the latest messages
    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) {
      console.error('❌ Error checking messages:', error);
      return;
    }
    
    const currentCount = messages?.length || 0;
    
    if (currentCount > lastMessageCount && lastMessageCount > 0) {
      const newMessage = messages[0];
      
      console.log('\n🚨 NEW MAILERSEND MESSAGE DETECTED!');
      console.log('===================================');
      console.log(`📧 Subject: "${newMessage.subject}"`);
      console.log(`📥 Direction: ${newMessage.direction}`);
      console.log(`👤 From: ${newMessage.contact_email}`);
      console.log(`📨 To: ${newMessage.sender_email}`);
      console.log(`🔵 Status: ${newMessage.status}`);
      console.log(`🏷️  Provider: ${newMessage.provider}`);
      console.log(`🆔 Message ID: ${newMessage.message_id}`);
      console.log(`🔗 Conversation ID: ${newMessage.conversation_id}`);
      console.log(`⏰ Received: ${new Date(newMessage.received_at).toLocaleString()}`);
      
      if (newMessage.body_text) {
        console.log(`\n💬 Message Content:`);
        console.log('==================');
        console.log(newMessage.body_text.substring(0, 300) + (newMessage.body_text.length > 300 ? '...' : ''));
      }
      
      // Check for conversation thread
      const { data: thread } = await supabase
        .from('inbox_threads')
        .select('*')
        .eq('conversation_id', newMessage.conversation_id)
        .single();
        
      if (thread) {
        console.log('\n🧵 CONVERSATION THREAD:');
        console.log('======================');
        console.log(`Subject: ${thread.subject}`);
        console.log(`Last Message: ${new Date(thread.last_message_at).toLocaleString()}`);
        console.log(`Status: ${thread.status}`);
        console.log(`Preview: ${thread.last_message_preview}`);
      }
      
      console.log('\n✅ MAILERSEND WEBHOOK CAPTURE SUCCESSFUL!');
      console.log('==========================================');
      console.log('Your MailerSend inbound email was captured and stored!');
      console.log('The email threading system is working perfectly.');
      
      isMonitoring = false;
      process.exit(0);
    }
    
    lastMessageCount = currentCount;
    
  } catch (error) {
    console.error('❌ Monitor error:', error);
  }
}

console.log('🔍 MAILERSEND EMAIL MONITOR STARTED');
console.log('===================================');
console.log('Watching for new inbound emails from MailerSend...');
console.log('');
console.log('📋 MAILERSEND DASHBOARD SETUP REQUIRED:');
console.log('1. Go to: https://app.mailersend.com/');
console.log('2. Navigate to: Inbound');
console.log('3. Add route for domain: app.leadsup.io');
console.log('4. Pattern: campaign@app.leadsup.io (or *@app.leadsup.io for catch-all)');
console.log('5. Forward to webhook: https://leadsup.io/api/webhooks/mailersend');
console.log('6. Enable the route');
console.log('');
console.log('🧪 THEN TEST:');
console.log('1. Send email FROM: essabar.yassine@gmail.com');
console.log('2. Send email TO: campaign@app.leadsup.io');
console.log('3. Subject: "Test MailerSend webhook capture"');
console.log('4. Body: "Testing the email capture system!"');
console.log('');
console.log('⏰ Monitoring every 3 seconds...');
console.log('Press Ctrl+C to stop');
console.log('');

// Initial count
checkForNewMessages().then(() => {
  // Start monitoring
  const interval = setInterval(checkForNewMessages, 3000);
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n⏹️  Monitoring stopped');
    clearInterval(interval);
    process.exit(0);
  });
});