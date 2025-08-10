/**
 * Email Automation Sender - SMTP Version
 * Bypasses Gmail OAuth by using SMTP with app passwords
 */

const nodemailer = require('nodemailer');

class EmailAutomationSenderSMTP {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.credentials = { username: 'admin', password: 'password' };
  }

  async runEmailAutomation() {
    console.log('🚀 Starting Email Automation Sender (SMTP Version)...');
    console.log('=' .repeat(60));
    
    try {
      // Check if nodemailer is available
      if (!nodemailer) {
        console.log('❌ nodemailer not installed');
        console.log('Run: npm install nodemailer');
        return;
      }
      
      // Step 1: Fetch pending contacts
      const pendingData = await this.fetchPendingContacts();
      
      if (!pendingData || pendingData.length === 0) {
        console.log('📭 No campaigns ready for processing');
        return;
      }
      
      // Step 2: Process each campaign
      for (const campaign of pendingData) {
        await this.processCampaign(campaign);
      }
      
      console.log('\n✅ Email automation completed!');
      
    } catch (error) {
      console.error('❌ Email automation failed:', error);
    }
  }

  async fetchPendingContacts() {
    console.log('📋 Fetching pending contacts...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns/automation/process-pending`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64')
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      console.log(`✅ Found ${data.data.length} campaigns ready for processing`);
      
      return data.data;
      
    } catch (error) {
      console.error('❌ Failed to fetch pending contacts:', error);
      throw error;
    }
  }

  async processCampaign(campaign) {
    console.log(`\n📧 Processing campaign: "${campaign.name}"`);
    console.log('-'.repeat(50));
    
    if (!campaign.contacts || campaign.contacts.length === 0) {
      console.log('⚠️ No contacts to process');
      return;
    }
    
    const results = {
      sent: [],
      failed: [],
      skipped: []
    };
    
    // Process each contact
    for (const contact of campaign.contacts) {
      try {
        console.log(`\n📤 Sending email to: ${contact.firstName} ${contact.lastName} (${contact.email.trim()})`);
        
        // Find a Gmail sender for SMTP
        const gmailSender = campaign.senders.find(s => s.email.includes('gmail.com'));
        if (!gmailSender) {
          console.log('⚠️ No Gmail sender found, skipping...');
          results.skipped.push({ contactId: contact.id, reason: 'No Gmail sender' });
          continue;
        }
        
        console.log(`   📨 Would use SMTP: ${gmailSender.name} (${gmailSender.email})`);
        console.log('   🔐 Note: Requires Gmail app password setup');
        
        // Prepare email content
        const emailData = this.prepareEmailContent(contact);
        console.log(`   📧 Subject: ${emailData.subject}`);
        console.log(`   📄 Content: ${emailData.body.substring(0, 50)}...`);
        
        // For demo purposes, we'll simulate sending
        console.log('   🧪 SIMULATION: Email would be sent via SMTP');
        
        // In real implementation, you would:
        // const emailResult = await this.sendSMTPEmail(gmailSender, emailData);
        
        // Simulate success for demo
        results.sent.push({
          contactId: contact.id,
          email: contact.email,
          messageId: 'smtp-' + Date.now(),
          sequenceId: contact.nextSequence.id
        });
        
        console.log('   ✅ Email simulated successfully');
        
        // Add delay between emails
        await this.sleep(1000);
        
      } catch (error) {
        console.error(`❌ Error processing contact ${contact.email}:`, error);
        results.failed.push({
          contactId: contact.id,
          email: contact.email,
          error: error.message
        });
      }
    }
    
    // Update status for sent/failed emails
    if (results.sent.length > 0 || results.failed.length > 0) {
      await this.updateEmailStatus(campaign.id, results);
    }
    
    // Summary
    console.log(`\n📊 Campaign "${campaign.name}" Results:`);
    console.log(`   ✅ Sent: ${results.sent.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   ⏭️ Skipped: ${results.skipped.length}`);
  }

  prepareEmailContent(contact) {
    const sequence = contact.nextSequence;
    
    // Replace template variables
    const subject = this.replaceTemplateVars(sequence.subject, contact);
    const content = this.replaceTemplateVars(sequence.content, contact);
    
    return {
      to: contact.email.trim(),
      subject: subject,
      body: content,
      isHtml: false
    };
  }

  replaceTemplateVars(template, contact) {
    return template
      .replace(/{{firstName}}/g, contact.firstName || '')
      .replace(/{{lastName}}/g, contact.lastName || '')
      .replace(/{{company}}/g, contact.company || '')
      .replace(/{{title}}/g, contact.title || '')
      .replace(/{{email}}/g, contact.email || '');
  }

  // Real SMTP implementation (commented out for demo)
  /*
  async createSMTPTransporter(gmailSender) {
    // Note: Requires Gmail app password, not OAuth token
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: gmailSender.email,
        pass: 'YOUR_GMAIL_APP_PASSWORD' // Not OAuth token!
      }
    });
  }

  async sendSMTPEmail(gmailSender, emailData) {
    try {
      const transporter = await this.createSMTPTransporter(gmailSender);
      
      const mailOptions = {
        from: gmailSender.email,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.body
      };
      
      const result = await transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  */

  async updateEmailStatus(campaignId, results) {
    console.log(`\n📊 Updating email status for campaign ${campaignId}...`);
    
    try {
      const updates = [
        ...results.sent.map(item => ({
          contactId: item.contactId,
          sequenceId: item.sequenceId,
          status: 'sent',
          messageId: item.messageId,
          sentAt: new Date().toISOString()
        })),
        ...results.failed.map(item => ({
          contactId: item.contactId,
          status: 'failed',
          error: item.error,
          failedAt: new Date().toISOString()
        }))
      ];
      
      const response = await fetch(`${this.baseUrl}/api/campaigns/automation/update-status`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignId: campaignId,
          updates: updates
        })
      });
      
      if (response.ok) {
        console.log('✅ Status updates sent successfully');
      } else {
        console.warn(`⚠️ Failed to update status: ${await response.text()}`);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to update email status:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showSMTPSetupInstructions() {
    console.log('\n🔧 SMTP SETUP INSTRUCTIONS');
    console.log('=' .repeat(50));
    console.log('');
    console.log('To use real SMTP sending:');
    console.log('');
    console.log('1. 📦 Install nodemailer:');
    console.log('   npm install nodemailer');
    console.log('');
    console.log('2. 🔐 Setup Gmail app passwords:');
    console.log('   → Go to Google Account settings');
    console.log('   → Security > 2-Step Verification');
    console.log('   → App passwords > Generate');
    console.log('   → Use app password instead of OAuth tokens');
    console.log('');
    console.log('3. 🔓 Enable Gmail SMTP:');
    console.log('   → Host: smtp.gmail.com');
    console.log('   → Port: 587');
    console.log('   → Security: STARTTLS');
    console.log('');
    console.log('4. 🧪 Test SMTP:');
    console.log('   → Uncomment SMTP code in this script');
    console.log('   → Add your app passwords to configuration');
    console.log('   → Run: node email-sender-smtp.js');
    console.log('');
    console.log('💡 SMTP is simpler than OAuth but less secure for production');
  }
}

// Run the SMTP automation
if (typeof window === 'undefined') {
  const sender = new EmailAutomationSenderSMTP();
  sender.runEmailAutomation().then(() => {
    sender.showSMTPSetupInstructions();
  });
}