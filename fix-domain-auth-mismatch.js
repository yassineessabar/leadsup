const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function fixDomainAuthMismatch() {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not set');
    return;
  }

  console.log('🔧 Fixing domain authentication mismatch...');
  
  const domainsToFix = [
    { domain: 'loopreview.io', sgId: 27377626 },
    { domain: 'localix.fr', sgId: 27314884 }
  ];
  
  for (const { domain, sgId } of domainsToFix) {
    console.log(`\n🔧 Processing ${domain}...`);
    
    try {
      // 1. Delete invalid SendGrid domain authentication
      console.log(`🗑️ Deleting invalid domain auth for ${domain} (ID: ${sgId})`);
      
      const deleteResponse = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${sgId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (deleteResponse.ok) {
        console.log(`✅ Deleted invalid domain auth for ${domain}`);
      } else {
        console.log(`⚠️ Could not delete domain auth: ${deleteResponse.status}`);
      }
      
      // 2. Get our actual DNS records that are working
      const { data: domainData } = await supabase
        .from('domains')
        .select('dns_records')
        .eq('domain', domain)
        .single();
      
      console.log(`📋 Our working DNS records for ${domain}:`);
      domainData?.dns_records?.forEach(record => {
        if (record.type === 'CNAME' && record.purpose?.includes('DKIM')) {
          console.log(`  ${record.host}.${domain} → ${record.value}`);
        }
      });
      
      // 3. Create new domain authentication that matches our DNS
      console.log(`🔐 Creating new domain auth for ${domain} using our DNS records...`);
      
      // For loopreview.io, use em7895 subdomain (which matches leadsup.io pattern)
      const subdomain = domain === 'loopreview.io' ? 'em7895' : 'em1487';
      
      const createResponse = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: domain,
          subdomain: subdomain, // Use our actual subdomain
          ips: [],
          custom_spf: false,
          default: false
        })
      });
      
      if (createResponse.ok) {
        const createResult = await createResponse.json();
        console.log(`✅ Created new domain auth for ${domain} (ID: ${createResult.id})`);
        console.log(`📋 New DNS requirements:`, createResult.dns);
        
        // Try to validate immediately
        setTimeout(async () => {
          try {
            const validateResponse = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${createResult.id}/validate`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (validateResponse.ok) {
              const validationResult = await validateResponse.json();
              console.log(`🔄 Validation for ${domain}: ${validationResult.valid ? 'VALID' : 'PENDING'}`);
              
              if (validationResult.valid) {
                console.log(`✅ ${domain} domain auth is now VALID! Senders should auto-verify.`);
              }
            }
          } catch (validationError) {
            console.log(`⚠️ Validation pending for ${domain}`);
          }
        }, 2000);
        
      } else {
        const createError = await createResponse.json().catch(() => ({}));
        console.log(`❌ Failed to create new domain auth for ${domain}:`, createError);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${domain}:`, error);
    }
  }
  
  console.log('\n✅ Domain authentication fix completed!');
  console.log('💡 You may need to update DNS records to match SendGrid requirements,');
  console.log('💡 or the system should use the DNS records that are already working.');
}

fixDomainAuthMismatch();