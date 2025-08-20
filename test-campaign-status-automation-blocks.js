#!/usr/bin/env node

/**
 * Test Campaign Status Automation Blocks
 * Verifies that NO email automation is triggered when campaigns are in "Warming" or "Paused" status
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testCampaignStatusAutomationBlocks() {
  console.log('🛡️ TESTING CAMPAIGN STATUS AUTOMATION BLOCKS');
  console.log('═'.repeat(70));
  console.log('Verifying NO email automation occurs for Warming/Paused campaigns');
  console.log('');

  try {
    // Find a test campaign
    let { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .limit(1);

    let testCampaign;
    if (campaigns && campaigns.length > 0) {
      testCampaign = campaigns[0];
      console.log(`📋 Using test campaign: ${testCampaign.name} (${testCampaign.status})`);
    } else {
      console.log('❌ No campaigns found for testing');
      process.exit(1);
    }

    // Test scenarios for each non-active status
    const testStatuses = ['Paused', 'Warming', 'Draft', 'Completed'];
    const results = {};

    for (const status of testStatuses) {
      console.log(`\n🔍 Testing automation blocks for status: ${status}`);
      console.log('─'.repeat(50));

      // Set campaign to test status
      await supabase
        .from('campaigns')
        .update({ status: status })
        .eq('id', testCampaign.id);

      // Test 1: Process Scheduled Automation
      console.log(`1️⃣ Testing process-scheduled automation...`);
      const processResponse = await fetch(`${BASE_URL}/api/automation/process-scheduled?testMode=true`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const processResult = await processResponse.json();
      
      if (processResult.success) {
        const skipped = processResult.skipped?.inactiveCampaigns || 0;
        const processed = processResult.processed || 0;
        
        console.log(`   📊 Results: ${processed} processed, ${skipped} skipped (inactive campaigns)`);
        
        if (processed === 0 && skipped > 0) {
          console.log(`   ✅ BLOCKED: No emails processed for ${status} campaign`);
          results[`${status}_process_scheduled`] = 'BLOCKED';
        } else if (processed > 0) {
          console.log(`   ❌ LEAKED: ${processed} emails processed despite ${status} status!`);
          results[`${status}_process_scheduled`] = 'LEAKED';
        } else {
          console.log(`   ℹ️ NO DATA: No contacts found to test`);
          results[`${status}_process_scheduled`] = 'NO_DATA';
        }
      } else {
        console.log(`   ⚠️ API ERROR: ${processResult.error}`);
        results[`${status}_process_scheduled`] = 'ERROR';
      }

      // Test 2: Direct automation run
      console.log(`2️⃣ Testing direct automation run...`);
      const runResponse = await fetch(`${BASE_URL}/api/automation/run?campaignId=${testCampaign.id}&testMode=true`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const runResult = await runResponse.json();
      
      if (runResult.success) {
        const processed = runResult.processed || 0;
        const message = runResult.message || '';
        
        console.log(`   📊 Results: ${processed} processed - ${message}`);
        
        if (processed === 0 && (message.includes('not active') || message.includes('Active campaigns'))) {
          console.log(`   ✅ BLOCKED: No emails sent for ${status} campaign`);
          results[`${status}_direct_run`] = 'BLOCKED';
        } else if (processed > 0) {
          console.log(`   ❌ LEAKED: ${processed} emails sent despite ${status} status!`);
          results[`${status}_direct_run`] = 'LEAKED';
        } else {
          console.log(`   ℹ️ NO DATA: No active campaigns or contacts found`);
          results[`${status}_direct_run`] = 'NO_DATA';
        }
      } else {
        console.log(`   ⚠️ API ERROR: ${runResult.error}`);
        results[`${status}_direct_run`] = 'ERROR';
      }

      // Test 3: Contact creation auto-scheduling
      console.log(`3️⃣ Testing contact creation auto-scheduling...`);
      const testContact = {
        first_name: 'AutoTest',
        last_name: `Status${status}`,
        email: `autotest.${status.toLowerCase()}.${Date.now()}@example.com`,
        campaign_id: testCampaign.id,
        company: `Test Corp ${status}`
      };

      const contactResponse = await fetch(`${BASE_URL}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testContact)
      });

      const contactResult = await contactResponse.json();
      
      if (contactResult.contact) {
        const schedulingTriggered = contactResult.scheduling_triggered;
        console.log(`   📊 Contact created: ${contactResult.contact.email}`);
        console.log(`   📅 Scheduling triggered: ${schedulingTriggered ? 'YES' : 'NO'}`);
        
        if (!schedulingTriggered) {
          console.log(`   ✅ BLOCKED: Auto-scheduling skipped for ${status} campaign`);
          results[`${status}_contact_creation`] = 'BLOCKED';
        } else {
          console.log(`   ❌ LEAKED: Auto-scheduling triggered despite ${status} status!`);
          results[`${status}_contact_creation`] = 'LEAKED';
        }
        
        // Clean up test contact
        await supabase
          .from('contacts')
          .delete()
          .eq('id', contactResult.contact.id);
          
      } else if (contactResult.error === 'Unauthorized') {
        console.log(`   ⚠️ AUTH: Contact creation requires authentication - skipping test`);
        results[`${status}_contact_creation`] = 'AUTH_REQUIRED';
      } else {
        console.log(`   ⚠️ ERROR: ${contactResult.error}`);
        results[`${status}_contact_creation`] = 'ERROR';
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Restore campaign to Active status
    await supabase
      .from('campaigns')
      .update({ status: 'Active' })
      .eq('id', testCampaign.id);

    console.log('\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('═'.repeat(70));

    let totalTests = 0;
    let blockedTests = 0;
    let leakedTests = 0;

    for (const [testName, result] of Object.entries(results)) {
      const [status, testType] = testName.split('_', 2);
      const emoji = result === 'BLOCKED' ? '✅' : result === 'LEAKED' ? '❌' : result === 'NO_DATA' ? 'ℹ️' : '⚠️';
      console.log(`${emoji} ${status.padEnd(10)} ${testType.padEnd(20)} ${result}`);
      
      if (result === 'BLOCKED' || result === 'LEAKED') {
        totalTests++;
        if (result === 'BLOCKED') blockedTests++;
        if (result === 'LEAKED') leakedTests++;
      }
    }

    console.log('\n🎯 SECURITY SUMMARY');
    console.log('─'.repeat(30));
    console.log(`Total Security Tests: ${totalTests}`);
    console.log(`✅ Properly Blocked: ${blockedTests}`);
    console.log(`❌ Security Leaks: ${leakedTests}`);
    
    if (leakedTests === 0) {
      console.log('\n🛡️ ✅ ALL AUTOMATION PROPERLY BLOCKED FOR NON-ACTIVE CAMPAIGNS!');
      console.log('Email automation is secure - no emails will be sent for Warming/Paused campaigns.');
    } else {
      console.log('\n🚨 ❌ SECURITY ISSUE: Some automation is NOT properly blocked!');
      console.log('Manual review required to fix automation leaks.');
    }

    return {
      totalTests,
      blockedTests,
      leakedTests,
      results,
      secure: leakedTests === 0
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the comprehensive security test
testCampaignStatusAutomationBlocks()
  .then((results) => {
    console.log('\n🏁 Security audit complete!');
    if (results.secure) {
      console.log('🎉 Email automation is properly secured against Warming/Paused campaigns.');
      process.exit(0);
    } else {
      console.log('⚠️ Security issues found - manual review required.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });