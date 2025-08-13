const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration - use the actual values from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk';

console.log('🔧 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestReplies() {
  console.log('\n📥 CHECKING LATEST EMAIL REPLIES');
  console.log('=================================\n');
  
  try {
    // Get latest inbound emails
    const { data: replies, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .order('received_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (!replies || replies.length === 0) {
      console.log('⚠️  No replies found yet');
      console.log('\nTo capture replies:');
      console.log('1. Send a test email: node test-real-email-sending.js');
      console.log('2. Reply to that email from your inbox');
      console.log('3. Run this script again to see the captured reply');
      return;
    }
    
    console.log(`✅ Found ${replies.length} recent reply(ies):\n`);
    
    replies.forEach((reply, index) => {
      console.log(`📧 Reply #${index + 1}:`);
      console.log(`   From: ${reply.contact_email}`);
      console.log(`   To: ${reply.sender_email}`);
      console.log(`   Subject: ${reply.subject}`);
      console.log(`   Received: ${new Date(reply.received_at).toLocaleString()}`);
      
      if (reply.body_text) {
        const preview = reply.body_text.substring(0, 150).replace(/\n/g, ' ');
        console.log(`   Message: "${preview}${reply.body_text.length > 150 ? '...' : ''}"`);
      }
      
      console.log(`   Conversation ID: ${reply.conversation_id}`);
      console.log('   ' + '-'.repeat(50));
    });
    
    console.log('\n🔄 To monitor for new replies in real-time:');
    console.log('   node monitor-inbound-replies.js --monitor');
    
  } catch (error) {
    console.error('❌ Failed to check replies:', error);
  }
}

// Run the check
checkLatestReplies();