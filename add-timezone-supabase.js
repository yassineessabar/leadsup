/**
 * Script to add timezone column and update contact data using Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addTimezoneSupport() {
  console.log('🔧 Adding timezone support to contacts...\n');

  try {
    // First try to add timezone column to contacts table
    console.log('1. Adding timezone column to contacts table...');
    const { error: alterError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone TEXT;'
      });

    if (alterError) {
      console.log('⚠️ Could not add timezone column via RPC (this is normal if RPC not available)');
      console.log('   The column might already exist or need to be added via Supabase dashboard');
    } else {
      console.log('✅ Timezone column added to contacts table');
    }

    // Try to update John Doe's email first (this should work)
    console.log('\n2. Fixing John Doe\'s email address...');
    const { data: johnDoeUpdate, error: emailError } = await supabase
      .from('contacts')
      .update({ 
        email: 'john.doe@techcorp.com',
        email_address: 'john.doe@techcorp.com'
      })
      .eq('id', 268)
      .select();

    if (emailError) {
      console.error('❌ Error updating John Doe email:', emailError);
    } else {
      console.log('✅ John Doe email fixed: john.doe@techcorp.com');
    }

    // Try to add timezone if column exists
    console.log('\n3. Attempting to add timezone to John Doe...');
    const { data: timezoneUpdate, error: timezoneError } = await supabase
      .from('contacts')
      .update({ timezone: 'Australia/Sydney' })
      .eq('id', 268)
      .select();

    if (timezoneError) {
      console.log('⚠️ Timezone column does not exist yet:', timezoneError.message);
      console.log('   Need to add via Supabase dashboard: ALTER TABLE contacts ADD COLUMN timezone TEXT;');
    } else {
      console.log('✅ John Doe timezone set to Australia/Sydney');
    }

    // Check current status
    console.log('\n4. Checking current John Doe data...');
    const { data: currentData, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', 268)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching current data:', fetchError);
    } else {
      console.log('📊 Current John Doe data:');
      console.log(`   Email: ${currentData.email}`);
      console.log(`   Email Address: ${currentData.email_address || 'not set'}`);
      console.log(`   Location: ${currentData.location}`);
      console.log(`   Timezone: ${currentData.timezone || 'not set'}`);
      console.log(`   Created: ${currentData.created_at}`);
    }

    // Test automation with current data
    console.log('\n5. Testing automation with current data...');
    const response = await fetch('http://localhost:3000/api/automation/process-scheduled?testMode=true&lookAhead=1440', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.N8N_API_USERNAME}:${process.env.N8N_API_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('📧 Automation test result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.debugInfo?.johnDoeContact) {
      const john = result.debugInfo.johnDoeContact;
      console.log('   John Doe in automation:');
      console.log(`     Email: ${john.email_address || john.email}`);
      console.log(`     Timezone: ${john.timezone || 'not set'}`);
      console.log(`     Location: ${john.location}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
addTimezoneSupport().catch(console.error);