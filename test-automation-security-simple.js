#!/usr/bin/env node

/**
 * Simple Automation Security Test
 * Verifies email automation blocks for Warming/Paused campaigns
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testAutomationSecurity() {
  console.log('🛡️ AUTOMATION SECURITY TEST');
  console.log('═'.repeat(50));
  
  try {
    // Find test campaign
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .limit(1);

    if (!campaigns || campaigns.length === 0) {
      console.log('❌ No campaigns found');
      process.exit(1);
    }

    const campaign = campaigns[0];
    console.log(`📋 Testing with campaign: ${campaign.name}`);
    
    // Test critical scenarios
    const testResults = {};
    
    // Test 1: Paused Campaign
    console.log('\n1️⃣ Testing PAUSED campaign...');
    await supabase.from('campaigns').update({ status: 'Paused' }).eq('id', campaign.id);
    
    const pausedResponse = await fetch(`${BASE_URL}/api/automation/process-scheduled?testMode=true`);
    if (pausedResponse.ok) {
      const pausedResult = await pausedResponse.json();
      const skippedInactive = pausedResult.skipped?.inactiveCampaigns || 0;
      const processed = pausedResult.processed || 0;
      
      console.log(`   📊 Processed: ${processed}, Skipped (inactive): ${skippedInactive}`);
      testResults.paused = processed === 0 && skippedInactive > 0 ? '✅ BLOCKED' : '❌ LEAKED';
    } else {
      testResults.paused = '⚠️ ERROR';
    }
    
    // Test 2: Warming Campaign  
    console.log('\n2️⃣ Testing WARMING campaign...');
    await supabase.from('campaigns').update({ status: 'Warming' }).eq('id', campaign.id);
    
    const warmingResponse = await fetch(`${BASE_URL}/api/automation/process-scheduled?testMode=true`);
    if (warmingResponse.ok) {
      const warmingResult = await warmingResponse.json();
      const skippedInactive = warmingResult.skipped?.inactiveCampaigns || 0;
      const processed = warmingResult.processed || 0;
      
      console.log(`   📊 Processed: ${processed}, Skipped (inactive): ${skippedInactive}`);
      testResults.warming = processed === 0 && skippedInactive > 0 ? '✅ BLOCKED' : '❌ LEAKED';
    } else {
      testResults.warming = '⚠️ ERROR';
    }
    
    // Test 3: Active Campaign (should allow processing)
    console.log('\n3️⃣ Testing ACTIVE campaign...');
    await supabase.from('campaigns').update({ status: 'Active' }).eq('id', campaign.id);
    
    const activeResponse = await fetch(`${BASE_URL}/api/automation/process-scheduled?testMode=true`);
    if (activeResponse.ok) {
      const activeResult = await activeResponse.json();
      const processed = activeResult.processed || 0;
      const skippedInactive = activeResult.skipped?.inactiveCampaigns || 0;
      
      console.log(`   📊 Processed: ${processed}, Skipped (inactive): ${skippedInactive}`);
      // Active campaigns should not be skipped as inactive (though may be 0 processed if no contacts ready)
      testResults.active = skippedInactive === 0 ? '✅ ALLOWED' : '❌ BLOCKED';
    } else {
      testResults.active = '⚠️ ERROR';
    }
    
    // Summary
    console.log('\n📊 SECURITY TEST RESULTS');
    console.log('─'.repeat(30));
    console.log(`Paused Campaign:  ${testResults.paused}`);
    console.log(`Warming Campaign: ${testResults.warming}`);
    console.log(`Active Campaign:  ${testResults.active}`);
    
    const blocked = (testResults.paused === '✅ BLOCKED' && testResults.warming === '✅ BLOCKED');
    const activeWorks = testResults.active === '✅ ALLOWED';
    
    console.log('\n🎯 FINAL VERDICT');
    console.log('─'.repeat(20));
    
    if (blocked && activeWorks) {
      console.log('🛡️ ✅ AUTOMATION SECURITY: PASS');
      console.log('   • Paused campaigns are blocked ✅');
      console.log('   • Warming campaigns are blocked ✅');
      console.log('   • Active campaigns are allowed ✅');
      console.log('\n🎉 Email automation is properly secured!');
      return true;
    } else {
      console.log('🚨 ❌ AUTOMATION SECURITY: FAIL');
      if (!blocked) console.log('   • Non-active campaigns are NOT blocked ❌');
      if (!activeWorks) console.log('   • Active campaigns are incorrectly blocked ❌');
      console.log('\n⚠️ Security review required!');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    return false;
  }
}

// Run test
testAutomationSecurity()
  .then(secure => process.exit(secure ? 0 : 1))
  .catch(() => process.exit(1));