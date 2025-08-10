/**
 * Production SMTP Email Sender
 * Uses Gmail app passwords instead of OAuth tokens
 */

const nodemailer = require('nodemailer');

class ProductionSMTPSender {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.credentials = { username: 'admin', password: 'password' };
    
    // Gmail SMTP configuration
    this.smtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        // Will be set per sender
      }
    };
  }

  async runEmailAutomation() {
    console.log('🚀 Production SMTP Email Automation');
    console.log('=' .repeat(50));
    
    try {
      // Check nodemailer availability
      if (!this.checkNodemailer()) {
        return;
      }
      
      // Fetch pending contacts
      const pendingData = await this.fetchPendingContacts();
      
      if (!pendingData || pendingData.length === 0) {
        console.log('📭 No campaigns ready for processing');
        return;
      }
      
      // Process each campaign
      for (const campaign of pendingData) {
        await this.processCampaign(campaign);
      }
      
      console.log('\n✅ Email automation completed!');
      
    } catch (error) {
      console.error('❌ Email automation failed:', error);
    }
  }

  checkNodemailer() {
    try {
      require('nodemailer');
      return true;
    } catch (error) {
      console.log('❌ nodemailer not installed');
      console.log('📦 Install with: npm install nodemailer');
      console.log('');
      console.log('💡 Alternative: Use the OAuth version once Google verifies your app');
      return false;
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
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      console.log(`✅ Found ${data.data.length} campaigns ready`);
      return data.data;
      
    } catch (error) {
      console.error('❌ Failed to fetch pending contacts:', error);
      throw error;
    }
  }

  async processCampaign(campaign) {
    console.log(`\n📧 Processing campaign: "${campaign.name}"`);
    console.log('-'.repeat(40));
    
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
        console.log(`\n📤 ${contact.firstName} ${contact.lastName} (${contact.email.trim()})`);
        
        // Find Gmail sender for this contact
        const gmailSender = this.findGmailSender(campaign.senders, contact);
        if (!gmailSender) {
          console.log('   ⚠️ No Gmail sender available');
          results.skipped.push({ contactId: contact.id, reason: 'No Gmail sender' });
          continue;
        }
        
        console.log(`   📨 Sender: ${gmailSender.name} (${gmailSender.email})`);
        
        // Check if sender has app password configured
        if (!this.hasAppPassword(gmailSender)) {
          console.log('   ❌ No app password configured for sender');
          console.log('   💡 Setup required: Generate Gmail app password');
          results.failed.push({
            contactId: contact.id,
            email: contact.email,
            error: 'No app password configured'
          });
          continue;
        }
        
        // Prepare email content
        const emailData = this.prepareEmailContent(contact);
        console.log(`   📧 Subject: ${emailData.subject}`);
        
        // Send email via SMTP
        const emailResult = await this.sendSMTPEmail(gmailSender, emailData);
        
        if (emailResult.success) {
          console.log(`   ✅ Sent successfully`);
          console.log(`   📧 Message ID: ${emailResult.messageId}`);
          
          results.sent.push({
            contactId: contact.id,
            email: contact.email,
            messageId: emailResult.messageId,
            sequenceId: contact.nextSequence.id
          });
        } else {
          console.log(`   ❌ Send failed: ${emailResult.error}`);
          results.failed.push({
            contactId: contact.id,
            email: contact.email,
            error: emailResult.error
          });
        }
        
        // Rate limiting
        await this.sleep(2000);
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        results.failed.push({
          contactId: contact.id,
          email: contact.email,
          error: error.message
        });
      }
    }
    
    // Update status in database
    if (results.sent.length > 0 || results.failed.length > 0) {
      await this.updateEmailStatus(campaign.id, results);
    }
    
    // Summary
    console.log(`\n📊 Campaign "${campaign.name}" Results:`);
    console.log(`   ✅ Sent: ${results.sent.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   ⏭️ Skipped: ${results.skipped.length}`);
  }

  findGmailSender(senders, contact) {
    // Find a Gmail sender that's active and has capacity
    return senders.find(sender => 
      sender.email.includes('gmail.com') && 
      sender.is_active
    );
  }

  hasAppPassword(sender) {
    // Check if sender has app_password field or we can use a configured one
    // For now, we'll simulate this - in production you'd check database
    
    // You can either:
    // 1. Add app_password column to database
    // 2. Or hardcode for testing (not recommended for production)
    
    const testAppPasswords = {
      'essabar.yassine@gmail.com': process.env.GMAIL_APP_PASSWORD_1 || null,
      'anthoy2327@gmail.com': process.env.GMAIL_APP_PASSWORD_2 || null,
      'ecomm2405@gmail.com': process.env.GMAIL_APP_PASSWORD_3 || null
    };
    
    return testAppPasswords[sender.email] !== null;
  }

  getAppPassword(sender) {
    const testAppPasswords = {
      'essabar.yassine@gmail.com': process.env.GMAIL_APP_PASSWORD_1,
      'anthoy2327@gmail.com': process.env.GMAIL_APP_PASSWORD_2,
      'ecomm2405@gmail.com': process.env.GMAIL_APP_PASSWORD_3
    };
    
    return testAppPasswords[sender.email];
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

  async sendSMTPEmail(sender, emailData) {
    try {
      // Create transporter with app password
      const transporter = nodemailer.createTransporter({
        ...this.smtpConfig,
        auth: {
          user: sender.email,
          pass: this.getAppPassword(sender)
        }
      });
      
      // Verify SMTP connection
      await transporter.verify();
      
      // Send email
      const result = await transporter.sendMail({
        from: `"${sender.name}" <${sender.email}>`,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.body,
        // html: emailData.isHtml ? emailData.body : undefined
      });
      
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

  async updateEmailStatus(campaignId, results) {
    console.log(`\n📊 Updating status...`);
    
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
        console.log('✅ Database updated successfully');
      } else {
        console.warn(`⚠️ Database update failed: ${await response.text()}`);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to update status:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showSetupInstructions() {
    console.log('\n🔧 SMTP SETUP REQUIRED');
    console.log('=' .repeat(50));
    console.log('');
    console.log('To use this SMTP sender:');
    console.log('');
    console.log('1. 📦 Install nodemailer:');
    console.log('   npm install nodemailer');
    console.log('');
    console.log('2. 🔐 Setup Gmail app passwords for each account:');
    console.log('   → essabar.yassine@gmail.com');
    console.log('   → anthoy2327@gmail.com');
    console.log('   → ecomm2405@gmail.com');
    console.log('');
    console.log('3. 🔑 Set environment variables:');
    console.log('   export GMAIL_APP_PASSWORD_1="abcd-efgh-ijkl-mnop"');
    console.log('   export GMAIL_APP_PASSWORD_2="your-app-password-2"');
    console.log('   export GMAIL_APP_PASSWORD_3="your-app-password-3"');
    console.log('');
    console.log('4. 🚀 Run the automation:');
    console.log('   node email-sender-smtp-production.js');
    console.log('');
    console.log('🔗 App password setup: https://myaccount.google.com/apppasswords');
  }
}

// Run the SMTP automation
if (typeof window === 'undefined') {
  const sender = new ProductionSMTPSender();
  sender.runEmailAutomation().then(() => {
    sender.showSetupInstructions();
  });
}