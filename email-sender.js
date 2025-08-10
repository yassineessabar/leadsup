/**
 * Email Automation Sender
 * Fetches pending contacts and sends emails via Gmail API
 */

class EmailAutomationSender {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.credentials = { username: 'admin', password: 'password' };
  }

  async runEmailAutomation() {
    console.log('🚀 Starting Email Automation Sender...');
    console.log('=' .repeat(60));
    
    try {
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
      
      // Log campaign summary
      data.data.forEach(campaign => {
        console.log(`  📋 ${campaign.name}: ${campaign.contacts?.length || 0} contacts ready`);
      });
      
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
        console.log(`\n📤 Sending email to: ${contact.firstName} ${contact.lastName} (${contact.email})`);
        
        // Prepare email content
        const emailData = this.prepareEmailContent(contact);
        
        // Send email via Gmail API
        const emailResult = await this.sendGmailEmail(contact.sender, emailData);
        
        if (emailResult.success) {
          console.log(`✅ Email sent successfully to ${contact.email}`);
          console.log(`   📧 Message ID: ${emailResult.messageId}`);
          
          results.sent.push({
            contactId: contact.id,
            email: contact.email,
            messageId: emailResult.messageId,
            sequenceId: contact.nextSequence.id
          });
        } else {
          console.log(`❌ Failed to send email to ${contact.email}: ${emailResult.error}`);
          results.failed.push({
            contactId: contact.id,
            email: contact.email,
            error: emailResult.error
          });
        }
        
        // Add delay between emails to avoid rate limiting
        await this.sleep(2000); // 2 second delay
        
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
      isHtml: false // You can make this configurable
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

  async sendGmailEmail(sender, emailData) {
    console.log(`   📨 Using sender: ${sender.name} (${sender.email})`);
    
    try {
      // Check if access token is expired
      const tokenExpiry = new Date(sender.expires_at);
      const now = new Date();
      
      if (tokenExpiry <= now) {
        console.log('   🔄 Access token expired, needs refresh');
        // In a real implementation, you'd refresh the token here
        return {
          success: false,
          error: 'Access token expired - implement token refresh'
        };
      }
      
      // Prepare Gmail API message
      const message = this.createGmailMessage(emailData, sender.email);
      
      // Send via Gmail API
      const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sender.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: message
        })
      });
      
      if (!gmailResponse.ok) {
        const errorData = await gmailResponse.text();
        return {
          success: false,
          error: `Gmail API error (${gmailResponse.status}): ${errorData}`
        };
      }
      
      const result = await gmailResponse.json();
      
      return {
        success: true,
        messageId: result.id
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  createGmailMessage(emailData, fromEmail) {
    // Create RFC 2822 formatted email message
    const messageParts = [
      `From: ${fromEmail}`,
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      'MIME-Version: 1.0',
      emailData.isHtml 
        ? 'Content-Type: text/html; charset=utf-8'
        : 'Content-Type: text/plain; charset=utf-8',
      '',
      emailData.body
    ];
    
    const message = messageParts.join('\r\n');
    
    // Base64url encode (Gmail API requirement)
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async updateEmailStatus(campaignId, results) {
    console.log(`\n📊 Updating email status for campaign ${campaignId}...`);
    
    try {
      // Prepare status updates
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
      
      // Send to status update endpoint
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
        const error = await response.text();
        console.warn(`⚠️ Failed to update status: ${error}`);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to update email status:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the automation
if (typeof window === 'undefined') {
  // Running in Node.js
  const sender = new EmailAutomationSender();
  sender.runEmailAutomation();
} else {
  // Running in browser - make it available globally
  window.EmailSender = EmailAutomationSender;
}