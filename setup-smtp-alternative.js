/**
 * SMTP Email Sender Setup Guide
 * Production-ready alternative to Gmail API OAuth
 */

class SMTPSetupGuide {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
  }

  showSetupInstructions() {
    console.log('🔧 SMTP SETUP GUIDE - Gmail App Passwords');
    console.log('=' .repeat(60));
    console.log('');
    console.log('This is the FASTEST way to get email sending working while');
    console.log('Google verifies your OAuth app for gmail.send scope.');
    console.log('');
    
    console.log('📋 STEP-BY-STEP SETUP:');
    console.log('');
    
    console.log('1. 🔐 Enable 2-Factor Authentication:');
    console.log('   → Go to https://myaccount.google.com/security');
    console.log('   → Turn on "2-Step Verification" if not already enabled');
    console.log('   → This is required for app passwords');
    console.log('');
    
    console.log('2. 📱 Generate App Passwords:');
    console.log('   → Go to https://myaccount.google.com/apppasswords');
    console.log('   → Select app: "Mail"');
    console.log('   → Select device: "Other (custom name)"');
    console.log('   → Name it: "LeadsUp Email Automation"');
    console.log('   → Google will generate a 16-character password');
    console.log('   → SAVE THIS PASSWORD - you can\'t see it again!');
    console.log('');
    
    console.log('3. 📧 For Each Gmail Account:');
    console.log('   → essabar.yassine@gmail.com');
    console.log('   → anthoy2327@gmail.com');  
    console.log('   → ecomm2405@gmail.com');
    console.log('   → Generate separate app password for each');
    console.log('');
    
    console.log('4. 💾 Store App Passwords:');
    console.log('   → Update your database campaign_senders table');
    console.log('   → Replace access_token with app_password');
    console.log('   → Or add new app_password column');
    console.log('');
    
    this.showDatabaseUpdate();
    this.showNodemailerSetup();
    this.showProductionImplementation();
  }

  showDatabaseUpdate() {
    console.log('🗄️ DATABASE UPDATE:');
    console.log('');
    console.log('Option A: Add app_password column:');
    console.log('```sql');
    console.log('ALTER TABLE campaign_senders ADD COLUMN app_password VARCHAR(255);');
    console.log('');
    console.log('-- Update with your app passwords');
    console.log('UPDATE campaign_senders SET app_password = \'abcd efgh ijkl mnop\' WHERE email = \'essabar.yassine@gmail.com\';');
    console.log('UPDATE campaign_senders SET app_password = \'your-app-password-2\' WHERE email = \'anthoy2327@gmail.com\';');
    console.log('UPDATE campaign_senders SET app_password = \'your-app-password-3\' WHERE email = \'ecomm2405@gmail.com\';');
    console.log('```');
    console.log('');
  }

  showNodemailerSetup() {
    console.log('📦 INSTALL NODEMAILER:');
    console.log('```bash');
    console.log('npm install nodemailer');
    console.log('```');
    console.log('');
  }

  showProductionImplementation() {
    console.log('🔧 PRODUCTION IMPLEMENTATION:');
    console.log('');
    console.log('I\'ll create a production-ready SMTP email sender that:');
    console.log('✅ Uses app passwords instead of OAuth');
    console.log('✅ Works with your existing automation pipeline');
    console.log('✅ Handles all error cases');
    console.log('✅ Updates database status correctly');
    console.log('✅ No Google verification required');
    console.log('');
    
    console.log('After setup, your workflow becomes:');
    console.log('1. 🚀 Launch campaign in dashboard');
    console.log('2. 🤖 Run: node email-sender-smtp-production.js');
    console.log('3. 📧 Emails sent via SMTP (no OAuth issues)');
    console.log('4. 📊 Database updated with send status');
    console.log('');
  }

  async testCurrentTokens() {
    console.log('🧪 TESTING CURRENT GMAIL TOKENS:');
    console.log('');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/campaigns/automation/process-pending`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const senders = data.data[0].senders;
        console.log(`Found ${senders.length} senders to test:`);
        
        for (const sender of senders) {
          console.log(`\n📧 ${sender.name} (${sender.email}):`);
          
          // Test Gmail API with current token
          try {
            const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
              headers: {
                'Authorization': `Bearer ${sender.access_token}`
              }
            });
            
            if (gmailResponse.ok) {
              console.log('   ✅ OAuth token works for profile');
              
              // Test send scope
              const sendTest = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${sender.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  message: {
                    raw: Buffer.from('From: test\r\nTo: test\r\nSubject: test\r\n\r\ntest').toString('base64')
                  }
                })
              });
              
              if (sendTest.ok) {
                console.log('   🎉 SEND SCOPE WORKS! (Verification may have completed)');
              } else {
                const error = await sendTest.json();
                console.log('   ❌ Send scope still blocked:', error.error?.message);
              }
              
            } else {
              const error = await gmailResponse.json();
              console.log('   ❌ OAuth token failed:', error.error?.message);
            }
          } catch (error) {
            console.log('   ❌ Token test failed:', error.message);
          }
        }
      }
    } catch (error) {
      console.log('❌ Could not test tokens:', error.message);
    }
  }
}

// Run setup guide
const guide = new SMTPSetupGuide();
guide.showSetupInstructions();

// Test current tokens to see if verification completed
console.log('\n' + '='.repeat(60));
guide.testCurrentTokens();