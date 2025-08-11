#!/usr/bin/env node

/**
 * Send Test Email Script
 * 
 * This script sends a test email to verify that:
 * 1. New emails appear in inbox
 * 2. Badge counts update correctly 
 * 3. Mark-as-read functionality works
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function sendTestEmail() {
  console.log('📧 SENDING TEST EMAIL TO VERIFY BADGE UPDATES');
  console.log('============================================\n');
  
  const username = process.env.N8N_API_USERNAME;
  const password = process.env.N8N_API_PASSWORD;
  
  if (!username || !password) {
    console.log('❌ Missing API credentials (N8N_API_USERNAME, N8N_API_PASSWORD)');
    console.log('ℹ️ These should be set in your .env.local file');
    return;
  }
  
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  try {
    console.log('🚀 Triggering campaign automation...');
    
    // Trigger campaign automation to send emails
    const response = await fetch('http://localhost:3000/api/campaigns/automation/send-emails', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('📤 Campaign Email Send Result:', response.ok ? '✅' : '❌', response.status);
    
    if (result.success) {
      console.log(`📊 Emails sent: ${result.sent}`);
      console.log(`📊 Emails failed: ${result.failed}`);
      
      if (result.sent > 0) {
        console.log('\n🎯 TEST VERIFICATION STEPS:');
        console.log('1. ✅ Test email sent successfully');
        console.log('2. 🔄 Wait 1-2 minutes for email delivery');
        console.log('3. 📱 Check inbox UI - badge should show new unread count');
        console.log('4. 👆 Click on new message thread');
        console.log('5. ✅ Verify badge count decreases (mark-as-read works)');
        
        console.log('\n📧 Sent to recipients:');
        if (result.details) {
          result.details.forEach((detail, i) => {
            console.log(`   ${i + 1}. ${detail.to} - "${detail.subject}"`);
          });
        }
      } else {
        console.log('\n💡 No emails were sent. This could mean:');
        console.log('   - No active campaigns with pending emails');
        console.log('   - All contacts already received today\'s emails');
        console.log('   - Rate limiting is in effect');
      }
    } else {
      console.log('❌ Email send failed:', result.error || 'Unknown error');
      console.log('ℹ️ Full result:', result);
    }
    
  } catch (error) {
    console.error('❌ Test email send failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   - Is the development server running on localhost:3000?');
    console.log('   - Are the API credentials correct?');
    console.log('   - Check the campaign automation endpoint logs');
  }
}

// Run the test
sendTestEmail().then(() => {
  console.log('\n✅ Test email send script complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});