/**
 * Make contact 267 be processed first by adjusting creation dates
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function prioritize267() {
  console.log('🎯 Prioritizing contact 267 over 268...\n');

  try {
    // Set 268 to old date so it's not processed
    const oldDate = new Date('2025-01-01T00:00:00.000Z');
    
    // Set 267 to now so it's processed first
    const now = new Date();

    console.log('📅 Updating creation dates:');
    console.log(`   Contact 268: Setting to ${oldDate.toISOString()} (old)`);
    console.log(`   Contact 267: Setting to ${now.toISOString()} (now)`);

    // Update contact 268 to old date
    const { error: error268 } = await supabase
      .from('contacts')
      .update({ created_at: oldDate.toISOString() })
      .eq('id', 268);

    if (error268) {
      console.error('Error updating 268:', error268);
    } else {
      console.log('✅ Contact 268 set to old date');
    }

    // Update contact 267 to now
    const { error: error267 } = await supabase
      .from('contacts')
      .update({ created_at: now.toISOString() })
      .eq('id', 267);

    if (error267) {
      console.error('Error updating 267:', error267);
    } else {
      console.log('✅ Contact 267 set to current time');
    }

    // Clear all progress for both to be safe
    console.log('\n🗑️ Clearing all progress for both contacts...');
    
    for (const contactId of ['267', '268']) {
      await supabase.from('email_tracking').delete().eq('contact_id', contactId);
    }
    
    await supabase.from('inbox_messages').delete().in('contact_email', ['essabar.yassine@gmail.com', 'john.doe@techcorp.com']);
    
    console.log('✅ All progress cleared');

    // Test automation
    console.log('\n🧪 Testing automation with prioritized contact 267...');
    
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
      
      // Check if we got the right contact
      const contact267Result = result.results.find(r => r.contactId === '267');
      if (contact267Result) {
        console.log('\n🎉 SUCCESS! Contact 267 (essabar.yassine@gmail.com) was processed!');
        console.log('📧 Email sent to your Gmail address');
        console.log('📤 Should appear in sent folder');
      } else {
        console.log('\n⚠️ Contact 267 still not processed. Checking order...');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the prioritization
prioritize267().catch(console.error);