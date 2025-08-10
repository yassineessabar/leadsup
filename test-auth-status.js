/**
 * Test Authentication Status
 * Check if user is logged in and fix campaign launch button
 */

class AuthStatusTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
  }

  async testAuthStatus() {
    console.log('🔐 Testing Authentication Status');
    console.log('=' .repeat(50));
    
    try {
      // Test if we can access authenticated endpoints
      await this.testMeEndpoint();
      await this.testCampaignStatusUpdate();
      
      this.provideSolutions();
      
    } catch (error) {
      console.error('❌ Auth test failed:', error);
    }
  }

  async testMeEndpoint() {
    console.log('\n👤 Testing /api/auth/me endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/me`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ User is authenticated');
        console.log(`📧 User: ${data.user.email}`);
        console.log(`🆔 User ID: ${data.user.id}`);
        return true;
      } else {
        console.log('❌ User is NOT authenticated');
        console.log(`Error: ${data.error}`);
        return false;
      }
    } catch (error) {
      console.log('❌ Auth endpoint failed:', error.message);
      return false;
    }
  }

  async testCampaignStatusUpdate() {
    console.log('\n🔄 Testing campaign status update...');
    
    const testCampaignId = 'e52a4ebf-73ea-44c8-b38d-30ee2b8108f6';
    
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns/${testCampaignId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Draft' }) // Test with Draft first
      });
      
      const result = await response.json();
      
      console.log(`📊 Response Status: ${response.status}`);
      console.log(`📊 Success: ${result.success}`);
      
      if (response.ok && result.success) {
        console.log('✅ Campaign status update works!');
        console.log(`✅ Updated to: ${result.data.status}`);
        return true;
      } else {
        console.log('❌ Campaign status update failed');
        console.log(`Error: ${result.error}`);
        
        if (response.status === 401) {
          console.log('🔐 Authentication required - user needs to log in');
        }
        
        return false;
      }
    } catch (error) {
      console.log('❌ Status update test failed:', error.message);
      return false;
    }
  }

  provideSolutions() {
    console.log('\n🔧 AUTHENTICATION SOLUTIONS');
    console.log('=' .repeat(50));
    console.log('');
    
    console.log('The Launch button requires authentication. Here are the solutions:');
    console.log('');
    
    console.log('1. 🔑 LOGIN SOLUTION (Recommended):');
    console.log('   → Make sure you are logged in to the application');
    console.log('   → Check if login session is active');
    console.log('   → Refresh the page and try again');
    console.log('');
    
    console.log('2. 🍪 SESSION COOKIE SOLUTION:');
    console.log('   → Check browser developer tools (F12)');
    console.log('   → Go to Application > Cookies');
    console.log('   → Look for "session" cookie');
    console.log('   → If missing, you need to log in again');
    console.log('');
    
    console.log('3. 🛠️ DEVELOPMENT SOLUTION:');
    console.log('   → The API requires session authentication');
    console.log('   → Frontend must send session cookie with requests');
    console.log('   → This is already implemented in the fixed code');
    console.log('');
    
    console.log('4. 🧪 TESTING WORKFLOW:');
    console.log('   → Log in to the application first');
    console.log('   → Go to campaign dashboard');
    console.log('   → Click Launch button');
    console.log('   → Should now update database correctly');
    console.log('');
    
    console.log('5. 📊 VERIFY SUCCESS:');
    console.log('   → After clicking Launch, check:');
    console.log('   → Toast notification appears');
    console.log('   → Campaign status shows as "Active"');
    console.log('   → Database is updated');
    console.log('   → Automation endpoint returns the campaign');
    console.log('');
    
    console.log('💡 QUICK TEST AFTER LOGIN:');
    console.log('1. Log in to your application');
    console.log('2. Go to campaign dashboard');
    console.log('3. Click Launch button');
    console.log('4. Run: curl -X GET "http://localhost:3000/api/campaigns/automation/process-pending" \\');
    console.log('        -H "Authorization: Basic $(echo -n \'admin:password\' | base64)"');
    console.log('5. Should show your active campaign ready for emails');
  }
}

// Run the auth status test
const tester = new AuthStatusTester();
tester.testAuthStatus();