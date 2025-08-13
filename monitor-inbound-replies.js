const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk';

const supabase = createClient(supabaseUrl, supabaseKey);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

async function checkRecentInboundEmails() {
  console.log(`\n${colors.blue}${colors.bright}📥 CHECKING RECENT INBOUND EMAILS${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    // Get emails from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: inboundMessages, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .gte('received_at', oneHourAgo)
      .order('received_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error(`${colors.red}❌ Error fetching messages:${colors.reset}`, error);
      return;
    }
    
    if (!inboundMessages || inboundMessages.length === 0) {
      console.log(`${colors.yellow}⚠️  No inbound emails found in the last hour${colors.reset}`);
      console.log('\nPossible reasons:');
      console.log('1. SendGrid Inbound Parse webhook not configured');
      console.log('2. MX records not set up for your domain');
      console.log('3. Reply sent to wrong email address');
      console.log('4. Webhook not receiving the data');
      return;
    }
    
    console.log(`${colors.green}✅ Found ${inboundMessages.length} inbound email(s)!${colors.reset}\n`);
    
    inboundMessages.forEach((msg, index) => {
      console.log(`${colors.bright}📧 Email #${index + 1}:${colors.reset}`);
      console.log(`   ${colors.blue}From:${colors.reset} ${msg.contact_email}`);
      console.log(`   ${colors.blue}To:${colors.reset} ${msg.sender_email}`);
      console.log(`   ${colors.blue}Subject:${colors.reset} ${msg.subject}`);
      console.log(`   ${colors.blue}Received:${colors.reset} ${new Date(msg.received_at).toLocaleString()}`);
      console.log(`   ${colors.blue}Message ID:${colors.reset} ${msg.message_id}`);
      console.log(`   ${colors.blue}Conversation ID:${colors.reset} ${msg.conversation_id}`);
      
      if (msg.body_text) {
        const preview = msg.body_text.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   ${colors.blue}Preview:${colors.reset} "${preview}${msg.body_text.length > 100 ? '...' : ''}"`);
      }
      
      console.log('   ' + '-'.repeat(45));
    });
    
    return inboundMessages;
    
  } catch (error) {
    console.error(`${colors.red}❌ Failed to check messages:${colors.reset}`, error);
  }
}

async function checkConversationThreads() {
  console.log(`\n${colors.magenta}${colors.bright}🧵 CHECKING CONVERSATION THREADS${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: threads, error } = await supabase
      .from('inbox_threads')
      .select('*')
      .gte('last_message_at', oneHourAgo)
      .order('last_message_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error(`${colors.red}❌ Error fetching threads:${colors.reset}`, error);
      return;
    }
    
    if (!threads || threads.length === 0) {
      console.log(`${colors.yellow}⚠️  No active threads in the last hour${colors.reset}`);
      return;
    }
    
    console.log(`${colors.green}✅ Found ${threads.length} active thread(s)!${colors.reset}\n`);
    
    for (const thread of threads) {
      console.log(`${colors.bright}🔗 Thread: ${thread.conversation_id}${colors.reset}`);
      console.log(`   ${colors.blue}Contact:${colors.reset} ${thread.contact_email}`);
      console.log(`   ${colors.blue}Subject:${colors.reset} ${thread.subject}`);
      console.log(`   ${colors.blue}Last Activity:${colors.reset} ${new Date(thread.last_message_at).toLocaleString()}`);
      console.log(`   ${colors.blue}Status:${colors.reset} ${thread.status}`);
      
      // Get messages in this thread
      const { data: messages } = await supabase
        .from('inbox_messages')
        .select('direction, sent_at, body_text')
        .eq('conversation_id', thread.conversation_id)
        .order('sent_at', { ascending: false })
        .limit(3);
      
      if (messages && messages.length > 0) {
        console.log(`   ${colors.blue}Recent Messages:${colors.reset}`);
        messages.forEach(msg => {
          const icon = msg.direction === 'outbound' ? '➡️' : '⬅️';
          const preview = msg.body_text?.substring(0, 50).replace(/\n/g, ' ') || '';
          console.log(`      ${icon} ${new Date(msg.sent_at).toLocaleTimeString()} - ${preview}...`);
        });
      }
      
      console.log('   ' + '-'.repeat(45));
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Failed to check threads:${colors.reset}`, error);
  }
}

async function checkWebhookLogs() {
  console.log(`\n${colors.yellow}${colors.bright}🔍 WEBHOOK DIAGNOSTICS${colors.reset}`);
  console.log('=' .repeat(50));
  
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  
  try {
    const webhookUrl = 'http://localhost:3000/api/webhooks/sendgrid';
    const response = await fetch(webhookUrl, { method: 'GET' });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✅ Webhook endpoint is active${colors.reset}`);
      console.log(`   ${colors.blue}URL:${colors.reset} ${webhookUrl}`);
      console.log(`   ${colors.blue}Status:${colors.reset} ${data.status}`);
      console.log(`   ${colors.blue}Method:${colors.reset} ${data.method}`);
      console.log(`   ${colors.blue}Provider:${colors.reset} ${data.provider}`);
    } else {
      console.log(`${colors.red}❌ Webhook endpoint not accessible${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Cannot reach webhook (server might not be running)${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}📝 SendGrid Inbound Parse Setup:${colors.reset}`);
  console.log('1. Go to: https://app.sendgrid.com/settings/parse');
  console.log('2. Your webhook should be configured as:');
  console.log(`   ${colors.blue}Host:${colors.reset} reply.leadsup.io (or your subdomain)`);
  console.log(`   ${colors.blue}URL:${colors.reset} https://your-domain.com/api/webhooks/sendgrid`);
  console.log('3. MX Record should point to: mx.sendgrid.net');
  console.log('4. Check "POST the raw, full MIME message"');
}

async function monitorRealTime() {
  console.log(`\n${colors.bright}${colors.green}🔄 STARTING REAL-TIME MONITORING${colors.reset}`);
  console.log('Watching for new inbound emails... (Press Ctrl+C to stop)\n');
  
  let lastCheckTime = new Date().toISOString();
  
  const checkInterval = setInterval(async () => {
    try {
      const { data: newMessages } = await supabase
        .from('inbox_messages')
        .select('*')
        .eq('direction', 'inbound')
        .gt('received_at', lastCheckTime)
        .order('received_at', { ascending: false });
      
      if (newMessages && newMessages.length > 0) {
        console.log(`\n${colors.green}${colors.bright}🎉 NEW REPLY RECEIVED!${colors.reset}`);
        newMessages.forEach(msg => {
          console.log(`   ${colors.blue}From:${colors.reset} ${msg.contact_email}`);
          console.log(`   ${colors.blue}Subject:${colors.reset} ${msg.subject}`);
          console.log(`   ${colors.blue}Time:${colors.reset} ${new Date(msg.received_at).toLocaleTimeString()}`);
          const preview = msg.body_text?.substring(0, 100).replace(/\n/g, ' ') || '';
          console.log(`   ${colors.blue}Message:${colors.reset} "${preview}..."`);
          console.log('   ' + '-'.repeat(45));
        });
        
        lastCheckTime = new Date().toISOString();
      }
    } catch (error) {
      // Silent fail to keep monitoring
    }
  }, 5000); // Check every 5 seconds
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Stopping monitor...${colors.reset}`);
    clearInterval(checkInterval);
    process.exit(0);
  });
}

async function main() {
  console.clear();
  console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}       📧 INBOUND EMAIL REPLY MONITOR${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  // Check recent inbound emails
  const inboundMessages = await checkRecentInboundEmails();
  
  // Check conversation threads
  await checkConversationThreads();
  
  // Check webhook status
  await checkWebhookLogs();
  
  // If no messages found, start monitoring
  if (!inboundMessages || inboundMessages.length === 0) {
    console.log(`\n${colors.yellow}${colors.bright}⏳ No replies found yet. Starting real-time monitor...${colors.reset}`);
    await monitorRealTime();
  } else {
    console.log(`\n${colors.green}${colors.bright}✅ Your reply should be captured above!${colors.reset}`);
    console.log('\nOptions:');
    console.log('1. Run this script again to check for new replies');
    console.log('2. Run with --monitor flag for real-time monitoring');
    
    if (process.argv.includes('--monitor')) {
      await monitorRealTime();
    }
  }
}

// Run the monitor
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});