const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugWebhookTarget() {
  console.log('\n🔍 DEBUGGING WEBHOOK TARGET');
  console.log('============================\n');

  // Test both local and production webhooks
  const targets = [
    { name: 'Local Development', url: 'http://localhost:3000/api/webhooks/sendgrid' },
    { name: 'Production', url: 'https://app.leadsup.io/api/webhooks/sendgrid' }
  ];

  for (const target of targets) {
    console.log(`📡 Testing ${target.name}:`);
    console.log(`   URL: ${target.url}`);

    try {
      // Test if endpoint is accessible
      const pingResponse = await fetch(target.url, { 
        method: 'GET',
        timeout: 5000
      });

      if (pingResponse.ok) {
        const data = await pingResponse.json();
        console.log(`   ✅ Accessible - Status: ${data.status}`);
        
        // Test with simulated webhook data
        console.log(`   📤 Testing webhook processing...`);
        
        const formData = new URLSearchParams();
        formData.append('from', 'ecomm2405@gmail.com');
        formData.append('to', 'reply@leadsup.io');
        formData.append('subject', 'Re: FIXED: Test Campaign Email (Reply Capture Test)');
        formData.append('text', 'rererfwr');
        formData.append('html', '<p>rererfwr</p>');
        formData.append('envelope', JSON.stringify({
          from: 'ecomm2405@gmail.com',
          to: ['reply@leadsup.io']
        }));
        formData.append('spam_score', '0.1');
        formData.append('attachments', '0');
        formData.append('charsets', '{"to":"UTF-8","subject":"UTF-8","from":"UTF-8","text":"UTF-8"}');
        
        const webhookResponse = await fetch(target.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'SendGrid/v3'
          },
          body: formData,
          timeout: 10000
        });
        
        const result = await webhookResponse.json();
        
        if (result.success) {
          console.log(`   ✅ Webhook processed successfully!`);
          console.log(`   📧 Message ID: ${result.messageId}`);
          console.log(`   🧵 Conversation ID: ${result.conversationId}`);
        } else {
          console.log(`   ❌ Webhook failed: ${result.error || result.message}`);
        }
        
      } else {
        console.log(`   ❌ Not accessible (${pingResponse.status})`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('   ' + '-'.repeat(50));
  }
  
  console.log('\n📋 SENDGRID CONFIGURATION CHECK:');
  console.log('=================================');
  console.log('Current SendGrid Inbound Parse should be:');
  console.log('- Host: reply.leadsup.io');
  console.log('- URL: https://app.leadsup.io/api/webhooks/sendgrid');
  console.log('');
  console.log('🔍 If replies are not appearing in database:');
  console.log('1. SendGrid might be calling local webhook (localhost)');
  console.log('2. Or there might be a DNS/routing issue');
  console.log('3. Check SendGrid Activity Feed for webhook delivery status');
}

async function checkDatabaseConnection() {
  console.log('\n🗄️ DATABASE CONNECTION CHECK');
  console.log('=============================\n');
  
  const { createClient } = require('@supabase/supabase-js');
  require('dotenv').config({ path: '.env.local' });
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log(`Database URL: ${supabaseUrl}`);
  console.log(`Using service role key: ${supabaseKey ? 'Yes' : 'No'}`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Check recent inbound messages
    const { data, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .order('received_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.log('❌ Database query failed:', error.message);
    } else {
      console.log(`✅ Database accessible - Found ${data.length} recent inbound messages`);
      
      data.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.contact_email} → ${msg.sender_email}`);
        console.log(`      Subject: ${msg.subject}`);
        console.log(`      Received: ${new Date(msg.received_at).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
}

// Main execution
async function main() {
  await debugWebhookTarget();
  await checkDatabaseConnection();
  
  console.log('\n📊 SUMMARY:');
  console.log('===========');
  console.log('If you see webhook success but no database entries,');
  console.log('the issue is likely SendGrid routing to wrong endpoint.');
}

main().catch(error => {
  console.error('Fatal error:', error);
});