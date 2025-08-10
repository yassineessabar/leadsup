/**
 * Gmail Token Comprehensive Diagnostic
 * Identifies specific Gmail API authentication issues
 */

class GmailTokenDiagnostic {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
  }

  async runCompleteDiagnostic() {
    console.log('🔐 Gmail Token Comprehensive Diagnostic');
    console.log('=' .repeat(60));
    
    try {
      // Get current tokens
      const tokens = await this.getTokensFromAPI();
      
      if (!tokens || tokens.length === 0) {
        console.log('❌ No tokens found in automation API');
        return;
      }

      console.log(`\n📧 Found ${tokens.length} Gmail accounts to diagnose:`);
      
      for (const [index, token] of tokens.entries()) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`📧 ACCOUNT ${index + 1}: ${token.name} (${token.email})`);
        console.log(`${'='.repeat(50)}`);
        
        await this.diagnoseToken(token);
      }
      
      this.provideSolutions();
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
    }
  }

  async getTokensFromAPI() {
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

  async diagnoseToken(sender) {
    console.log('🔍 Token Analysis:');
    
    // 1. Check token expiration
    const tokenExpiry = new Date(sender.expires_at);
    const now = new Date();
    const minutesUntilExpiry = Math.round((tokenExpiry - now) / 1000 / 60);
    
    console.log(`   Expires: ${tokenExpiry.toLocaleString()}`);
    console.log(`   Status: ${minutesUntilExpiry > 0 ? `✅ Valid (${minutesUntilExpiry} min left)` : `❌ EXPIRED (${Math.abs(minutesUntilExpiry)} min ago)`}`);
    
    // 2. Test token format
    console.log(`   Token length: ${sender.access_token ? sender.access_token.length : 0} chars`);
    console.log(`   Refresh token: ${sender.refresh_token ? '✅ Present' : '❌ Missing'}`);
    
    // 3. Test Gmail API profile endpoint (basic scope)
    console.log('\n🔍 Testing Gmail API Access:');
    await this.testGmailProfile(sender);
    
    // 4. Test Gmail API send scope specifically
    console.log('\n📧 Testing Gmail Send Scope:');
    await this.testGmailSendScope(sender);
    
    // 5. Analyze token structure
    console.log('\n🔬 Token Structure Analysis:');
    this.analyzeTokenStructure(sender);
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
        console.log(`   📊 Messages total: ${profile.messagesTotal}`);
        return true;
      } else {
        const error = await response.json();
        console.log('   ❌ Profile API: Failed');
        console.log(`   Error: ${error.error?.message || 'Unknown'}`);
        console.log(`   Code: ${error.error?.code || response.status}`);
        return false;
      }
    } catch (error) {
      console.log('   ❌ Profile API: Network error');
      console.log(`   Error: ${error.message}`);
      return false;
    }
  }

  async testGmailSendScope(sender) {
    try {
      // Test if we have send permissions by trying to create a draft
      const testMessage = {
        message: {
          raw: Buffer.from(
            'From: test@example.com\r\n' +
            'To: test@example.com\r\n' +
            'Subject: Test\r\n\r\n' +
            'Test message'
          ).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
        }
      };

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sender.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testMessage)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('   ✅ Send Scope: Available');
        console.log('   📝 Can create drafts (send permission confirmed)');
        
        // Clean up - delete the test draft
        if (result.id) {
          await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${result.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${sender.access_token}` }
          });
        }
        return true;
      } else {
        const error = await response.json();
        console.log('   ❌ Send Scope: Not available');
        console.log(`   Error: ${error.error?.message || 'Unknown'}`);
        
        if (error.error?.code === 403) {
          console.log('   🔐 Issue: Missing Gmail send permissions');
          console.log('   💡 Need: https://www.googleapis.com/auth/gmail.send scope');
        }
        return false;
      }
    } catch (error) {
      console.log('   ❌ Send Scope: Test failed');
      console.log(`   Error: ${error.message}`);
      return false;
    }
  }

  analyzeTokenStructure(sender) {
    const token = sender.access_token;
    
    if (!token) {
      console.log('   ❌ No access token found');
      return;
    }
    
    console.log(`   Token starts with: ${token.substring(0, 10)}...`);
    console.log(`   Token type: ${token.startsWith('ya29.') ? '✅ Google OAuth2' : '❌ Invalid format'}`);
    
    // Check refresh token
    if (sender.refresh_token) {
      console.log(`   Refresh token: ${sender.refresh_token.substring(0, 10)}...`);
      console.log(`   Refresh format: ${sender.refresh_token.startsWith('1//') ? '✅ Valid' : '❌ Invalid'}`);
    } else {
      console.log('   ❌ No refresh token - cannot auto-refresh');
    }
  }

  provideSolutions() {
    console.log('\n🔧 GMAIL TOKEN SOLUTIONS');
    console.log('=' .repeat(60));
    console.log('');
    
    console.log('Based on the diagnostic, here are the solutions:');
    console.log('');
    
    console.log('1. 🔐 MISSING SEND SCOPE (Most likely issue):');
    console.log('   Problem: Tokens have profile access but not send permission');
    console.log('   Solution: Re-authorize with proper scopes');
    console.log('   → Go to Google Cloud Console');
    console.log('   → Enable Gmail API');
    console.log('   → Add scope: https://www.googleapis.com/auth/gmail.send');
    console.log('   → Re-connect Gmail accounts in dashboard');
    console.log('');
    
    console.log('2. 🔄 TOKEN REFRESH NEEDED:');
    console.log('   Problem: Access tokens expired');
    console.log('   Solution: Implement token refresh mechanism');
    console.log('   → Use refresh_token to get new access_token');
    console.log('   → Update database with new tokens');
    console.log('');
    
    console.log('3. 🔧 OAUTH CONFIGURATION:');
    console.log('   Problem: OAuth app not configured for Gmail API');
    console.log('   Solution: Check Google Cloud Console');
    console.log('   → Enable Gmail API');
    console.log('   → Configure OAuth consent screen');
    console.log('   → Add required scopes');
    console.log('');
    
    console.log('4. 🧪 QUICK TEST SOLUTION:');
    console.log('   For immediate testing, you can:');
    console.log('   → Use a test email service (like Mailtrap)');
    console.log('   → Or implement SMTP sending instead of Gmail API');
    console.log('   → This bypasses OAuth complexity');
    console.log('');
    
    console.log('5. 📋 STEP-BY-STEP FIX:');
    console.log('   1. Go to https://console.cloud.google.com');
    console.log('   2. Select your project');
    console.log('   3. Enable Gmail API');
    console.log('   4. Go to OAuth consent screen');
    console.log('   5. Add scope: https://www.googleapis.com/auth/gmail.send');
    console.log('   6. Save changes');
    console.log('   7. Re-connect Gmail in your app dashboard');
    console.log('   8. Test again with: node email-sender.js');
    console.log('');
    
    console.log('💡 ALTERNATIVE - Use SMTP:');
    console.log('   If OAuth is too complex, switch to SMTP:');
    console.log('   → Gmail SMTP: smtp.gmail.com:587');
    console.log('   → Use app passwords instead of OAuth');
    console.log('   → Simpler setup, same functionality');
  }
}

// Run the diagnostic
const diagnostic = new GmailTokenDiagnostic();
diagnostic.runCompleteDiagnostic();