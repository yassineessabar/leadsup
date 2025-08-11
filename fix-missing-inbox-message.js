#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function fixMissingInboxMessage() {
  console.log('🔧 FIXING MISSING INBOX MESSAGE');
  console.log('================================\n');
  
  try {
    // Get the orphaned thread
    const { data: thread, error: threadError } = await supabase
      .from('inbox_threads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (threadError || !thread) {
      console.log('❌ No thread found to fix');
      return;
    }
    
    console.log('📊 Thread found:');
    console.log(`   ID: ${thread.id}`);
    console.log(`   Conversation: ${thread.conversation_id}`);
    console.log(`   Contact: ${thread.contact_email}`);
    console.log(`   Subject: ${thread.subject}`);
    console.log('');
    
    // Check if message already exists
    const { data: existingMessage } = await supabase
      .from('inbox_messages')
      .select('id')
      .eq('conversation_id', thread.conversation_id)
      .single();
      
    if (existingMessage) {
      console.log('✅ Message already exists for this thread');
      return;
    }
    
    // Create the missing inbox message
    const messageData = {
      user_id: thread.user_id,
      message_id: `campaign-${thread.campaign_id}-${Date.now()}`, // Generate a unique message ID
      conversation_id: thread.conversation_id,
      campaign_id: thread.campaign_id,
      contact_email: thread.contact_email,
      contact_name: thread.contact_name,
      sender_email: 'campaign@yourdomain.com', // Default sender
      subject: thread.subject,
      body_text: thread.last_message_preview || 'Campaign email content',
      body_html: `<p>${thread.last_message_preview || 'Campaign email content'}</p>`,
      direction: 'outbound',
      channel: 'email',
      message_type: 'email',
      status: 'read', // Outbound emails are typically read
      folder: 'sent', // Outbound emails go to sent folder
      provider: 'smtp',
      provider_data: {
        campaign_id: thread.campaign_id,
        generated_from_thread: true
      },
      sent_at: thread.last_message_at || thread.created_at,
      created_at: thread.created_at
    };
    
    console.log('📧 Creating missing inbox message...');
    const { data: newMessage, error: insertError } = await supabase
      .from('inbox_messages')
      .insert(messageData)
      .select()
      .single();
      
    if (insertError) {
      console.error('❌ Error creating message:', insertError);
      return;
    }
    
    console.log('✅ Successfully created inbox message:');
    console.log(`   Message ID: ${newMessage.id}`);
    console.log(`   Conversation: ${newMessage.conversation_id}`);
    console.log(`   Direction: ${newMessage.direction}`);
    console.log(`   Folder: ${newMessage.folder}`);
    
    // Update thread message count
    const { error: updateError } = await supabase
      .from('inbox_threads')
      .update({
        message_count: 1,
        unread_count: 0 // Outbound messages are read by default
      })
      .eq('id', thread.id);
      
    if (updateError) {
      console.error('⚠️ Error updating thread count:', updateError);
    } else {
      console.log('✅ Updated thread message count');
    }
    
    console.log('\n🎉 Email flow fixed! Your inbox should now show the email properly.');
    
  } catch (error) {
    console.error('❌ Error fixing inbox message:', error);
  }
}

fixMissingInboxMessage()
  .then(() => {
    console.log('\n✅ Fix complete');
  })
  .catch(error => {
    console.error('❌ Fix failed:', error);
  });