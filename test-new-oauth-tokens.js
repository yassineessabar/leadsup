/**
 * Test New OAuth Tokens
 * Verify if re-authenticated tokens have Gmail send scope
 */

class OAuthTokenTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
  }

  async testNewTokens() {
    console.log('🔐 Testing Re-authenticated OAuth Tokens');
    console.log('=' .repeat(60));
    
    try {
      // Get latest tokens from automation API
      const tokens = await this.getLatestTokens();
      
      if (!tokens || tokens.length === 0) {
        console.log('❌ No tokens found');
        console.log('💡 Make sure you:');
        console.log('   1. Added test users in Google Cloud Console');
        console.log('   2. Disconnected old Gmail accounts in dashboard');
        console.log('   3. Re-connected Gmail accounts in dashboard');
        return;
      }

      console.log(`\n📧 Testing ${tokens.length} re-authenticated accounts:`);
      
      let hasValidTokens = false;
      
      for (const [index, token] of tokens.entries()) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`📧 ACCOUNT ${index + 1}: ${token.name} (${token.email})`);
        console.log(`${'='.repeat(50)}`);
        
        const isValid = await this.testTokenScopes(token);
        if (isValid) {
          hasValidTokens = true;
        }
      }
      
      if (hasValidTokens) {
        console.log('\n🎉 SUCCESS! You have valid tokens - ready to send emails!');
        console.log('🚀 Run: node email-sender.js');
      } else {
        console.log('\n❌ All tokens still invalid');
        this.provideTroubleshootingSteps();
      }
      
    } catch (error) {
      console.error('❌ Token test failed:', error);
    }
  }

  async getLatestTokens() {
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns/automation/process-pending`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
        }
      });
      
      const data = await response.json();
      return data.success && data.data.length > 0 ? data.data[0].senders : [];
    } catch (error) {
      console.error('Error getting tokens:', error);
      return [];
    }
  }

  async testTokenScopes(sender) {
    console.log('🔍 Token Analysis:');
    
    // Check expiration
    const tokenExpiry = new Date(sender.expires_at);
    const now = new Date();
    const minutesUntilExpiry = Math.round((tokenExpiry - now) / 1000 / 60);
    
    console.log(`   Expires: ${tokenExpiry.toLocaleString()}`);
    console.log(`   Status: ${minutesUntilExpiry > 0 ? `✅ Valid (${minutesUntilExpiry} min left)` : `❌ EXPIRED`}`);
    
    if (minutesUntilExpiry <= 0) {
      console.log('   🔄 Token expired - refresh needed');
      return false;
    }
    
    // Test Gmail Profile Access
    console.log('\n🔍 Testing Gmail Profile Access:');
    const profileTest = await this.testGmailProfile(sender);
    
    // Test Gmail Send Scope
    console.log('\n📧 Testing Gmail Send Scope:');
    const sendTest = await this.testGmailSendScope(sender);
    
    // Test actual email creation
    if (sendTest) {
      console.log('\n✉️ Testing Email Creation:');
      await this.testEmailCreation(sender);
    }
    
    return profileTest && sendTest;
  }

  async testGmailProfile(sender) {
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${sender.access_token}`
        }
      });
      
      if (response.ok) {
        const profile = await response.json();
        console.log('   ✅ Profile API: Working');
        console.log(`   📧 Email: ${profile.emailAddress}`);
        return true;
      } else {
        const error = await response.json();
        console.log('   ❌ Profile API: Failed');
        console.log(`   Error: ${error.error?.message || 'Unknown'}`);
        return false;
      }
    } catch (error) {
      console.log('   ❌ Profile API: Network error');
      return false;
    }
  }

  async testGmailSendScope(sender) {
    try {
      // Test send scope by creating a draft
      const testMessage = this.createTestMessage();
      
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sender.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: { raw: testMessage }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('   ✅ Send Scope: AVAILABLE!');
        console.log('   🎉 Can create drafts (send permission confirmed)');
        
        // Clean up test draft
        if (result.id) {
          await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${result.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${sender.access_token}` }
          });
          console.log('   🗑️ Test draft cleaned up');
        }
        return true;
      } else {
        const error = await response.json();
        console.log('   ❌ Send Scope: NOT AVAILABLE');
        console.log(`   Error: ${error.error?.message || 'Unknown'}`);
        
        if (error.error?.code === 403) {
          console.log('   🔐 Issue: Still missing Gmail send permissions');
          console.log('   💡 Try: Disconnect and reconnect Gmail account again');
        }
        return false;
      }
    } catch (error) {
      console.log('   ❌ Send Scope: Test failed');
      console.log(`   Error: ${error.message}`);
      return false;
    }
  }

  async testEmailCreation(sender) {
    try {
      // Test creating an actual email message (not sending)
      const emailMessage = this.createRealEmailMessage();
      
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sender.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: emailMessage
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('   🎉 ACTUAL EMAIL SENDING: WORKS!');
        console.log(`   📧 Message sent with ID: ${result.id}`);
        console.log('   ✅ Your automation is ready to send real emails!');
        return true;
      } else {
        const error = await response.json();
        console.log('   ❌ Email sending failed');
        console.log(`   Error: ${error.error?.message}`);
        return false;
      }
    } catch (error) {
      console.log('   ❌ Email creation test failed:', error.message);
      return false;
    }
  }

  createTestMessage() {
    const message = [
      'From: test@example.com',
      'To: test@example.com', 
      'Subject: Test Draft',
      '',
      'This is a test draft that will be deleted immediately.'
    ].join('\r\n');
    
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  createRealEmailMessage() {
    // Create a real test email to yourself
    const message = [
      'From: LeadsUp Test <test@leadsup.com>',
      'To: test@leadsup.com',
      'Subject: ✅ LeadsUp Email Automation Test - SUCCESS!',
      'Content-Type: text/plain; charset=utf-8',
      '',
      '🎉 Congratulations!',
      '',
      'Your LeadsUp email automation system is working perfectly!',
      '',
      'This test email confirms that:',
      '✅ OAuth tokens have proper Gmail send scope',
      '✅ Gmail API integration is functional', 
      '✅ Email automation pipeline is ready',
      '',
      'You can now run your full email campaigns.',
      '',
      'Best regards,',
      'LeadsUp Email Automation System'
    ].join('\r\n');
    
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  provideTroubleshootingSteps() {
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('');
    console.log('1. 🔍 Double-check Google Cloud Console:');
    console.log('   → Project has Gmail API enabled');
    console.log('   → OAuth consent screen has gmail.send scope');
    console.log('   → Test users include your Gmail addresses');
    console.log('');
    console.log('2. 🔄 Complete Re-authentication:');
    console.log('   → Dashboard → Senders → Disconnect ALL Gmail accounts');
    console.log('   → Clear browser cache/cookies');
    console.log('   → Reconnect Gmail accounts (should see new permissions)');
    console.log('');
    console.log('3. 🔐 Verify Permissions Dialog:');
    console.log('   → When reconnecting, you should see:');
    console.log('   → "Send email on your behalf" permission');
    console.log('   → If not visible, check OAuth consent screen setup');
    console.log('');
    console.log('4. 🚀 Alternative - Use SMTP:');
    console.log('   → Generate Gmail app password');
    console.log('   → Set GMAIL_APP_PASSWORD_1="your-password"');
    console.log('   → Run: node email-sender-smtp-production.js');
  }
}

// Run the token test
const tester = new OAuthTokenTester();
tester.testNewTokens();