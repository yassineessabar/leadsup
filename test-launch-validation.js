// Test script to verify launch validation fix
console.log('🚀 Testing launch validation fix...')

console.log('\n📋 Issue Description:')
console.log('- Launch modal showed "No Email Account Connected" even when sender accounts were selected')
console.log('- This happened because validation was checking old OAuth accounts instead of new domain-based senders')

console.log('\n🔧 Fix Applied:')
console.log('✅ Updated validation logic in handleLaunchPauseCampaign:')
console.log('   OLD: const hasConnectedAccount = allConnectedAccounts.length > 0')
console.log('   NEW: const hasConnectedAccount = selectedSenderAccounts.length > 0')

console.log('\n✅ Updated error message:')
console.log('   OLD: "No Email Account Connected - Connect at least one email account"')
console.log('   NEW: "No Sender Accounts Selected - Select at least one sender account from your verified domains"')

console.log('\n✅ Updated button text:')
console.log('   OLD: "Go to Sender Settings"')
console.log('   NEW: "Select Sender Accounts"')

console.log('\n🧪 Test Steps:')
console.log('1. Navigate to Campaign → Sender tab')
console.log('2. Select one or more sender accounts (checkboxes)')
console.log('3. Go to Campaign → Sequence tab')
console.log('4. Click "Launch Campaign" button')
console.log('5. Verify no "No Email Account Connected" error appears')

console.log('\n🎯 Expected Debugging Output:')
console.log('When clicking Launch Campaign, you should see:')
console.log('- 🚀 Launch validation - selectedSenderAccounts: [array of selected sender IDs]')
console.log('- 🚀 Launch validation - hasConnectedAccount: true (if senders are selected)')

console.log('\n✅ Launch validation fix ready for testing!')
console.log('🌐 Test at http://localhost:3008')