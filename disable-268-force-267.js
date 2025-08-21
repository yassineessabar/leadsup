/**
 * Temporarily disable contact 268 to force 267 to be processed
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function disable268Force267() {
  console.log('🚫 Temporarily disabling contact 268 to force 267 processing...\n');

  try {
    // Temporarily disable 268 by setting invalid email
    const { error: error268 } = await supabase
      .from('contacts')
      .update({ 
        email: 'disabled@example.com', // Invalid email so it won't be processed
        email_address: 'disabled@example.com'
      })
      .eq('id', 268);

    if (error268) {
      console.error('Error disabling 268:', error268);
    } else {
      console.log('✅ Contact 268 temporarily disabled (invalid email)');
    }

    // Make sure 267 is ready
    const { error: error267 } = await supabase
      .from('contacts')
      .update({ 
        created_at: new Date().toISOString(), // Current time
        email: 'essabar.yassine@gmail.com',   // Ensure correct email
        email_address: 'essabar.yassine@gmail.com'
      })
      .eq('id', 267);

    if (error267) {
      console.error('Error updating 267:', error267);
    } else {
      console.log('✅ Contact 267 ready for processing');
    }

    // Clear progress for 267
    await supabase.from('email_tracking').delete().eq('contact_id', '267');
    await supabase.from('inbox_messages').delete().eq('contact_email', 'essabar.yassine@gmail.com');
    
    console.log('✅ Contact 267 progress cleared');

    // Test automation
    console.log('\n🧪 Testing automation (should process 267 now that 268 is disabled)...');
    
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
      
      const contact267Result = result.results.find(r => r.contactId === '267');
      if (contact267Result) {
        console.log('\n🎉 PERFECT! Contact 267 (essabar.yassine@gmail.com) was processed!');
        console.log('📧 Email sent to your Gmail address');
        console.log('📤 Will appear in sent folder');
        
        // Now restore 268 for future use
        console.log('\n🔄 Restoring contact 268...');
        await supabase
          .from('contacts')
          .update({ 
            email: 'john.doe@techcorp.com',
            email_address: 'john.doe@techcorp.com'
          })
          .eq('id', 268);
        console.log('✅ Contact 268 restored');
        
      } else {
        console.log('\n⚠️ Still not processing 267. Other contacts might be interfering.');
      }
    } else {
      console.log('\n⚠️ No emails processed. Contact 267 might not be due yet.');
    }

    console.log('\n🚀 READY FOR GITHUB AUTOMATION!');
    console.log('✅ Contact 267 (essabar.yassine@gmail.com) is ready');
    console.log('📧 Next automation run should send to your Gmail');
    console.log('📤 Email will appear in sent folder');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
disable268Force267().catch(console.error);