const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function checkSendGridStatus() {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not set');
    return;
  }

  console.log('🔍 Checking SendGrid domain authentication status...');
  
  try {
    // 1. Check domain authentication in SendGrid
    const domainsResponse = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (domainsResponse.ok) {
      const domains = await domainsResponse.json();
      console.log(`📋 SendGrid domain authentications: ${domains.length}`);
      
      domains.forEach(domain => {
        console.log(`  ${domain.domain}:`);
        console.log(`    Valid: ${domain.valid}`);
        console.log(`    Legacy: ${domain.legacy}`);
        console.log(`    ID: ${domain.id}`);
      });
    }
    
    // 2. Check sender identities in SendGrid
    const sendersResponse = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (sendersResponse.ok) {
      const senders = await sendersResponse.json();
      console.log(`\n📧 SendGrid sender identities: ${senders.results?.length || 0}`);
      
      senders.results?.forEach(sender => {
        console.log(`  ${sender.from_email}:`);
        console.log(`    Verified: ${sender.verified}`);
        console.log(`    ID: ${sender.id}`);
      });
    }
    
    // 3. Check our database status
    const { data: ourDomains } = await supabase
      .from('domains')
      .select('domain, status, inbound_parse_configured')
      .eq('status', 'verified');
    
    console.log(`\n📊 Our verified domains: ${ourDomains?.length || 0}`);
    ourDomains?.forEach(d => {
      console.log(`  ${d.domain}: inbound_parse_configured=${d.inbound_parse_configured}`);
    });
    
    // 4. Check our sender accounts
    const { data: ourSenders } = await supabase
      .from('sender_accounts')
      .select('email, sendgrid_status, sendgrid_sender_id')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`\n👤 Our sender accounts: ${ourSenders?.length || 0}`);
    ourSenders?.forEach(s => {
      console.log(`  ${s.email}: ${s.sendgrid_status || 'no_status'} (SG ID: ${s.sendgrid_sender_id || 'none'})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking SendGrid status:', error);
  }
}

checkSendGridStatus();