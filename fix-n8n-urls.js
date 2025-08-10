/**
 * Fix n8n Workflow URLs
 * Shows how to update your n8n workflow to work with localhost
 */

console.log('🔧 Fix n8n Workflow URLs');
console.log('=' .repeat(50));
console.log('');

console.log('🚨 PROBLEM IDENTIFIED:');
console.log('   n8n calls: https://app.leadsup.io/api/...');
console.log('   Your app:  http://localhost:3000/api/...');
console.log('   Result:    401 Unauthorized → "Log No Emails"');
console.log('');

console.log('🛠️ SOLUTION: Update n8n Workflow URLs');
console.log('');

console.log('In n8n interface (https://yessabar.app.n8n.cloud):');
console.log('');

console.log('1. 📝 Edit "Get Pending Emails" Node:');
console.log('   Current: https://app.leadsup.io/api/campaigns/automation/process-pending');
console.log('   Change to: http://localhost:3000/api/campaigns/automation/process-pending');
console.log('');

console.log('2. 📝 Edit "Track Email Success" Node:');
console.log('   Current: http://app.leadsup.io/api/campaigns/tracking/sent');
console.log('   Change to: http://localhost:3000/api/campaigns/tracking/sent');
console.log('');

console.log('3. 📝 Edit "Track Email Failure" Node:');
console.log('   Current: https://app.leadsup.io/api/campaigns/tracking/sent');
console.log('   Change to: http://localhost:3000/api/campaigns/tracking/sent');
console.log('');

console.log('4. 🔐 Verify Basic Auth Credential:');
console.log('   → Credential name: "Unnamed credential 2"');
console.log('   → Username: admin');
console.log('   → Password: password');
console.log('');

console.log('⚠️ ALTERNATIVE: If localhost doesn\'t work from n8n cloud:');
console.log('');

console.log('Option A: Use ngrok to expose localhost');
console.log('   1. Install: npm install -g ngrok');
console.log('   2. Run: ngrok http 3000');
console.log('   3. Use ngrok URL in n8n workflow');
console.log('');

console.log('Option B: Deploy to production');
console.log('   1. Deploy your app to app.leadsup.io');
console.log('   2. Keep current n8n URLs');
console.log('');

console.log('🧪 TEST AFTER FIXING:');
console.log('   1. Save n8n workflow with new URLs');
console.log('   2. Trigger webhook: curl -X POST "https://yessabar.app.n8n.cloud/webhook-test/leadsup-webhook"');
console.log('   3. Should see "Transform Data" instead of "Log No Emails"');
console.log('   4. Check n8n execution logs for success');
console.log('');

console.log('🎯 Expected Result After Fix:');
console.log('   ✅ "Get Pending Emails" returns your 3 contacts');
console.log('   ✅ "Transform Data" shows "Prepared 3 emails to send"');
console.log('   ✅ "Check Has Emails" goes to TRUE branch');
console.log('   ✅ "Send Email (Gmail)" processes each contact');
console.log('   ✅ "Track Email Success" updates database');

// Test current status
console.log('\\n🔍 CURRENT STATUS TEST:');
console.log('Let me test if localhost is accessible from your machine...');

async function testLocalAccess() {
  try {
    const response = await fetch('http://localhost:3000/api/campaigns/automation/process-pending', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Localhost API is working!');
      console.log(`   → Found ${data.data?.[0]?.contacts?.length || 0} contacts`);
      console.log('   → n8n just needs the right URL');
    } else {
      console.log('❌ Localhost API issue:', response.status);
    }
  } catch (error) {
    console.log('❌ Cannot reach localhost:', error.message);
    console.log('   → Your app might not be running');
    console.log('   → Try: npm run dev');
  }
}

testLocalAccess();