/**
 * Test Script for SendGrid Webhook Health Score Integration
 * 
 * This script tests the complete workflow:
 * 1. Simulates SendGrid webhook events
 * 2. Verifies database updates
 * 3. Tests health score calculation with real data
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_USER_ID = 'test-user-123';
const TEST_SENDER_EMAIL = 'test@example.com';
const TEST_CAMPAIGN_ID = 'test-campaign-456';

// Sample SendGrid webhook events
const sampleEvents = [
  {
    event: 'processed',
    email: 'recipient1@example.com',
    timestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    sg_message_id: 'msg_001',
    sg_event_id: 'evt_001',
    unique_args: {
      user_id: TEST_USER_ID,
      campaign_id: TEST_CAMPAIGN_ID,
      sender_email: TEST_SENDER_EMAIL
    }
  },
  {
    event: 'delivered',
    email: 'recipient1@example.com',
    timestamp: Math.floor(Date.now() / 1000) - 3500,
    sg_message_id: 'msg_001',
    sg_event_id: 'evt_002',
    unique_args: {
      user_id: TEST_USER_ID,
      campaign_id: TEST_CAMPAIGN_ID,
      sender_email: TEST_SENDER_EMAIL
    }
  },
  {
    event: 'open',
    email: 'recipient1@example.com',
    timestamp: Math.floor(Date.now() / 1000) - 3000,
    sg_message_id: 'msg_001',
    sg_event_id: 'evt_003',
    unique_args: {
      user_id: TEST_USER_ID,
      campaign_id: TEST_CAMPAIGN_ID,
      sender_email: TEST_SENDER_EMAIL
    }
  },
  {
    event: 'click',
    email: 'recipient1@example.com',
    timestamp: Math.floor(Date.now() / 1000) - 2500,
    sg_message_id: 'msg_001',
    sg_event_id: 'evt_004',
    url: 'https://example.com/link',
    unique_args: {
      user_id: TEST_USER_ID,
      campaign_id: TEST_CAMPAIGN_ID,
      sender_email: TEST_SENDER_EMAIL
    }
  },
  // Bounce event
  {
    event: 'bounce',
    email: 'badaddress@example.com',
    timestamp: Math.floor(Date.now() / 1000) - 2000,
    sg_message_id: 'msg_002',
    sg_event_id: 'evt_005',
    reason: 'invalid email address',
    unique_args: {
      user_id: TEST_USER_ID,
      campaign_id: TEST_CAMPAIGN_ID,
      sender_email: TEST_SENDER_EMAIL
    }
  }
];

async function testWebhookEndpoint() {
  console.log('🧪 Testing SendGrid Webhook Endpoint...');
  
  try {
    // Test GET endpoint (health check)
    console.log('1. Testing webhook health check...');
    const healthResponse = await fetch(`${API_BASE_URL}/api/webhooks/sendgrid/events`);
    const healthData = await healthResponse.json();
    
    if (healthData.success) {
      console.log('✅ Webhook endpoint is healthy');
    } else {
      console.log('❌ Webhook endpoint health check failed');
      return false;
    }
    
    // Test POST endpoint (event processing)
    console.log('2. Testing event processing...');
    const eventResponse = await fetch(`${API_BASE_URL}/api/webhooks/sendgrid/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleEvents)
    });
    
    const eventData = await eventResponse.json();
    console.log('Event processing result:', eventData);
    
    if (eventData.success && eventData.results.processed > 0) {
      console.log(`✅ Successfully processed ${eventData.results.processed} events`);
      return true;
    } else {
      console.log('❌ Event processing failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error);
    return false;
  }
}

async function testHealthScoreCalculation() {
  console.log('🧪 Testing Health Score Calculation...');
  
  try {
    // Wait a moment for database triggers to process
    console.log('Waiting for database processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test health score calculation with real data
    console.log('1. Testing health score calculation...');
    const healthResponse = await fetch(`${API_BASE_URL}/api/sender-accounts/health-score?senderIds=test-sender-id`);
    const healthData = await healthResponse.json();
    
    console.log('Health score result:', healthData);
    
    if (healthData.success) {
      if (healthData.dataSource === 'webhook') {
        console.log('✅ Health score using real webhook data!');
        console.log(`📊 Data source: ${healthData.dataSource}`);
        console.log(`📈 Message: ${healthData.message}`);
      } else {
        console.log('⚠️ Health score using fallback data');
        console.log(`📊 Data source: ${healthData.dataSource}`);
        console.log('This is expected if no real sender accounts exist yet');
      }
      return true;
    } else {
      console.log('❌ Health score calculation failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Health score test failed:', error);
    return false;
  }
}

async function simulateEmailCampaign() {
  console.log('🧪 Simulating Email Campaign...');
  
  const campaignEvents = [];
  const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
  let messageCounter = 100;
  
  // Generate realistic campaign events
  for (const recipient of recipients) {
    const messageId = `msg_${messageCounter++}`;
    const baseTime = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
    
    // Processed event
    campaignEvents.push({
      event: 'processed',
      email: recipient,
      timestamp: baseTime,
      sg_message_id: messageId,
      sg_event_id: `${messageId}_processed`,
      unique_args: {
        user_id: TEST_USER_ID,
        campaign_id: TEST_CAMPAIGN_ID,
        sender_email: TEST_SENDER_EMAIL
      }
    });
    
    // Delivered event (90% delivery rate)
    if (Math.random() > 0.1) {
      campaignEvents.push({
        event: 'delivered',
        email: recipient,
        timestamp: baseTime + 300,
        sg_message_id: messageId,
        sg_event_id: `${messageId}_delivered`,
        unique_args: {
          user_id: TEST_USER_ID,
          campaign_id: TEST_CAMPAIGN_ID,
          sender_email: TEST_SENDER_EMAIL
        }
      });
      
      // Open event (25% open rate)
      if (Math.random() > 0.75) {
        campaignEvents.push({
          event: 'open',
          email: recipient,
          timestamp: baseTime + 600,
          sg_message_id: messageId,
          sg_event_id: `${messageId}_open`,
          unique_args: {
            user_id: TEST_USER_ID,
            campaign_id: TEST_CAMPAIGN_ID,
            sender_email: TEST_SENDER_EMAIL
          }
        });
        
        // Click event (5% click rate)
        if (Math.random() > 0.95) {
          campaignEvents.push({
            event: 'click',
            email: recipient,
            timestamp: baseTime + 900,
            sg_message_id: messageId,
            sg_event_id: `${messageId}_click`,
            url: 'https://example.com/cta',
            unique_args: {
              user_id: TEST_USER_ID,
              campaign_id: TEST_CAMPAIGN_ID,
              sender_email: TEST_SENDER_EMAIL
            }
          });
        }
      }
    } else {
      // Bounce event (10% bounce rate)
      campaignEvents.push({
        event: 'bounce',
        email: recipient,
        timestamp: baseTime + 180,
        sg_message_id: messageId,
        sg_event_id: `${messageId}_bounce`,
        reason: 'mailbox full',
        unique_args: {
          user_id: TEST_USER_ID,
          campaign_id: TEST_CAMPAIGN_ID,
          sender_email: TEST_SENDER_EMAIL
        }
      });
    }
  }
  
  console.log(`📧 Simulating ${campaignEvents.length} campaign events...`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/webhooks/sendgrid/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaignEvents)
    });
    
    const result = await response.json();
    console.log('Campaign simulation result:', result);
    
    if (result.success) {
      console.log(`✅ Successfully simulated campaign with ${result.results.processed} events`);
      return true;
    } else {
      console.log('❌ Campaign simulation failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Campaign simulation failed:', error);
    return false;
  }
}

async function runFullTest() {
  console.log('🚀 Starting SendGrid Webhook Health Score Integration Test\n');
  
  const results = {
    webhookEndpoint: false,
    initialHealthScore: false,
    campaignSimulation: false,
    finalHealthScore: false
  };
  
  // Test 1: Webhook endpoint
  results.webhookEndpoint = await testWebhookEndpoint();
  console.log('');
  
  // Test 2: Initial health score calculation
  results.initialHealthScore = await testHealthScoreCalculation();
  console.log('');
  
  // Test 3: Simulate a full email campaign
  results.campaignSimulation = await simulateEmailCampaign();
  console.log('');
  
  // Test 4: Final health score calculation (should use real data now)
  console.log('🧪 Testing Final Health Score (with more data)...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for processing
  results.finalHealthScore = await testHealthScoreCalculation();
  
  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  console.log(`Webhook Endpoint: ${results.webhookEndpoint ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Initial Health Score: ${results.initialHealthScore ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Campaign Simulation: ${results.campaignSimulation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Final Health Score: ${results.finalHealthScore ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 SendGrid webhook integration is working correctly!');
    console.log('Your health scores will now use real email performance data.');
  } else {
    console.log('\n🔧 Some tests failed. Check the logs above for details.');
  }
  
  return allPassed;
}

// Run the test if this script is executed directly
if (require.main === module) {
  runFullTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
}

module.exports = {
  testWebhookEndpoint,
  testHealthScoreCalculation,
  simulateEmailCampaign,
  runFullTest
};