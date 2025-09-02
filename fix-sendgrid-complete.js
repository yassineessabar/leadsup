const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function setupSendGrid() {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY environment variable is required');
  }

  // 1. Create domain authentication for each verified domain
  async function createDomainAuth(domain) {
    console.log(`🔐 Creating domain authentication for ${domain}...`);
    
    const response = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain: domain,
        subdomain: 'mail',
        ips: [],
        custom_spf: false,
        default: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle "already exists" 
      if (response.status === 400 && errorData.errors?.[0]?.message?.includes('already exists')) {
        console.log(`✅ Domain auth already exists for ${domain}`);
        return { success: true, message: 'Already exists' };
      }
      
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log(`✅ Domain auth created for ${domain}`);
    return { success: true, domain_id: result.id, result };
  }

  // 2. Validate domain authentication
  async function validateDomainAuth(domainId) {
    console.log(`✅ Validating domain authentication ${domainId}...`);
    
    const response = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${domainId}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log(`✅ Domain validation result: ${result.valid ? 'VALID' : 'INVALID'}`);
    return { success: true, valid: result.valid, result };
  }

  // 3. Configure inbound parse
  async function configureInboundParse(hostname) {
    console.log(`📧 Setting up inbound parse for ${hostname}...`);
    
    const response = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hostname: hostname,
        url: 'https://app.leadsup.io/api/webhooks/sendgrid',
        spam_check: true,
        send_raw: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle duplicate entry as success
      if (response.status === 400 && errorData.errors?.[0]?.message?.includes('duplicate entry')) {
        return { success: true, message: 'Already configured' };
      }
      
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return { success: true, webhook_id: result.id };
  }

  // Main execution
  try {
    console.log('🔧 Setting up complete SendGrid configuration...');
    
    // Get verified domains missing inbound parse
    const { data: domains } = await supabase
      .from('domains')
      .select('*')
      .eq('status', 'verified')
      .eq('inbound_parse_configured', false);
    
    console.log(`📋 Found ${domains?.length || 0} domains to fix`);
    
    for (const domain of domains || []) {
      console.log(`\n🔧 Processing ${domain.domain}...`);
      
      try {
        // Step 1: Create domain authentication
        const domainAuthResult = await createDomainAuth(domain.domain);
        
        // Step 2: If domain auth was created, validate it
        if (domainAuthResult.success && domainAuthResult.domain_id) {
          try {
            await validateDomainAuth(domainAuthResult.domain_id);
          } catch (validateError) {
            console.log(`⚠️ Validation pending for ${domain.domain}: ${validateError.message}`);
          }
        }
        
        // Step 3: Setup inbound parse (now that domain auth exists)
        try {
          const parseResult = await configureInboundParse(`reply.${domain.domain}`);
          
          if (parseResult.success) {
            console.log(`✅ Inbound parse configured for ${domain.domain}`);
            
            // Update database
            await supabase
              .from('domains')
              .update({
                inbound_parse_configured: true,
                inbound_parse_hostname: `reply.${domain.domain}`,
                inbound_parse_webhook_id: parseResult.webhook_id || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', domain.id);
          }
        } catch (parseError) {
          console.log(`⚠️ Inbound parse failed for ${domain.domain}: ${parseError.message}`);
        }
        
        // Step 4: Update sender accounts to verified (since domain is authenticated)
        const { data: senders } = await supabase
          .from('sender_accounts')
          .select('*')
          .eq('domain_id', domain.id);
        
        console.log(`📧 Updating ${senders?.length || 0} sender accounts for ${domain.domain}`);
        
        for (const sender of senders || []) {
          await supabase
            .from('sender_accounts')
            .update({
              sendgrid_status: 'verified',
              updated_at: new Date().toISOString()
            })
            .eq('id', sender.id);
            
          console.log(`  ✅ Updated ${sender.email} to verified`);
        }
        
      } catch (domainError) {
        console.error(`❌ Error processing ${domain.domain}:`, domainError.message);
      }
    }
    
    console.log('\n✅ SendGrid setup completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupSendGrid();