/**
 * Check Email Results in Database
 * Shows results from n8n email automation
 */

class DatabaseChecker {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
  }

  async checkEmailResults() {
    console.log('📊 Checking Email Automation Results');
    console.log('=' .repeat(50));
    
    try {
      // Check recent contact sequences
      await this.checkContactSequences();
      
      // Check campaign stats
      await this.checkCampaignStats();
      
      // Check prospect activities
      await this.checkProspectActivities();
      
    } catch (error) {
      console.error('❌ Database check failed:', error);
    }
  }

  async checkContactSequences() {
    console.log('\n📧 Recent Contact Sequences:');
    console.log('-'.repeat(40));
    
    try {
      const response = await fetch(`${this.baseUrl}/api/contact-sequences`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
        }
      });
      
      if (!response.ok) {
        console.log('⚠️ Could not fetch contact sequences');
        return;
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        console.log('📭 No contact sequences found');
        return;
      }
      
      // Show recent sequences
      const recent = data.slice(0, 10);
      
      for (const seq of recent) {
        console.log(`\n📤 ${seq.contact_email || 'Unknown'}`);
        console.log(`   Status: ${this.getStatusIcon(seq.status)} ${seq.status}`);
        console.log(`   Sequence: ${seq.sequence_subject || 'N/A'}`);
        console.log(`   Sent: ${seq.sent_at ? new Date(seq.sent_at).toLocaleString() : 'Not sent'}`);
        if (seq.message_id) {
          console.log(`   Message ID: ${seq.message_id}`);
        }
        if (seq.error_message) {
          console.log(`   Error: ${seq.error_message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error checking contact sequences:', error);
    }
  }

  async checkCampaignStats() {
    console.log('\n📈 Campaign Statistics:');
    console.log('-'.repeat(40));
    
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
        }
      });
      
      if (!response.ok) {
        console.log('⚠️ Could not fetch campaigns');
        return;
      }
      
      const campaigns = await response.json();
      
      for (const campaign of campaigns) {
        if (campaign.status === 'active') {
          console.log(`\n🎯 ${campaign.name}`);
          console.log(`   Status: ${campaign.status}`);
          console.log(`   Prospects: ${campaign.total_contacts || 0}`);
          console.log(`   Sent: ${campaign.emails_sent || 0}`);
          console.log(`   Failed: ${campaign.emails_failed || 0}`);
          console.log(`   Last activity: ${campaign.last_activity || 'Never'}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error checking campaigns:', error);
    }
  }

  async checkProspectActivities() {
    console.log('\n🎭 Recent Prospect Activities:');
    console.log('-'.repeat(40));
    
    try {
      const response = await fetch(`${this.baseUrl}/api/prospect-activities`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
        }
      });
      
      if (!response.ok) {
        console.log('⚠️ Could not fetch prospect activities');
        return;
      }
      
      const activities = await response.json();
      
      if (!activities || activities.length === 0) {
        console.log('📭 No prospect activities found');
        return;
      }
      
      const recent = activities.slice(0, 10);
      
      for (const activity of recent) {
        console.log(`\n📝 ${activity.prospect_email || 'Unknown'}`);
        console.log(`   Type: ${activity.activity_type}`);
        console.log(`   Details: ${activity.activity_data || 'N/A'}`);
        console.log(`   Time: ${new Date(activity.created_at).toLocaleString()}`);
      }
      
    } catch (error) {
      console.error('❌ Error checking activities:', error);
    }
  }

  getStatusIcon(status) {
    const icons = {
      'sent': '✅',
      'failed': '❌', 
      'pending': '⏳',
      'scheduled': '📅',
      'bounced': '↩️',
      'opened': '👀',
      'clicked': '🖱️'
    };
    
    return icons[status] || '❓';
  }

  async showDirectQueries() {
    console.log('\n🔍 Direct Database Queries to Run:');
    console.log('=' .repeat(50));
    console.log('');
    console.log('If you have direct database access, run these queries:');
    console.log('');
    
    const queries = [
      {
        title: '1. Recent Email Sends',
        sql: `
SELECT 
  cs.status,
  cs.sent_at,
  p.email,
  p.first_name || ' ' || p.last_name as name,
  seq.subject,
  cs.message_id
FROM contact_sequences cs
JOIN prospects p ON cs.contact_id = p.id  
JOIN sequences seq ON cs.sequence_id = seq.id
WHERE cs.sent_at IS NOT NULL
ORDER BY cs.sent_at DESC
LIMIT 10;`
      },
      {
        title: '2. Campaign Email Counts', 
        sql: `
SELECT 
  c.name as campaign,
  COUNT(CASE WHEN cs.status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN cs.status = 'failed' THEN 1 END) as failed,
  COUNT(cs.id) as total
FROM campaigns c
LEFT JOIN contact_sequences cs ON cs.campaign_id = c.id
WHERE c.status = 'active'
GROUP BY c.id, c.name;`
      },
      {
        title: '3. Failed Email Details',
        sql: `
SELECT 
  p.email,
  cs.error_message,
  cs.created_at
FROM contact_sequences cs
JOIN prospects p ON cs.contact_id = p.id
WHERE cs.status = 'failed'
ORDER BY cs.created_at DESC
LIMIT 5;`
      }
    ];
    
    queries.forEach(query => {
      console.log(`${query.title}:`);
      console.log('```sql');
      console.log(query.sql.trim());
      console.log('```');
      console.log('');
    });
  }
}

// Run the database checker
const checker = new DatabaseChecker();
checker.checkEmailResults().then(() => {
  checker.showDirectQueries();
});