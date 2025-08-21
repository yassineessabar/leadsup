/**
 * Final reset of John Doe for GitHub automation test
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function finalResetJohnDoe() {
  console.log('🔄 Final reset of John Doe for GitHub automation...\n');

  try {
    // 1. Clear any existing progress/tracking records
    console.log('🗑️ Clearing all progress records...');
    
    // Clear email tracking (integer format)  
    await supabase
      .from('email_tracking')
      .delete()
      .eq('contact_id', '268');

    // Clear any inbox messages for john.doe@techcorp.com
    await supabase
      .from('inbox_messages')
      .delete()
      .eq('contact_email', 'john.doe@techcorp.com');

    console.log('✅ All tracking records cleared');

    // 2. Reset creation time to now (email will be due immediately with the fix)
    const now = new Date();
    
    const { data: updated, error: updateError } = await supabase
      .from('contacts')
      .update({ 
        created_at: now.toISOString()
      })
      .eq('id', 268)
      .select();

    if (updateError) {
      console.error('❌ Error updating creation time:', updateError);
      return;
    }

    console.log('✅ John Doe creation time reset to now');

    // 3. Verify reset
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', 268)
      .single();

    console.log('\n📋 John Doe ready for GitHub automation:');
    console.log(`   Name: ${contact.first_name} ${contact.last_name}`);
    console.log(`   Email: ${contact.email}`);
    console.log(`   Location: ${contact.location}`);
    console.log(`   Created: ${contact.created_at}`);
    console.log(`   Campaign: ${contact.campaign_id}`);

    console.log('\n🚀 READY FOR GITHUB AUTOMATION!');
    console.log('✅ Code is pushed with John Doe forced to be due immediately');
    console.log('⏰ Next GitHub Action run will process and send the email');
    console.log('📤 Email will appear in inbox sent folder');
    console.log('🔄 GitHub Actions runs every hour at xx:05');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the final reset
finalResetJohnDoe().catch(console.error);