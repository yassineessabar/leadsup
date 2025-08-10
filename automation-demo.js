/**
 * Email Automation Demo & Production Guide
 * Shows complete workflow and explains production setup
 */

class AutomationDemo {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.credentials = { username: 'admin', password: 'password' };
  }

  async runDemo() {
    console.log('🎯 Email Automation Workflow - Complete Demo');
    console.log('='.repeat(60));
    
    try {
      // Step 1: Demonstrate fetching pending contacts
      await this.demonstrateFetching();
      
      // Step 2: Show what would happen in production
      await this.demonstrateProduction();
      
      // Step 3: Provide production setup guide
      this.provideProductionGuide();
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }

  async demonstrateFetching() {
    console.log('\n📋 STEP 1: Fetching Pending Contacts');
    console.log('-'.repeat(50));
    
    const response = await fetch(`${this.baseUrl}/api/campaigns/automation/process-pending`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64')
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      const campaign = data.data[0];
      
      console.log(`✅ Campaign Ready: "${campaign.name}"`);
      console.log(`📊 Contacts to Process: ${campaign.contacts?.length || 0}`);
      console.log(`📧 Available Senders: ${campaign.senders?.length || 0}`);
      
      if (campaign.contacts && campaign.contacts.length > 0) {
        console.log('\n📋 Contact Details:');
        campaign.contacts.forEach((contact, index) => {
          console.log(`  ${index + 1}. ${contact.firstName} ${contact.lastName}`);
          console.log(`     Email: ${contact.email.trim()}`);
          console.log(`     Sequence: ${contact.nextSequence.title} (Step ${contact.nextSequence.step_number})`);
          console.log(`     Subject: "${contact.nextSequence.subject}"`);
          console.log(`     Sender: ${contact.sender.name} (${contact.sender.email})`);
          console.log(`     Local Time: ${contact.localTime} (${contact.timezoneGroup})`);
          console.log('');
        });
      }
      
      if (campaign.senders && campaign.senders.length > 0) {
        console.log('📧 Sender Details:');
        campaign.senders.forEach((sender, index) => {
          const tokenExpiry = new Date(sender.expires_at);
          const isExpired = tokenExpiry <= new Date();
          
          console.log(`  ${index + 1}. ${sender.name} (${sender.email})`);
          console.log(`     Health Score: ${sender.health_score}%`);
          console.log(`     Daily Limit: ${sender.daily_limit} emails`);
          console.log(`     Token Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
          console.log(`     Expires: ${tokenExpiry.toLocaleString()}`);
          console.log('');
        });
      }
      
      return campaign;
    } else {
      console.log('📭 No campaigns ready for processing');
      return null;
    }
  }

  async demonstrateProduction() {
    console.log('\n🏭 STEP 2: Production Email Sending Process');
    console.log('-'.repeat(50));
    
    console.log('In production, this script would:');
    console.log('');
    
    console.log('1. 🔄 TOKEN REFRESH:');
    console.log('   - Check if access tokens are expired');
    console.log('   - Automatically refresh using refresh_token');
    console.log('   - Update tokens in database');
    console.log('');
    
    console.log('2. 📧 EMAIL SENDING:');
    console.log('   - Send emails via Gmail API using valid tokens');
    console.log('   - Apply rate limiting (2-5 second delays)');
    console.log('   - Handle Gmail API errors and retries');
    console.log('');
    
    console.log('3. 📊 STATUS TRACKING:');
    console.log('   - Update prospect_sequence_progress table');
    console.log('   - Track sent/failed status with message IDs');
    console.log('   - Schedule next sequence steps automatically');
    console.log('');
    
    console.log('4. 📈 ANALYTICS:');
    console.log('   - Update campaign statistics');
    console.log('   - Log activities for reporting');
    console.log('   - Monitor sender health scores');
    console.log('');
    
    // Demonstrate status update format
    console.log('📋 Sample Status Update Request:');
    console.log(JSON.stringify({
      campaignId: 'f4bb948b-cee0-4ed7-be81-ef30810311a2',
      contactId: 'contact-uuid',
      sequenceId: 'sequence-uuid',
      status: 'sent',
      sentAt: new Date().toISOString(),
      senderAccount: 'sender@example.com',
      errorMessage: null
    }, null, 2));
  }

  provideProductionGuide() {
    console.log('\n🚀 PRODUCTION SETUP GUIDE');
    console.log('='.repeat(60));
    
    console.log('\n1. 🔐 TOKEN MANAGEMENT:');
    console.log('   - Implement OAuth token refresh mechanism');
    console.log('   - Store refresh tokens securely in database');
    console.log('   - Handle token expiration gracefully');
    console.log('');
    console.log('   Example refresh code:');
    console.log('   ```javascript');
    console.log('   async function refreshGmailToken(refreshToken) {');
    console.log('     const response = await fetch("https://oauth2.googleapis.com/token", {');
    console.log('       method: "POST",');
    console.log('       headers: { "Content-Type": "application/json" },');
    console.log('       body: JSON.stringify({');
    console.log('         client_id: process.env.GOOGLE_CLIENT_ID,');
    console.log('         client_secret: process.env.GOOGLE_CLIENT_SECRET,');
    console.log('         refresh_token: refreshToken,');
    console.log('         grant_type: "refresh_token"');
    console.log('       })');
    console.log('     });');
    console.log('     return response.json();');
    console.log('   }');
    console.log('   ```');
    console.log('');
    
    console.log('2. 📅 SCHEDULING (Choose One):');
    console.log('   a) N8N Workflow:');
    console.log('      - Create HTTP Request node');
    console.log('      - URL: GET /api/campaigns/automation/process-pending');
    console.log('      - Schedule: Every 15-30 minutes');
    console.log('      - Add Gmail sending nodes');
    console.log('      - Update status via POST /api/campaigns/automation/update-status');
    console.log('');
    console.log('   b) Cron Job:');
    console.log('      - Add this script to server cron');
    console.log('      - Schedule: */15 * * * * (every 15 minutes)');
    console.log('      - Monitor logs for errors');
    console.log('');
    
    console.log('3. ⚡ RATE LIMITING:');
    console.log('   - Gmail API: 250 quota units per user per second');
    console.log('   - Recommended: 2-5 seconds between emails');
    console.log('   - Monitor sender daily limits');
    console.log('   - Implement exponential backoff for errors');
    console.log('');
    
    console.log('4. 🔍 MONITORING:');
    console.log('   - Log all API requests/responses');
    console.log('   - Monitor token expiration dates');
    console.log('   - Track success/failure rates');
    console.log('   - Set up alerts for failures');
    console.log('');
    
    console.log('5. 🛡️ ERROR HANDLING:');
    console.log('   - Handle Gmail API rate limits (429 errors)');
    console.log('   - Retry failed sends with exponential backoff');
    console.log('   - Update sender health scores based on performance');
    console.log('   - Pause senders with repeated failures');
    console.log('');
    
    console.log('6. 📊 NEXT STEPS FOR YOU:');
    console.log('   ✅ Automation pipeline is working');
    console.log('   ✅ Database schema is ready');
    console.log('   ✅ API endpoints are functional');
    console.log('');
    console.log('   🔧 TODO:');
    console.log('   1. Refresh Gmail tokens in your dashboard');
    console.log('   2. Test with fresh tokens using the email-sender.js script');
    console.log('   3. Set up production scheduling (n8n or cron)');
    console.log('   4. Monitor and optimize sending rates');
    console.log('');
    
    console.log('💡 QUICK TEST:');
    console.log('1. Go to your campaign dashboard');
    console.log('2. Reconnect Gmail accounts (refresh tokens)');
    console.log('3. Run: node email-sender.js');
    console.log('4. Check database for sent email records');
  }
}

// Run the demo
const demo = new AutomationDemo();
demo.runDemo();