#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function debugFolderUpdates() {
  console.log('🔍 CHECKING FOLDER FIELD IN DATABASE');
  console.log('===================================\n');
  
  try {
    // Check inbox_messages table structure
    console.log('📊 Recent inbox_messages with folder info:');
    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('id, message_id, subject, folder, status, contact_email, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('❌ Error fetching messages:', error);
      return;
    }
    
    if (messages && messages.length > 0) {
      console.log('📧 Recent messages:');
      messages.forEach((msg, i) => {
        console.log(`   ${i + 1}. ID: ${msg.id}`);
        console.log(`      Subject: "${msg.subject}"`);
        console.log(`      From: ${msg.contact_email}`);
        console.log(`      Folder: ${msg.folder || 'NULL'}`);
        console.log(`      Status: ${msg.status}`);
        console.log(`      Created: ${new Date(msg.created_at).toLocaleString()}`);
        console.log(`      Updated: ${new Date(msg.updated_at || msg.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('   No messages found');
    }
    
    // Check folder distribution
    console.log('📁 Current folder distribution:');
    const { data: folderStats, error: statsError } = await supabase
      .from('inbox_messages')
      .select('folder')
      .order('created_at', { ascending: false });
      
    if (!statsError && folderStats) {
      const distribution = {};
      folderStats.forEach(msg => {
        const folder = msg.folder || 'NULL';
        distribution[folder] = (distribution[folder] || 0) + 1;
      });
      
      Object.entries(distribution).forEach(([folder, count]) => {
        console.log(`   ${folder}: ${count} messages`);
      });
    }
    
    // Test updating a message folder
    if (messages && messages.length > 0) {
      const testMessage = messages[0];
      console.log(`\n🧪 Testing folder update on message ${testMessage.id}:`);
      console.log(`   Current folder: ${testMessage.folder || 'NULL'}`);
      
      const newFolder = testMessage.folder === 'trash' ? 'inbox' : 'trash';
      console.log(`   Updating to: ${newFolder}`);
      
      const { data: updated, error: updateError } = await supabase
        .from('inbox_messages')
        .update({ 
          folder: newFolder,
          updated_at: new Date().toISOString()
        })
        .eq('id', testMessage.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('❌ Error updating message:', updateError);
      } else {
        console.log('✅ Successfully updated message:');
        console.log(`   New folder: ${updated.folder}`);
        console.log(`   Updated at: ${updated.updated_at}`);
        
        // Verify the update by fetching again
        const { data: verification } = await supabase
          .from('inbox_messages')
          .select('id, folder, updated_at')
          .eq('id', testMessage.id)
          .single();
          
        console.log('🔍 Verification fetch:');
        console.log(`   Folder: ${verification.folder}`);
        console.log(`   Updated: ${verification.updated_at}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugFolderUpdates()
  .then(() => {
    console.log('\n✅ Folder debug complete');
  })
  .catch(error => {
    console.error('❌ Debug failed:', error);
  });