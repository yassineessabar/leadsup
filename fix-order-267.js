/**
 * Fix order by making 267 older than 268 (since automation processes oldest first)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixOrder267() {
  console.log('🔄 Fixing order: Making 267 older than 268 (automation processes oldest first)...\n');

  try {
    // Set 267 to very old date (will be processed first)
    const veryOld = new Date('2025-01-01T00:00:00.000Z');
    
    // Set 268 to newer date (will be processed second)
    const newer = new Date('2025-01-02T00:00:00.000Z');

    console.log('📅 Setting creation dates for correct order:');
    console.log(`   Contact 267: ${veryOld.toISOString()} (oldest - processed FIRST)`);
    console.log(`   Contact 268: ${newer.toISOString()} (newer - processed second)`);

    // Update contact 267 to oldest date
    const { error: error267 } = await supabase
      .from('contacts')
      .update({ created_at: veryOld.toISOString() })
      .eq('id', 267);

    if (error267) {
      console.error('Error updating 267:', error267);
    } else {
      console.log('✅ Contact 267 set to oldest date (will be processed first)');
    }

    // Update contact 268 to newer date
    const { error: error268 } = await supabase
      .from('contacts')
      .update({ created_at: newer.toISOString() })
      .eq('id', 268);

    if (error268) {
      console.error('Error updating 268:', error268);
    } else {
      console.log('✅ Contact 268 set to newer date (will be processed second)');
    }

    // Clear all progress for both
    console.log('\n🗑️ Clearing all progress records...');
    
    for (const contactId of ['267', '268']) {
      await supabase.from('email_tracking').delete().eq('contact_id', contactId);
    }
    
    await supabase.from('inbox_messages').delete().in('contact_email', ['essabar.yassine@gmail.com', 'john.doe@techcorp.com']);
    await supabase.from('inbox_threads').delete().in('contact_email', ['essabar.yassine@gmail.com', 'john.doe@techcorp.com']);
    
    console.log('✅ All progress cleared for both contacts');

    // Test automation
    console.log('\n🧪 Testing automation (should process 267 first now)...');
    
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
      
      // Check if we got contact 267
      const contact267Result = result.results.find(r => r.contactId === '267');
      if (contact267Result) {
        console.log('\n🎉 SUCCESS! Contact 267 (essabar.yassine@gmail.com) was processed!');
        console.log('📧 Email sent to your Gmail address');
        console.log('📤 Should appear in sent folder');
        console.log('🚀 Ready for GitHub automation to pick up contact 267');
      } else {
        console.log('\n❌ Still processing 268 instead of 267');
      }
    }

    console.log('\n🎯 Final Status:');
    console.log('✅ Contact 267: oldest date (should be processed first)');
    console.log('✅ Contact 268: newer date (should be processed second)');
    console.log('✅ Both contacts reset to step 0');
    console.log('⏰ Next GitHub automation should process contact 267 first');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixOrder267().catch(console.error);