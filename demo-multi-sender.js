#!/usr/bin/env node
/**
 * Demo of multi-sender JavaScript email system
 * Shows how it scales to unlimited accounts vs n8n limitations
 */

const nodemailer = require('nodemailer');

// Demo configuration - simulates multiple client accounts
const DEMO_CONFIG = {
  // Multiple senders (this could be 10, 50, or 100+ accounts)
  senders: [
    {
      email: 'sender1@company.com',
      name: 'Alice Johnson',
      auth_type: 'app_password',
      app_password: 'demo-password-123', // In real use, this would be actual Gmail App Password
      health_score: 95,
      daily_limit: 50
    },
    {
      email: 'sender2@company.com', 
      name: 'Bob Smith',
      auth_type: 'app_password',
      app_password: 'demo-password-456',
      health_score: 88,
      daily_limit: 40
    },
    {
      email: 'sender3@company.com',
      name: 'Carol Davis',
      auth_type: 'oauth',
      refresh_token: 'demo-refresh-token',
      access_token: 'demo-access-token',
      health_score: 92,
      daily_limit: 60
    }
  ],

  // Demo contacts to process
  contacts: [
    { 
      id: '1', 
      email: 'prospect1@target.com', 
      firstName: 'John', 
      lastName: 'Doe', 
      company: 'Target Corp',
      nextSequence: { step_number: 1, subject: 'Introduction from {{senderName}}', content: 'Hi {{firstName}}, I hope this email finds you well...' }
    },
    { 
      id: '2', 
      email: 'prospect2@target.com', 
      firstName: 'Jane', 
      lastName: 'Smith', 
      company: 'Another Corp',
      nextSequence: { step_number: 2, subject: 'Following up with {{firstName}}', content: 'Hi {{firstName}}, following up on my previous email...' }
    },
    { 
      id: '3', 
      email: 'prospect3@target.com', 
      firstName: 'Mike', 
      lastName: 'Johnson', 
      company: 'Third Corp',
      nextSequence: { step_number: 1, subject: 'Quick question for {{firstName}}', content: 'Hi {{firstName}}, I have a quick question about {{company}}...' }
    },
    { 
      id: '4', 
      email: 'prospect4@target.com', 
      firstName: 'Sarah', 
      lastName: 'Wilson', 
      company: 'Fourth Corp',
      nextSequence: { step_number: 3, subject: 'Final follow-up {{firstName}}', content: 'Hi {{firstName}}, this is my final follow-up...' }
    },
    { 
      id: '5', 
      email: 'prospect5@target.com', 
      firstName: 'David', 
      lastName: 'Brown', 
      company: 'Fifth Corp',
      nextSequence: { step_number: 1, subject: 'Partnership opportunity', content: 'Hi {{firstName}}, I see an opportunity for {{company}}...' }
    }
  ]
};

// Mock email transporter (doesn't actually send)
function createMockTransporter(senderConfig) {
  return {
    sendMail: async (mailOptions) => {
      // Simulate email sending with random delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      // Simulate 95% success rate
      if (Math.random() < 0.95) {
        return {
          messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          response: '250 Message accepted'
        };
      } else {
        throw new Error('Simulated delivery failure');
      }
    }
  };
}

// Round-robin sender assignment
function assignSenders(contacts, senders) {
  const senderUsage = new Map();
  let senderRotationIndex = 0;
  const assignments = [];

  for (const contact of contacts) {
    let assignedSender = null;
    let attemptedSenders = 0;

    // Try to find available sender
    while (attemptedSenders < senders.length) {
      const senderIndex = senderRotationIndex % senders.length;
      const sender = senders[senderIndex];
      const currentUsage = senderUsage.get(sender.email) || 0;

      if (currentUsage < sender.daily_limit) {
        assignedSender = sender;
        senderUsage.set(sender.email, currentUsage + 1);
        senderRotationIndex++;
        break;
      }

      senderRotationIndex++;
      attemptedSenders++;
    }

    assignments.push({
      contact: contact,
      sender: assignedSender,
      usage: assignedSender ? senderUsage.get(assignedSender.email) : 0
    });
  }

  return assignments;
}

async function demonstrateMultiSenderSystem() {
  console.log('🚀 Multi-Sender JavaScript Email System Demo\n');
  console.log('═'.repeat(60));
  
  // Show sender configuration
  console.log('📧 Available Senders:');
  DEMO_CONFIG.senders.forEach((sender, i) => {
    console.log(`  ${i + 1}. ${sender.name} <${sender.email}>`);
    console.log(`     Auth: ${sender.auth_type} | Health: ${sender.health_score}% | Limit: ${sender.daily_limit}/day`);
  });

  console.log(`\n👥 Contacts to Process: ${DEMO_CONFIG.contacts.length}`);
  console.log('\n🔄 Round-Robin Sender Assignment:');
  
  // Assign senders using round-robin
  const assignments = assignSenders(DEMO_CONFIG.contacts, DEMO_CONFIG.senders);
  
  assignments.forEach((assignment, i) => {
    const { contact, sender, usage } = assignment;
    if (sender) {
      console.log(`  ${i + 1}. ${contact.email} → ${sender.email} (${usage}/${sender.daily_limit})`);
    } else {
      console.log(`  ${i + 1}. ${contact.email} → ❌ No available sender (all at daily limit)`);
    }
  });

  console.log('\n📤 Simulating Email Sending Process...\n');

  const results = {
    sent: 0,
    failed: 0,
    senderStats: new Map()
  };

  // Process each assignment
  for (let i = 0; i < assignments.length; i++) {
    const { contact, sender } = assignments[i];
    
    if (!sender) {
      console.log(`❌ ${contact.email} - No available sender`);
      results.failed++;
      continue;
    }

    try {
      // Replace template variables
      const subject = contact.nextSequence.subject
        .replace(/{{firstName}}/g, contact.firstName)
        .replace(/{{lastName}}/g, contact.lastName)
        .replace(/{{company}}/g, contact.company)
        .replace(/{{senderName}}/g, sender.name);

      const content = contact.nextSequence.content
        .replace(/{{firstName}}/g, contact.firstName)
        .replace(/{{lastName}}/g, contact.lastName)
        .replace(/{{company}}/g, contact.company)
        .replace(/{{senderName}}/g, sender.name);

      // Create transporter and send
      const transporter = createMockTransporter(sender);
      const result = await transporter.sendMail({
        from: `${sender.name} <${sender.email}>`,
        to: contact.email,
        subject: subject,
        html: content.replace(/\n/g, '<br>')
      });

      console.log(`✅ ${contact.email} ← ${sender.email} (Step ${contact.nextSequence.step_number}) [${result.messageId}]`);
      
      results.sent++;
      const senderStat = results.senderStats.get(sender.email) || { sent: 0, failed: 0 };
      senderStat.sent++;
      results.senderStats.set(sender.email, senderStat);

    } catch (error) {
      console.log(`❌ ${contact.email} ← ${sender.email} - Failed: ${error.message}`);
      
      results.failed++;
      const senderStat = results.senderStats.get(sender.email) || { sent: 0, failed: 0 };
      senderStat.failed++;
      results.senderStats.set(sender.email, senderStat);
    }

    // Rate limiting - 2 second delay
    if (i < assignments.length - 1) {
      console.log('⏰ Rate limiting (2s delay)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Final Results:');
  console.log(`✅ Successfully sent: ${results.sent}`);
  console.log(`❌ Failed to send: ${results.failed}`);
  console.log(`📧 Total processed: ${results.sent + results.failed}`);

  console.log('\n📈 Per-Sender Statistics:');
  results.senderStats.forEach((stats, email) => {
    const total = stats.sent + stats.failed;
    const successRate = total > 0 ? ((stats.sent / total) * 100).toFixed(1) : '0';
    console.log(`  ${email}: ${stats.sent} sent, ${stats.failed} failed (${successRate}% success)`);
  });

  console.log('\n🎯 System Benefits Demonstrated:');
  console.log('✅ Round-robin sender rotation');
  console.log('✅ Daily limit enforcement');
  console.log('✅ Template variable replacement');
  console.log('✅ Error handling and tracking');
  console.log('✅ Rate limiting between emails');
  console.log('✅ Support for multiple auth methods (OAuth + App Password)');
  console.log('✅ Scales to unlimited sender accounts');
}

async function compareScalability() {
  console.log('\n🔄 Scalability Comparison: n8n vs JavaScript\n');
  
  const scenarios = [
    { accounts: 3, description: 'Small team' },
    { accounts: 10, description: 'Growing company' },
    { accounts: 50, description: 'Sales organization' },
    { accounts: 200, description: 'Enterprise deployment' }
  ];

  console.log('┌─────────────────────┬────────────────────┬─────────────────────┐');
  console.log('│ Scale               │ n8n Approach       │ JavaScript Approach │');
  console.log('├─────────────────────┼────────────────────┼─────────────────────┤');

  scenarios.forEach(scenario => {
    const n8nComplexity = scenario.accounts <= 10 ? `${scenario.accounts} Gmail nodes` : '❌ Unmanageable';
    const jsComplexity = '1 dynamic endpoint';
    
    console.log(`│ ${scenario.accounts.toString().padEnd(3)} accounts (${scenario.description.padEnd(10)}) │ ${n8nComplexity.padEnd(18)} │ ${jsComplexity.padEnd(19)} │`);
  });

  console.log('└─────────────────────┴────────────────────┴─────────────────────┘');

  console.log('\n🚀 JavaScript Advantages:');
  console.log('• Single codebase handles unlimited accounts');
  console.log('• Clients can self-setup Gmail authentication');
  console.log('• No n8n server dependency');
  console.log('• Standard Node.js error handling');
  console.log('• Direct database integration');
  console.log('• Built-in rate limiting and retry logic');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--scalability')) {
    await compareScalability();
  } else {
    await demonstrateMultiSenderSystem();
    await compareScalability();
  }
  
  console.log('\n💡 Ready to implement this in your production system!');
  console.log('   Next: Set up real Gmail App Passwords and test with actual emails');
}

main().catch(console.error);