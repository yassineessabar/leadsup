#!/usr/bin/env node

/**
 * Test Campaign Status Management
 * Tests pause/warming/resume functionality for sequence management
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_CAMPAIGN_ID = '695fcc7f-7674-4d1f-adf2-ff910ffdb853';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testCampaignStatusManagement() {
  console.log('🧪 TESTING CAMPAIGN STATUS MANAGEMENT');
  console.log('═'.repeat(60));
  console.log(`Campaign ID: ${TEST_CAMPAIGN_ID}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  try {
    // 1. Get current campaign status
    console.log('1️⃣ Getting current campaign status...');
    const { data: initialCampaign } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('id', TEST_CAMPAIGN_ID)
      .single();
    
    console.log(`   Current status: ${initialCampaign?.status || 'NOT FOUND'}`);
    console.log(`   Campaign name: ${initialCampaign?.name || 'NOT FOUND'}`);
    
    if (!initialCampaign) {
      throw new Error('Test campaign not found');
    }

    // 2. Test setting campaign to Active (if not already)
    if (initialCampaign.status !== 'Active') {
      console.log('\n2️⃣ Setting campaign to Active...');
      const activeResponse = await fetch(`${BASE_URL}/api/campaigns/${TEST_CAMPAIGN_ID}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' })
      });
      
      const activeResult = await activeResponse.json();
      console.log(`   ✅ Active result:`, activeResult.success ? 'SUCCESS' : `FAILED: ${activeResult.error}`);
      
      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 3. Test pausing the campaign
    console.log('\n3️⃣ Testing campaign PAUSE...');
    const pauseResponse = await fetch(`${BASE_URL}/api/campaigns/${TEST_CAMPAIGN_ID}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Paused' })
    });
    
    const pauseResult = await pauseResponse.json();
    console.log(`   Pause result:`, pauseResult.success ? '✅ SUCCESS' : `❌ FAILED: ${pauseResult.error}`);
    
    if (pauseResult.success) {
      console.log(`   📋 Status changed: ${pauseResult.data.previousStatus} → ${pauseResult.data.status}`);
      
      // Check if contacts were updated to Paused status
      const { data: pausedContacts } = await supabase
        .from('contacts')
        .select('id, email, email_status')
        .eq('campaign_id', TEST_CAMPAIGN_ID)
        .eq('email_status', 'Paused');
      
      console.log(`   📊 Contacts with 'Paused' status: ${pausedContacts?.length || 0}`);
      
      // Check if scheduled emails were paused (if table exists)
      try {
        const { data: pausedEmails } = await supabase
          .from('scheduled_emails')
          .select('id, status')
          .eq('campaign_id', TEST_CAMPAIGN_ID)
          .eq('status', 'paused');
        
        console.log(`   📧 Scheduled emails paused: ${pausedEmails?.length || 0}`);
      } catch (error) {
        console.log(`   📧 Scheduled emails table not available`);
      }
    }

    // 4. Test warming status
    console.log('\n4️⃣ Testing campaign WARMING...');
    const warmingResponse = await fetch(`${BASE_URL}/api/campaigns/${TEST_CAMPAIGN_ID}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Warming' })
    });
    
    const warmingResult = await warmingResponse.json();
    console.log(`   Warming result:`, warmingResult.success ? '✅ SUCCESS' : `❌ FAILED: ${warmingResult.error}`);
    
    if (warmingResult.success) {
      console.log(`   📋 Status changed: ${warmingResult.data.previousStatus} → ${warmingResult.data.status}`);
      
      // Check warming system integration (if table exists)
      try {
        const { data: warmupCampaigns } = await supabase
          .from('warmup_campaigns')
          .select('id, status')
          .eq('campaign_id', TEST_CAMPAIGN_ID);
        
        console.log(`   🔥 Warmup campaigns found: ${warmupCampaigns?.length || 0}`);
      } catch (error) {
        console.log(`   🔥 Warmup campaigns table not available`);
      }
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Test resuming (Warming → Active)
    console.log('\n5️⃣ Testing campaign RESUME (Warming → Active)...');
    const resumeResponse = await fetch(`${BASE_URL}/api/campaigns/${TEST_CAMPAIGN_ID}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Active' })
    });
    
    const resumeResult = await resumeResponse.json();
    console.log(`   Resume result:`, resumeResult.success ? '✅ SUCCESS' : `❌ FAILED: ${resumeResult.error}`);
    
    if (resumeResult.success) {
      console.log(`   📋 Status changed: ${resumeResult.data.previousStatus} → ${resumeResult.data.status}`);
      
      // Check if contacts were restored from Paused
      const { data: activeContacts } = await supabase
        .from('contacts')
        .select('id, email, email_status')
        .eq('campaign_id', TEST_CAMPAIGN_ID)
        .eq('email_status', 'Valid');
      
      console.log(`   📊 Contacts with 'Valid' status (restored): ${activeContacts?.length || 0}`);
      
      // Check if scheduled emails were restored (if table exists)
      try {
        const { data: pendingEmails } = await supabase
          .from('scheduled_emails')
          .select('id, status')
          .eq('campaign_id', TEST_CAMPAIGN_ID)
          .eq('status', 'pending');
        
        console.log(`   📧 Scheduled emails restored to pending: ${pendingEmails?.length || 0}`);
      } catch (error) {
        console.log(`   📧 Scheduled emails table not available`);
      }
    }

    // 6. Test daily limits and rescheduling
    console.log('\n6️⃣ Testing email rescheduling API...');
    const rescheduleResponse = await fetch(`${BASE_URL}/api/campaigns/${TEST_CAMPAIGN_ID}/reschedule-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const rescheduleResult = await rescheduleResponse.json();
    console.log(`   Reschedule result:`, rescheduleResult.success ? '✅ SUCCESS' : `❌ FAILED: ${rescheduleResult.error}`);
    
    if (rescheduleResult.success) {
      console.log(`   📧 Rescheduled count: ${rescheduleResult.rescheduled_count || 0}`);
      console.log(`   📋 Message: ${rescheduleResult.message}`);
    }

    console.log('\n✅ Campaign Status Management Test Complete!');
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('─'.repeat(40));
    console.log(`✅ Pause functionality: ${pauseResult?.success ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Warming functionality: ${warmingResult?.success ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Resume functionality: ${resumeResult?.success ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Rescheduling API: ${rescheduleResult?.success ? 'WORKING' : 'FAILED'}`);
    
    return {
      pause: pauseResult?.success,
      warming: warmingResult?.success,
      resume: resumeResult?.success,
      reschedule: rescheduleResult?.success
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testCampaignStatusManagement()
  .then((results) => {
    const allPassed = Object.values(results).every(Boolean);
    console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    process.exit(allPassed ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });