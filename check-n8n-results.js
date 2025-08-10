/**
 * Check n8n Email Results
 * Shows what emails were processed by your n8n workflow
 */

class N8NResultsChecker {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.credentials = { username: 'admin', password: 'password' };
  }

  async checkN8NResults() {
    console.log('🤖 Checking n8n Email Automation Results');
    console.log('=' .repeat(60));
    console.log('');
    
    try {
      // Test the tracking API to see if it's receiving data
      await this.testTrackingAPI();
      
      // Show where to look for results
      await this.showResultLocations();
      
      // Show manual database queries
      this.showDatabaseQueries();
      
      // Show n8n logs location
      this.showN8NLogs();
      
    } catch (error) {
      console.error('❌ Error checking results:', error);
    }
  }

  async testTrackingAPI() {
    console.log('🔍 Testing Email Tracking API:');
    console.log('-'.repeat(40));
    
    try {
      // Send a test tracking request like n8n would
      const testData = {
        campaign_id: 'test-campaign',
        contact_id: 'test-contact',
        sequence_id: 'test-sequence',
        message_id: 'test-message-123',
        status: 'sent',
        sent_at: new Date().toISOString(),
        sender_type: 'gmail'
      };
      
      console.log('📤 Sending test tracking data...');
      
      const response = await fetch(`${this.baseUrl}/api/campaigns/tracking/sent`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Tracking API is working!');
        console.log('📊 Response:', JSON.stringify(result, null, 2));
      } else {
        console.log('⚠️ Tracking API issue:');
        console.log('📊 Response:', JSON.stringify(result, null, 2));
      }
      
    } catch (error) {
      console.log('❌ Could not test tracking API:', error.message);
    }
  }

  async showResultLocations() {
    console.log('\\n📍 Where to Find Email Results:');
    console.log('-'.repeat(40));
    console.log('');
    
    console.log('1. 🗄️ Database Tables:');
    console.log('   → prospect_sequence_progress (main tracking table)');
    console.log('   → contact_sequences (fallback table)');
    console.log('   → prospect_activities (activity logs)');
    console.log('');
    
    console.log('2. 🤖 n8n Execution Logs:');
    console.log('   → n8n interface: Executions tab');
    console.log('   → Look for workflow "My workflow 10"');
    console.log('   → Check each node for success/failure status');
    console.log('');
    
    console.log('3. 📊 Application Logs:');
    console.log('   → Next.js development console');
    console.log('   → Look for "📧 Email tracking data" messages');
    console.log('   → Check tracking API responses');
    console.log('');
    
    console.log('4. 📧 Gmail Sent Items:');
    console.log('   → Check Gmail sent folder for actual emails');
    console.log('   → Verify recipients received the emails');
    console.log('');
  }

  showDatabaseQueries() {
    console.log('🗄️ Database Queries to Check Results:');
    console.log('-'.repeat(40));
    console.log('');
    
    const queries = [
      {
        title: 'Recent Email Tracking (prospect_sequence_progress)',
        sql: `SELECT 
  psp.campaign_id,
  psp.prospect_id, 
  psp.sequence_id,
  psp.status,
  psp.sent_at,
  psp.message_id,
  psp.sender_type,
  p.email as prospect_email,
  p.first_name || ' ' || p.last_name as prospect_name
FROM prospect_sequence_progress psp
LEFT JOIN prospects p ON psp.prospect_id = p.id
ORDER BY psp.sent_at DESC
LIMIT 10;`
      },
      {
        title: 'Email Status Summary by Campaign',
        sql: `SELECT 
  campaign_id,
  status,
  COUNT(*) as count,
  MAX(sent_at) as last_sent
FROM prospect_sequence_progress
GROUP BY campaign_id, status
ORDER BY campaign_id, status;`
      },
      {
        title: 'Failed Emails with Error Messages',
        sql: `SELECT 
  psp.campaign_id,
  p.email as prospect_email,
  psp.error_message,
  psp.sent_at
FROM prospect_sequence_progress psp
LEFT JOIN prospects p ON psp.prospect_id = p.id
WHERE psp.status = 'failed'
ORDER BY psp.sent_at DESC;`
      },
      {
        title: 'Contact Sequences (fallback table)',
        sql: `SELECT 
  cs.id,
  cs.contact_id,
  cs.sequence_id,
  cs.status,
  cs.sent_at,
  cs.message_id,
  p.email as contact_email
FROM contact_sequences cs
LEFT JOIN prospects p ON cs.contact_id = p.id
WHERE cs.sent_at IS NOT NULL
ORDER BY cs.sent_at DESC
LIMIT 10;`
      }
    ];
    
    queries.forEach(query => {
      console.log(`\\n${query.title}:`);
      console.log('```sql');
      console.log(query.sql);
      console.log('```');
    });
  }

  showN8NLogs() {
    console.log('\\n🤖 n8n Workflow Debugging:');
    console.log('-'.repeat(40));
    console.log('');
    
    console.log('Your n8n workflow has detailed logging. Check:');
    console.log('');
    
    console.log('1. 🔍 Transform Data Node:');
    console.log('   → Should show: "✅ Prepared X emails to send"');
    console.log('   → Should show: "📧 First email preview: {email data}"');
    console.log('');
    
    console.log('2. 📧 Send Email (Gmail) Node:');
    console.log('   → Success: Gmail message ID returned');
    console.log('   → Failure: Gmail API error message');
    console.log('');
    
    console.log('3. 📊 Track Email Success/Failure Nodes:');
    console.log('   → Should call your tracking API with results');
    console.log('   → Check if tracking API returned success');
    console.log('');
    
    console.log('4. ✅ Log Success / ❌ Log Failure Nodes:');
    console.log('   → Should show final email send results');
    console.log('   → Success: "✅ SUCCESS: {email details}"');
    console.log('   → Failure: "❌ FAILURE: {error details}"');
    console.log('');
    
    console.log('🎯 Quick Check Commands:');
    console.log('   → Open n8n interface');
    console.log('   → Go to Executions tab'); 
    console.log('   → Find latest "My workflow 10" execution');
    console.log('   → Click on each node to see logs');
    console.log('   → Look for success ✅ or failure ❌ messages');
  }

  async showRealTimeCheck() {
    console.log('\\n⏱️ Real-Time Results Check:');
    console.log('-'.repeat(40));
    console.log('');
    
    console.log('To see results in real-time:');
    console.log('');
    console.log('1. 🚀 Trigger n8n workflow again:');
    console.log('   → POST to your webhook endpoint');
    console.log('   → Or run automation from your app');
    console.log('');
    console.log('2. 👀 Watch n8n executions:');
    console.log('   → Keep n8n interface open');
    console.log('   → Watch executions appear in real-time');
    console.log('   → Click on running execution to see progress');
    console.log('');
    console.log('3. 📊 Check database immediately after:');
    console.log('   → Run the SQL queries above');
    console.log('   → Look for new tracking entries');
    console.log('');
  }
}

// Run the checker
const checker = new N8NResultsChecker();
checker.checkN8NResults().then(() => {
  checker.showRealTimeCheck();
});