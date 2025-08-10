/**
 * Find Production Credentials
 * Help identify what credentials your production environment expects
 */

console.log('🔍 Finding Production Credentials');
console.log('=' .repeat(50));
console.log('');

console.log('🚨 CONFIRMED ISSUES:');
console.log('✅ API endpoint: Working (https://app.leadsup.io)');
console.log('✅ SSL certificate: Valid');  
console.log('✅ Server: Vercel deployment active');
console.log('❌ Authentication: "admin:password" rejected (401)');
console.log('');

console.log('🔐 YOUR PRODUCTION ENVIRONMENT VARIABLES:');
console.log('Production has different values for:');
console.log('• N8N_API_USERNAME (not "admin")');
console.log('• N8N_API_PASSWORD (not "password")');
console.log('');

console.log('📋 TO FIND THE CORRECT CREDENTIALS:');
console.log('');

console.log('1. 🌐 CHECK VERCEL DASHBOARD:');
console.log('   → Go to vercel.com → Your project');
console.log('   → Settings → Environment Variables');
console.log('   → Look for N8N_API_USERNAME and N8N_API_PASSWORD');
console.log('   → Write down their actual values');
console.log('');

console.log('2. 🔍 OR CHECK DEPLOYMENT LOGS:');
console.log('   → Vercel Functions → View logs');
console.log('   → Look for any authentication-related messages');
console.log('');

console.log('3. 🧪 TEST WITH DIFFERENT CREDENTIALS:');
console.log('   Common production values might be:');
console.log('   • n8n / n8n-secret');
console.log('   • leadsup / your-app-password');
console.log('   • api / api-key');
console.log('   • automation / automation-key');
console.log('');

console.log('4. 📝 TEMPORARY FIX (QUICKEST):');
console.log('   Edit app/api/campaigns/automation/process-pending/route.ts:');
console.log('   ');
console.log('   // Lines 18-19, change from:');
console.log('   const expectedUsername = process.env.N8N_API_USERNAME || "admin"');
console.log('   const expectedPassword = process.env.N8N_API_PASSWORD || "password"');
console.log('   ');
console.log('   // To:');
console.log('   const expectedUsername = "admin"');  
console.log('   const expectedPassword = "password"');
console.log('   ');
console.log('   → This ignores env vars and uses hardcoded values');
console.log('   → Deploy and test');
console.log('');

console.log('🎯 ONCE YOU KNOW THE CREDENTIALS:');
console.log('');
console.log('Option A: Update n8n credentials');
console.log('   → https://yessabar.app.n8n.cloud');
console.log('   → Credentials → "Unnamed credential 2"');
console.log('   → Set the correct username/password');
console.log('');

console.log('Option B: Update production env vars');
console.log('   → Set N8N_API_USERNAME=admin');
console.log('   → Set N8N_API_PASSWORD=password');
console.log('   → Redeploy');
console.log('');

console.log('✅ QUICK TEST COMMANDS:');
console.log('# Test with your found credentials:');
console.log('curl -u "YOUR_USERNAME:YOUR_PASSWORD" https://app.leadsup.io/api/campaigns/automation/process-pending');
console.log('');
console.log('# Should return JSON with your campaign data instead of 401');

console.log('');
console.log('💡 NEED HELP FINDING CREDENTIALS?');
console.log('Share your Vercel environment variables (redacted) and I can help identify the issue.');