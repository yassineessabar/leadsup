const { createClient } = require('@supabase/supabase-js');

// Import the SendGrid functions dynamically since we're using ES modules
async function importSendGrid() {
  const sgMail = require('@sendgrid/mail');
  
  // Helper to get SendGrid API key
  function getSendGridApiKey() {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }
    return SENDGRID_API_KEY;
  }

  // Configure inbound parse
  async function configureInboundParse(settings) {
    const SENDGRID_API_KEY = getSendGridApiKey();
    
    const response = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hostname: settings.hostname,
        url: settings.url,
        spam_check: settings.spam_check ?? true,
        send_raw: settings.send_raw ?? false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle duplicate entry as success
      if (response.status === 400 && errorData.errors?.[0]?.message?.includes('duplicate entry')) {
        return {
          success: true,
          hostname: settings.hostname,
          message: 'Inbound parse already configured'
        };
      }
      
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      hostname: settings.hostname,
      webhook_id: result.id,
      result
    };
  }

  // Get sender identities
  async function getSenderIdentities() {
    const SENDGRID_API_KEY = getSendGridApiKey();
    
    const response = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      method: 'GET',
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
    
    return {
      success: true,
      senders: result.results || []
    };
  }

  // Create sender identity
  async function createSenderIdentity(settings) {
    const SENDGRID_API_KEY = getSendGridApiKey();
    
    const payload = {
      nickname: settings.nickname,
      from_email: settings.from.email,
      from_name: settings.from.name || settings.from.email.split('@')[0],
      reply_to: settings.reply_to?.email || settings.from.email,
      reply_to_name: settings.reply_to?.name || settings.from.name || settings.from.email.split('@')[0],
      address: settings.address,
      city: settings.city,
      country: settings.country
    };
    
    if (settings.address_2) payload.address_2 = settings.address_2;
    if (settings.state) payload.state = settings.state;
    if (settings.zip) payload.zip = settings.zip;
    
    const response = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle "already exists" as success
      if (response.status === 400 && errorData.errors?.[0]?.message?.includes('already exists')) {
        return {
          success: true,
          error: null,
          message: 'Sender identity already exists',
          sender_id: null,
          verification_status: 'verified'
        };
      }
      
      throw new Error(`SendGrid API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    const isAutoVerified = result.verified === true;
    
    return {
      success: true,
      sender_id: result.id,
      verification_status: isAutoVerified ? 'verified' : 'pending',
      result
    };
  }

  return { createSenderIdentity, configureInboundParse, getSenderIdentities };
}

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function fixVerifiedDomains() {
  try {
    console.log('🔧 Fixing verified domains missing SendGrid configuration...');
    
    // Import SendGrid functions
    const { createSenderIdentity, configureInboundParse, getSenderIdentities } = await importSendGrid();
    
    // Get all verified domains that don't have inbound parse configured
    const { data: domains, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('status', 'verified')
      .eq('inbound_parse_configured', false);
    
    if (domainError) {
      console.error('❌ Error fetching domains:', domainError);
      return;
    }
    
    console.log(`📋 Found ${domains?.length || 0} verified domains missing inbound parse`);
    
    for (const domain of domains || []) {
      console.log(`\n🔧 Processing domain: ${domain.domain}`);
      
      // 1. Setup inbound parse
      try {
        console.log(`📧 Setting up inbound parse for ${domain.domain}...`);
        
        const parseResult = await configureInboundParse({
          hostname: `reply.${domain.domain}`,
          url: 'https://app.leadsup.io/api/webhooks/sendgrid',
          spam_check: true,
          send_raw: false
        });
        
        if (parseResult.success) {
          console.log(`✅ Inbound parse configured for ${domain.domain}`);
          
          // Update domain record
          await supabase
            .from('domains')
            .update({
              inbound_parse_configured: true,
              inbound_parse_hostname: `reply.${domain.domain}`,
              inbound_parse_webhook_id: parseResult.webhook_id || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', domain.id);
            
          console.log(`✅ Domain record updated for ${domain.domain}`);
        }
      } catch (parseError) {
        console.log(`⚠️ Inbound parse setup failed for ${domain.domain}: ${parseError.message}`);
        
        // Handle "already exists" as success
        if (parseError.message?.includes('duplicate entry')) {
          console.log(`✅ Inbound parse already exists for ${domain.domain}`);
          
          await supabase
            .from('domains')
            .update({
              inbound_parse_configured: true,
              inbound_parse_hostname: `reply.${domain.domain}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', domain.id);
        }
      }
      
      // 2. Get sender accounts for this domain and verify them
      try {
        console.log(`🔍 Getting sender accounts for ${domain.domain}...`);
        
        const { data: senderAccounts, error: senderError } = await supabase
          .from('sender_accounts')
          .select('*')
          .eq('domain_id', domain.id);
        
        if (senderError) {
          console.error(`❌ Error fetching sender accounts for ${domain.domain}:`, senderError);
          continue;
        }
        
        console.log(`📧 Found ${senderAccounts?.length || 0} sender accounts for ${domain.domain}`);
        
        // Get existing SendGrid identities
        const identitiesResult = await getSenderIdentities();
        const existingIdentities = identitiesResult.senders;
        
        for (const sender of senderAccounts || []) {
          console.log(`  Processing sender: ${sender.email}`);
          
          // Check if identity already exists in SendGrid
          const existingIdentity = existingIdentities.find(identity => 
            identity.from_email === sender.email
          );
          
          if (existingIdentity) {
            console.log(`  ✅ Identity exists in SendGrid for ${sender.email} - Status: ${existingIdentity.verified ? 'verified' : 'pending'}`);
            
            // Update our database to reflect SendGrid status
            await supabase
              .from('sender_accounts')
              .update({
                sendgrid_sender_id: existingIdentity.id.toString(),
                sendgrid_status: existingIdentity.verified ? 'verified' : 'pending',
                sendgrid_created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', sender.id);
              
            console.log(`  ✅ Updated database status for ${sender.email}`);
          } else {
            console.log(`  🆔 Creating new SendGrid identity for ${sender.email}`);
            
            try {
              const identityResult = await createSenderIdentity({
                nickname: `LeadsUp - ${sender.email}`,
                from: {
                  email: sender.email,
                  name: sender.display_name || sender.email.split('@')[0]
                },
                reply_to: {
                  email: sender.email,
                  name: sender.display_name || sender.email.split('@')[0]
                },
                address: "123 Business St",
                city: "Business City",
                state: "CA",
                zip: "12345",
                country: "United States"
              });
              
              if (identityResult.success) {
                console.log(`  ✅ Created SendGrid identity for ${sender.email}`);
                
                await supabase
                  .from('sender_accounts')
                  .update({
                    sendgrid_sender_id: identityResult.sender_id,
                    sendgrid_status: identityResult.verification_status || 'verified',
                    sendgrid_created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sender.id);
                  
                console.log(`  ✅ Updated database for ${sender.email}`);
              }
            } catch (createError) {
              console.log(`  ❌ Failed to create identity for ${sender.email}: ${createError.message}`);
              
              if (createError.message?.includes('already exists')) {
                console.log(`  ✅ Identity already exists for ${sender.email}`);
                
                await supabase
                  .from('sender_accounts')
                  .update({
                    sendgrid_status: 'verified',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sender.id);
              }
            }
          }
        }
      } catch (senderError) {
        console.error(`❌ Error processing senders for ${domain.domain}:`, senderError);
      }
    }
    
    console.log('\n✅ Domain fix process completed!');
    
  } catch (error) {
    console.error('❌ Error in fix process:', error);
  }
}

fixVerifiedDomains();