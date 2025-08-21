/**
 * Clear all progress for contact 268 so only 267 gets processed
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function clear268Progress() {
  console.log('🗑️ Clearing all progress for John Doe ID 268...\n');

  try {
    // Clear email tracking for 268
    const { error: trackingError } = await supabase
      .from('email_tracking')
      .delete()
      .eq('contact_id', '268');

    if (trackingError) {
      console.error('Error clearing tracking:', trackingError);
    } else {
      console.log('✅ Email tracking cleared for contact 268');
    }

    // Clear inbox messages for john.doe@techcorp.com
    const { error: inboxError } = await supabase
      .from('inbox_messages')
      .delete()
      .eq('contact_email', 'john.doe@techcorp.com');

    if (inboxError) {
      console.error('Error clearing inbox:', inboxError);
    } else {
      console.log('✅ Inbox messages cleared for john.doe@techcorp.com');
    }

    // Clear any inbox threads
    const { error: threadsError } = await supabase
      .from('inbox_threads')
      .delete()
      .eq('contact_email', 'john.doe@techcorp.com');

    if (threadsError) {
      console.error('Error clearing threads:', threadsError);
    } else {
      console.log('✅ Inbox threads cleared for john.doe@techcorp.com');
    }

    console.log('\n🧪 Now testing automation with cleared 268...');
    
    const response = await fetch('http://localhost:3000/api/automation/process-scheduled?testMode=true&lookAhead=1440', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.N8N_API_USERNAME}:${process.env.N8N_API_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log(`📧 Test result: ${result.processed} processed, ${result.sent} sent`);

    if (result.results && result.results.length > 0) {
      console.log('📋 Emails sent:');
      result.results.forEach(r => {
        console.log(`   ID: ${r.contactId}, Email: ${r.contactEmail}, Step: ${r.sequenceStep}`);
      });
    }

    console.log('\n🎯 Status:');
    console.log('✅ Contact 268 progress cleared (reset to step 0)');
    console.log('✅ Both contacts 267 and 268 should now be at step 0');
    console.log('⏰ Next automation should process the first available contact');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the clear
clear268Progress().catch(console.error);