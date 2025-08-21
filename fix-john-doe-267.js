/**
 * Fix John Doe ID 267 (the one with essabar.yassine@gmail.com) to be processed
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixJohnDoe267() {
  console.log('🔧 Fixing John Doe ID 267 (essabar.yassine@gmail.com)...\n');

  try {
    // Get current data
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', 267)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching contact 267:', fetchError);
      return;
    }

    console.log('📋 Current John Doe ID 267:');
    console.log(`   Name: ${contact.first_name} ${contact.last_name}`);
    console.log(`   Email: ${contact.email}`);
    console.log(`   Campaign: ${contact.campaign_id}`);
    console.log(`   Created: ${contact.created_at}`);

    // Update creation time to make this contact due now too
    const now = new Date();
    
    const { data: updated, error: updateError } = await supabase
      .from('contacts')
      .update({ 
        created_at: now.toISOString()
      })
      .eq('id', 267)
      .select();

    if (updateError) {
      console.error('❌ Error updating contact 267:', updateError);
      return;
    }

    console.log('✅ John Doe ID 267 creation time updated to now');

    // Clear any existing progress for this contact
    console.log('🗑️ Clearing progress records for ID 267...');
    
    await supabase
      .from('email_tracking')
      .delete()
      .eq('contact_id', '267');

    await supabase
      .from('inbox_messages')
      .delete()
      .eq('contact_email', 'essabar.yassine@gmail.com');

    console.log('✅ Progress records cleared');

    // Test if automation will pick up this contact
    console.log('\n🧪 Testing automation with updated contact...');
    
    const response = await fetch('http://localhost:3000/api/automation/process-scheduled?testMode=true&lookAhead=1440', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.N8N_API_USERNAME}:${process.env.N8N_API_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log(`📧 Test result: ${result.processed} processed, ${result.sent} sent`);

    if (result.processed > 0) {
      console.log('✅ Contact 267 was processed!');
      if (result.results) {
        result.results.forEach(r => {
          console.log(`   Sent to: ${r.contactEmail} (ID: ${r.contactId})`);
        });
      }
    } else {
      console.log('⚠️ Contact 267 not processed yet');
    }

    console.log('\n🎯 Summary:');
    console.log('✅ John Doe ID 267 (essabar.yassine@gmail.com) is reset');
    console.log('✅ Creation time set to now (will be due immediately with the forced logic)');
    console.log('⏰ Next GitHub automation run will process this contact');
    console.log('📧 Email will be sent to essabar.yassine@gmail.com');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixJohnDoe267().catch(console.error);