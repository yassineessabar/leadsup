#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function clearAllEmails() {
  console.log('🗑️ CLEARING ALL EMAILS FROM DATABASE');
  console.log('====================================\n');
  
  try {
    // First, check current email count
    const { count: messageCount } = await supabase
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true });
    
    const { count: threadCount } = await supabase
      .from('inbox_threads')
      .select('*', { count: 'exact', head: true });
    
    const { count: actionCount } = await supabase
      .from('inbox_actions')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Current database state:');
    console.log(`   Messages: ${messageCount || 0}`);
    console.log(`   Threads: ${threadCount || 0}`);
    console.log(`   Actions: ${actionCount || 0}`);
    console.log('');
    
    if (messageCount === 0 && threadCount === 0 && actionCount === 0) {
      console.log('✅ Database is already clean - no emails to remove');
      return;
    }
    
    console.log('🧹 Clearing all inbox data...');
    
    // Delete inbox actions first (has foreign key references)
    if (actionCount > 0) {
      const { error: actionsError } = await supabase
        .from('inbox_actions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (actionsError) {
        console.error('❌ Error deleting inbox_actions:', actionsError);
      } else {
        console.log(`✅ Deleted ${actionCount} inbox actions`);
      }
    }
    
    // Delete inbox messages
    if (messageCount > 0) {
      const { error: messagesError } = await supabase
        .from('inbox_messages')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (messagesError) {
        console.error('❌ Error deleting inbox_messages:', messagesError);
      } else {
        console.log(`✅ Deleted ${messageCount} inbox messages`);
      }
    }
    
    // Delete inbox threads
    if (threadCount > 0) {
      const { error: threadsError } = await supabase
        .from('inbox_threads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (threadsError) {
        console.error('❌ Error deleting inbox_threads:', threadsError);
      } else {
        console.log(`✅ Deleted ${threadCount} inbox threads`);
      }
    }
    
    // Verify cleanup
    const { count: finalMessageCount } = await supabase
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true });
      
    const { count: finalThreadCount } = await supabase
      .from('inbox_threads')
      .select('*', { count: 'exact', head: true });
      
    const { count: finalActionCount } = await supabase
      .from('inbox_actions')
      .select('*', { count: 'exact', head: true });
    
    console.log('\n📊 Final database state:');
    console.log(`   Messages: ${finalMessageCount || 0}`);
    console.log(`   Threads: ${finalThreadCount || 0}`);
    console.log(`   Actions: ${finalActionCount || 0}`);
    
    if (finalMessageCount === 0 && finalThreadCount === 0 && finalActionCount === 0) {
      console.log('\n🎉 SUCCESS! All emails have been cleared from the database');
      console.log('The inbox is now completely empty and ready for fresh testing.');
    } else {
      console.log('\n⚠️ Some records may still remain - please check manually');
    }
    
  } catch (error) {
    console.error('❌ Error clearing emails:', error);
  }
}

clearAllEmails()
  .then(() => {
    console.log('\n✅ Email cleanup complete');
  })
  .catch(error => {
    console.error('❌ Cleanup failed:', error);
  });