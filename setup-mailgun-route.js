#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function setupMailgunRoute() {
  console.log('🔧 SETTING UP MAILGUN ROUTE');
  console.log('===========================\n');
  
  const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
  const MAILGUN_DOMAIN = 'sandbox09593b053aaa4a158cfdada61cbbdb0d.mailgun.org';
  
  if (!MAILGUN_API_KEY) {
    console.error('❌ MAILGUN_API_KEY not found in environment');
    console.log('Please set the MAILGUN_API_KEY environment variable');
    return;
  }
  
  const webhookUrl = 'http://app.leadsup.io/api/webhooks/mailgun';
  
  // First, let's check existing routes
  console.log('🔍 Checking existing routes...');
  
  try {
    const listResponse = await fetch(`https://api.mailgun.net/v3/routes`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')
      }
    });
    
    const existingRoutes = await listResponse.json();
    console.log(`📋 Found ${existingRoutes.total_count || 0} existing routes`);
    
    if (existingRoutes.items && existingRoutes.items.length > 0) {
      console.log('\n📝 Existing routes:');
      existingRoutes.items.forEach((route, i) => {
        console.log(`${i + 1}. ${route.description || 'No description'}`);
        console.log(`   Expression: ${route.expression}`);
        console.log(`   Actions: ${route.actions.join(', ')}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking routes:', error.message);
  }
  
  // Create new route
  console.log('🆕 Creating new route...');
  
  const FormData = (await import('form-data')).default;
  const formData = new FormData();
  
  formData.append('priority', '1');
  formData.append('description', 'LeadsUp Email Capture - Forward to Webhook');
  formData.append('expression', `match_recipient(".*@${MAILGUN_DOMAIN}")`);
  formData.append('action', `forward("${webhookUrl}")`);
  formData.append('action', 'stop()');
  
  console.log(`📡 Route configuration:`);
  console.log(`   Priority: 1`);
  console.log(`   Expression: match_recipient(".*@${MAILGUN_DOMAIN}")`);
  console.log(`   Action 1: forward("${webhookUrl}")`);
  console.log(`   Action 2: stop()`);
  console.log('');
  
  try {
    const response = await fetch(`https://api.mailgun.net/v3/routes`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')
      },
      body: formData
    });
    
    const result = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.ok) {
      console.log('\n🎉 ROUTE CREATED SUCCESSFULLY!');
      console.log('==============================');
      console.log(`✅ Route ID: ${result.route.id}`);
      console.log(`✅ Expression: ${result.route.expression}`);
      console.log(`✅ Actions: ${result.route.actions.join(', ')}`);
      console.log(`✅ Priority: ${result.route.priority}`);
      console.log('');
      console.log('🧪 NOW YOU CAN TEST:');
      console.log('===================');
      console.log(`1. Send email FROM: essabar.yassine@gmail.com`);
      console.log(`2. Send email TO: campaign@${MAILGUN_DOMAIN}`);
      console.log(`3. Any subject and body message`);
      console.log(`4. Email will be forwarded to: ${webhookUrl}`);
      console.log(`5. Webhook will capture and store in database`);
      console.log('');
      console.log('⚡ Route is active immediately!');
      
    } else {
      console.log('\n❌ ROUTE CREATION FAILED');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (result.message && result.message.includes('already exists')) {
        console.log('\n💡 Route might already exist. Try listing routes first.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error creating route:', error.message);
  }
}

setupMailgunRoute().catch(console.error);