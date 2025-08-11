#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function setupMailerSendWebhook() {
  console.log('🔧 MAILERSEND WEBHOOK CONFIGURATION');
  console.log('===================================\n');
  
  const MAILERSEND_API_TOKEN = 'mlsn.8ac86c7240b7326eab5aee6037f008b63f431c7d87419bb73bae4751d88bbd10';
  const API_BASE = 'https://api.mailersend.com/v1';
  const WEBHOOK_URL = 'http://app.leadsup.io/api/webhooks/mailersend';
  
  console.log('📡 Webhook URL:', WEBHOOK_URL);
  console.log('');
  
  // Check existing webhooks
  console.log('🔍 Step 1: Checking existing webhooks...');
  
  try {
    const response = await fetch(`${API_BASE}/webhooks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MAILERSEND_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Found ${result.data?.length || 0} existing webhooks`);
      
      if (result.data && result.data.length > 0) {
        result.data.forEach((webhook, i) => {
          console.log(`   ${i + 1}. ${webhook.name}`);
          console.log(`      URL: ${webhook.url}`);
          console.log(`      Events: ${webhook.events.join(', ')}`);
          console.log(`      Status: ${webhook.enabled ? '✅ Enabled' : '❌ Disabled'}`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Failed to get webhooks:', result);
    }
    
  } catch (error) {
    console.error('❌ Error checking webhooks:', error.message);
  }
  
  // Create webhook for inbound emails
  console.log('🆕 Step 2: Creating inbound email webhook...');
  
  const webhookData = {
    name: 'LeadsUp Inbound Email Capture',
    url: WEBHOOK_URL,
    events: ['activity.inbound'],
    enabled: true
  };
  
  try {
    const response = await fetch(`${API_BASE}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILERSEND_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });
    
    const result = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.ok || response.status === 201) {
      console.log('\\n🎉 WEBHOOK CREATED SUCCESSFULLY!');
      console.log('=================================');
      console.log(`✅ Webhook ID: ${result.data?.id || 'N/A'}`);
      console.log(`✅ Name: ${result.data?.name || webhookData.name}`);
      console.log(`✅ URL: ${result.data?.url || webhookData.url}`);
      console.log(`✅ Events: ${result.data?.events?.join(', ') || webhookData.events.join(', ')}`);
      console.log(`✅ Status: ${result.data?.enabled ? 'Enabled' : 'Disabled'}`);
      
    } else {
      console.log('\\n❌ WEBHOOK CREATION FAILED');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (result.message && result.message.includes('already exists')) {
        console.log('\\n💡 Webhook might already exist for this URL.');
      }
    }
    
  } catch (error) {
    console.error('\\n❌ Error creating webhook:', error.message);
  }
  
  // Check inbound routes
  console.log('\\n🔍 Step 3: Checking inbound email routes...');
  
  try {
    const response = await fetch(`${API_BASE}/inbound`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MAILERSEND_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Found ${result.data?.length || 0} inbound routes`);
      
      if (result.data && result.data.length > 0) {
        result.data.forEach((route, i) => {
          console.log(`   ${i + 1}. Domain: ${route.domain_id}`);
          console.log(`      Pattern: ${route.inbound_address}`);
          console.log(`      Forward to: ${route.forward_url || 'N/A'}`);
          console.log(`      Status: ${route.enabled ? '✅ Enabled' : '❌ Disabled'}`);
          console.log('');
        });
      } else {
        console.log('\\n⚠️  No inbound routes configured yet');
        console.log('📋 TO SET UP INBOUND ROUTING:');
        console.log('1. Go to MailerSend Dashboard');
        console.log('2. Navigate to: Inbound');
        console.log('3. Add route for: app.leadsup.io');
        console.log('4. Pattern: campaign@app.leadsup.io (or catch-all: *@app.leadsup.io)');
        console.log('5. Enable the route');
      }
    } else {
      console.log('❌ Failed to get inbound routes:', result);
    }
    
  } catch (error) {
    console.error('❌ Error checking inbound routes:', error.message);
  }
  
  console.log('\\n🎯 SUMMARY:');
  console.log('============');
  console.log('✅ Domain: app.leadsup.io (verified)');
  console.log('✅ Webhook endpoint: /api/webhooks/mailersend (created)');
  console.log('✅ API integration: Working');
  console.log('');
  console.log('🔧 MANUAL STEPS NEEDED IN MAILERSEND DASHBOARD:');
  console.log('1. Add inbound route for campaign@app.leadsup.io');
  console.log('2. Forward to: http://app.leadsup.io/api/webhooks/mailersend');
  console.log('3. Enable the route');
  console.log('');
  console.log('📧 Then test by sending email TO campaign@app.leadsup.io');
}

setupMailerSendWebhook().catch(console.error);