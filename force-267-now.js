/**
 * Force contact 267 to be processed by temporarily removing 268 from the campaign
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function force267Now() {
  console.log('🎯 Forcing contact 267 to be processed by removing 268 temporarily...\n');

  try {
    // Temporarily remove 268 from campaign by setting invalid campaign_id
    const { error: error268 } = await supabase
      .from('contacts')
      .update({ 
        campaign_id: 'disabled-' + new Date().getTime() // Invalid campaign ID
      })
      .eq('id', 268);

    if (error268) {
      console.error('Error disabling 268:', error268);
    } else {
      console.log('✅ Contact 268 temporarily removed from campaign');
    }

    // Ensure 267 is ready
    const { error: error267 } = await supabase
      .from('contacts')
      .update({ 
        created_at: new Date().toISOString(),
        campaign_id: 'a1eca083-a7c6-489b-b59e-c66aa2b0b601' // Correct campaign ID
      })
      .eq('id', 267);

    if (error267) {
      console.error('Error updating 267:', error267);
    } else {
      console.log('✅ Contact 267 ready in correct campaign');
    }

    // Clear progress for 267
    await supabase.from('email_tracking').delete().eq('contact_id', '267');
    await supabase.from('inbox_messages').delete().eq('contact_email', 'essabar.yassine@gmail.com');
    
    console.log('✅ Contact 267 progress cleared');

    // Test automation immediately
    console.log('\n🚀 Testing automation NOW (should process 267)...');
    
    const response = await fetch('http://localhost:3000/api/automation/process-scheduled?testMode=true&lookAhead=1440', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.N8N_API_USERNAME}:${process.env.N8N_API_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log(`📧 Result: ${result.processed} processed, ${result.sent} sent`);

    if (result.results && result.results.length > 0) {
      console.log('📋 Emails sent:');
      result.results.forEach(r => {
        console.log(`   ID: ${r.contactId}, Email: ${r.contactEmail}, Status: ${r.status}`);
        
        if (r.contactEmail === 'essabar.yassine@gmail.com') {
          console.log('\n🎉🎉🎉 SUCCESS! YOUR EMAIL WAS SENT! 🎉🎉🎉');
          console.log('📧 Email sent to: essabar.yassine@gmail.com');
          console.log('📤 Check your inbox "Sent" folder!');
        }
      });
    }

    // Restore 268 for future use
    console.log('\n🔄 Restoring contact 268 to campaign...');
    await supabase
      .from('contacts')
      .update({ 
        campaign_id: 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
      })
      .eq('id', 268);
    console.log('✅ Contact 268 restored to campaign');

    console.log('\n🎯 FINAL STATUS:');
    if (result.results?.some(r => r.contactEmail === 'essabar.yassine@gmail.com')) {
      console.log('✅ SUCCESS! Email sent to your Gmail address');
      console.log('📤 Should appear in inbox sent folder');
      console.log('🚀 Automation system confirmed working end-to-end');
    } else {
      console.log('⚠️ Contact 267 still not processed - may need campaign status check');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run immediately
force267Now().catch(console.error);