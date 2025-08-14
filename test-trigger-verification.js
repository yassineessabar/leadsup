require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function triggerVerificationForDomain() {
  console.log('🚀 Triggering Verification Process for Test Domain');
  console.log('===============================================\n');

  // Get leadsup.io domain (it's verified and has DNS records)
  const { data: domains } = await supabase
    .from('domains')
    .select('*')
    .eq('domain', 'leadsup.io')
    .limit(1);
    
  if (!domains || domains.length === 0) {
    console.log('❌ leadsup.io domain not found');
    return;
  }

  const domain = domains[0];
  console.log(`🎯 Found domain: ${domain.domain} (Status: ${domain.status})`);

  // Check current sender accounts
  const { data: beforeSenders } = await supabase
    .from('sender_accounts')
    .select('*')
    .eq('domain_id', domain.id);

  console.log(`\n👤 Current sender accounts (${beforeSenders?.length || 0}):`);
  if (beforeSenders) {
    beforeSenders.forEach(sender => {
      console.log(`  - ${sender.email}: ${sender.sendgrid_status || 'unknown'} (SendGrid ID: ${sender.sendgrid_sender_id || 'none'})`);
    });
  }

  // Manually call the SendGrid integration function (the part that runs after DNS verification)
  console.log('\n🔧 Manually triggering SendGrid integration...');
  
  try {
    // Import the SendGrid functions
    const sendgridModule = await import('./lib/sendgrid.js');
    const { createSenderIdentity, getDomainAuthentication, validateDomainAuthentication } = sendgridModule;
    
    console.log('✅ SendGrid module loaded');

    // Step 1: Check domain authentication status
    console.log(`\n🔐 Step 1: Checking domain authentication for ${domain.domain}...`);
    const domainAuth = await getDomainAuthentication(domain.domain);
    
    if (domainAuth.domain) {
      console.log(`✅ Domain authentication exists (ID: ${domainAuth.domain.id})`);
      
      // Validate the domain authentication
      const validation = await validateDomainAuthentication(domainAuth.domain.id);
      console.log(`🔍 Domain validation status: ${validation.valid ? 'VALID' : 'INVALID'}`);
      
      if (validation.valid) {
        console.log('✅ Domain is authenticated and valid in SendGrid');
        
        // Step 2: Create sender identities for all sender accounts
        console.log(`\n📧 Step 2: Creating/updating sender identities...`);
        
        if (beforeSenders && beforeSenders.length > 0) {
          for (const sender of beforeSenders) {
            console.log(`  Processing ${sender.email}...`);
            
            try {
              const result = await createSenderIdentity({
                nickname: `${sender.display_name || sender.email.split('@')[0]} - ${domain.domain}`,
                from: {
                  email: sender.email,
                  name: sender.display_name || sender.email.split('@')[0]
                },
                reply_to: {
                  email: sender.email,
                  name: sender.display_name || sender.email.split('@')[0]
                },
                address: '123 Main Street',
                city: 'New York',
                state: 'NY',
                zip: '10001',
                country: 'US'
              });
              
              if (result.success) {
                console.log(`    ✅ Created SendGrid identity (ID: ${result.sender_id})`);
                
                // Update database
                await supabase
                  .from('sender_accounts')
                  .update({
                    sendgrid_sender_id: result.sender_id,
                    sendgrid_status: result.verification_status || 'verified',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sender.id);
                  
                console.log(`    ✅ Updated database record`);
              } else {
                console.log(`    ❌ Failed to create identity: ${result.error}`);
              }
              
            } catch (senderError) {
              if (senderError.message?.includes('already exists')) {
                console.log(`    ✅ Identity already exists - marking as verified`);
                
                await supabase
                  .from('sender_accounts')
                  .update({
                    sendgrid_status: 'verified',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sender.id);
              } else {
                console.log(`    ❌ Error: ${senderError.message}`);
              }
            }
          }
        }
        
        // Step 3: Try auto-verification
        console.log(`\n🔄 Step 3: Running auto-verification...`);
        try {
          const autoVerifyModule = await import('./lib/auto-verify-senders.js');
          const { autoVerifyDomainSenders } = autoVerifyModule;
          
          const verifyResult = await autoVerifyDomainSenders(domain.domain);
          
          if (verifyResult.success) {
            console.log(`✅ Auto-verification completed: ${verifyResult.processed} senders processed`);
          } else {
            console.log(`⚠️  Auto-verification had issues: ${verifyResult.error}`);
          }
        } catch (autoError) {
          console.log(`⚠️  Auto-verification failed: ${autoError.message}`);
        }
        
      } else {
        console.log('⚠️  Domain authentication is not valid - DNS records may not be properly configured');
      }
    } else {
      console.log('❌ No domain authentication found in SendGrid');
    }

  } catch (error) {
    console.error('❌ SendGrid integration failed:', error.message);
  }

  // Check final state
  console.log('\n📊 Final Results:');
  const { data: afterSenders } = await supabase
    .from('sender_accounts')
    .select('*')
    .eq('domain_id', domain.id);

  if (afterSenders) {
    afterSenders.forEach(sender => {
      console.log(`  - ${sender.email}: ${sender.sendgrid_status || 'unknown'} (SendGrid ID: ${sender.sendgrid_sender_id || 'none'})`);
    });
  }

  console.log('\n🏁 Verification Test Complete');
}

triggerVerificationForDomain().catch(console.error);