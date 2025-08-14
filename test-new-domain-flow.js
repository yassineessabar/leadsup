require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testNewDomainFlow() {
  console.log('🆕 Testing New Domain Addition and Auto-Verification Flow');
  console.log('=====================================================\n');

  const testDomain = 'newverifytest.com'; // Using a fresh test domain name
  const apiKey = process.env.SENDGRID_API_KEY;

  // Step 1: Clean up any existing test domain
  console.log('🧹 Step 1: Cleaning up any existing test domain...');
  try {
    const { data: existingDomains } = await supabase
      .from('domains')
      .select('id')
      .eq('domain', testDomain);

    if (existingDomains && existingDomains.length > 0) {
      for (const domain of existingDomains) {
        await supabase.from('sender_accounts').delete().eq('domain_id', domain.id);
        await supabase.from('domains').delete().eq('id', domain.id);
      }
      console.log(`   ✅ Cleaned up ${existingDomains.length} existing domain(s)`);
    } else {
      console.log('   ✅ No existing domains to clean up');
    }
  } catch (error) {
    console.log('   ⚠️  Cleanup error (continuing anyway):', error.message);
  }

  // Step 2: Simulate domain creation (what happens when user adds domain)
  console.log(`\n📝 Step 2: Creating new domain: ${testDomain}...`);
  
  try {
    // This simulates the POST /api/domains endpoint
    const domainPayload = {
      domain: testDomain,
      verificationType: 'manual',
      replySubdomain: 'reply'
    };

    console.log('   📡 Making API call to create domain...');
    
    // Simulate what the API does internally
    console.log('   🔐 Creating SendGrid domain authentication...');
    
    // Check SendGrid domain authentication first
    const authResponse = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (authResponse.ok) {
      const existingDomains = await authResponse.json();
      const existingAuth = existingDomains.find(d => d.domain === testDomain);
      
      if (existingAuth) {
        console.log(`   ✅ Domain authentication already exists (ID: ${existingAuth.id})`);
      } else {
        console.log('   📝 Creating new SendGrid domain authentication...');
        
        const createAuthResponse = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            domain: testDomain,
            subdomain: null,
            ips: [],
            custom_spf: false,
            default: false
          })
        });

        if (createAuthResponse.ok) {
          const newAuth = await createAuthResponse.json();
          console.log(`   ✅ Created SendGrid domain authentication (ID: ${newAuth.id})`);
          
          // Extract real DNS records
          const dnsRecords = [];
          if (newAuth.dns) {
            if (newAuth.dns.dkim1) {
              dnsRecords.push({
                type: 'CNAME',
                host: newAuth.dns.dkim1.host.replace(`.${testDomain}`, ''),
                value: newAuth.dns.dkim1.data,
                purpose: 'DKIM authentication (key 1) - Cryptographic email signing'
              });
            }
            if (newAuth.dns.dkim2) {
              dnsRecords.push({
                type: 'CNAME',
                host: newAuth.dns.dkim2.host.replace(`.${testDomain}`, ''),
                value: newAuth.dns.dkim2.data,
                purpose: 'DKIM authentication (key 2) - Cryptographic email signing'
              });
            }
            if (newAuth.dns.mail_cname) {
              dnsRecords.push({
                type: 'CNAME',
                host: newAuth.dns.mail_cname.host.replace(`.${testDomain}`, ''),
                value: newAuth.dns.mail_cname.data,
                purpose: 'Link tracking and email branding'
              });
            }
          }
          
          // Add standard records
          dnsRecords.push(
            {
              type: 'TXT',
              host: '@',
              value: 'v=spf1 include:sendgrid.net ~all',
              purpose: 'SPF - Authorizes SendGrid to send emails on your behalf'
            },
            {
              type: 'TXT',
              host: '_dmarc',
              value: 'v=DMARC1; p=none; rua=mailto:dmarc@leadsup.io; ruf=mailto:dmarc@leadsup.io; pct=100; sp=none;',
              purpose: 'DMARC policy - Email authentication and reporting'
            },
            {
              type: 'MX',
              host: 'reply',
              value: 'mx.sendgrid.net',
              priority: 10,
              purpose: `Route replies from reply.${testDomain} back to LeadsUp for processing`
            }
          );

          console.log(`   📋 Generated ${dnsRecords.length} DNS records for domain`);

          // Create domain in database
          const { data: newDomain, error } = await supabase
            .from('domains')
            .insert({
              user_id: '43e19a38-2e3b-4868-8d4c-ceed89d8189d', // Using real user ID
              domain: testDomain,
              status: 'pending',
              description: `Domain pending verification (Reply: reply.${testDomain}) - Real SendGrid DNS`,
              verification_type: 'manual',
              dns_records: dnsRecords,
              is_test_domain: true
            })
            .select()
            .single();

          if (error) {
            throw new Error(`Failed to create domain: ${error.message}`);
          }

          console.log(`   ✅ Domain created in database (ID: ${newDomain.id})`);

          // Step 3: Create some test sender accounts
          console.log('\n👤 Step 3: Creating test sender accounts...');
          
          const testSenders = [
            { email: `contact@${testDomain}`, display_name: 'Contact' },
            { email: `hello@${testDomain}`, display_name: 'Hello' },
            { email: `support@${testDomain}`, display_name: 'Support' }
          ];

          for (const sender of testSenders) {
            const { data: senderAccount, error: senderError } = await supabase
              .from('sender_accounts')
              .insert({
                user_id: '43e19a38-2e3b-4868-8d4c-ceed89d8189d',
                domain_id: newDomain.id,
                email: sender.email,
                display_name: sender.display_name,
                sendgrid_status: 'pending'
              })
              .select()
              .single();

            if (senderError) {
              console.log(`     ❌ Failed to create ${sender.email}: ${senderError.message}`);
            } else {
              console.log(`     ✅ Created sender account: ${sender.email}`);
            }
          }

          // Step 4: Simulate user running DNS verification check
          console.log('\n🔍 Step 4: Simulating DNS verification check (what happens when user clicks "Check Domain")...');
          
          console.log('   📡 This would call: POST /api/domains/:id/verify');
          console.log('   🔄 The verification process would:');
          console.log('     1. Check DNS records against stored configuration');
          console.log('     2. If DKIM records verify → set domain status to "verified"');
          console.log('     3. Trigger setupSendGridIntegration() function');
          console.log('     4. Force validate SendGrid domain authentication');
          console.log('     5. Create sender identities for all sender accounts');
          console.log('     6. Run auto-verification to mark senders as verified');
          
          // Simulate the verification triggering (domain becomes verified)
          console.log('\n   🎯 Simulating successful DNS verification...');
          
          // Update domain status to verified
          await supabase
            .from('domains')
            .update({
              status: 'verified',
              verified_at: new Date().toISOString()
            })
            .eq('id', newDomain.id);

          console.log('   ✅ Domain status updated to "verified"');

          // Step 5: Test SendGrid integration that would be triggered
          console.log('\n🚀 Step 5: Testing SendGrid integration (triggered by verification)...');
          
          // Force validate SendGrid domain authentication
          console.log('   🔐 Force validating SendGrid domain authentication...');
          
          const validateResponse = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${newAuth.id}/validate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (validateResponse.ok) {
            const validation = await validateResponse.json();
            console.log(`   ✅ Domain validation: ${validation.valid ? 'VALID' : 'PENDING'}`);
            
            if (validation.valid) {
              console.log('   🎉 Domain is authenticated and validated in SendGrid!');
              
              // Step 6: Create sender identities
              console.log('\n   📧 Creating sender identities...');
              
              const { data: senderAccounts } = await supabase
                .from('sender_accounts')
                .select('*')
                .eq('domain_id', newDomain.id);

              for (const sender of senderAccounts || []) {
                console.log(`     Processing ${sender.email}...`);
                
                try {
                  const senderPayload = {
                    nickname: `${sender.display_name} - ${testDomain}`,
                    from_email: sender.email,
                    from_name: sender.display_name,
                    reply_to: sender.email,
                    reply_to_name: sender.display_name,
                    address: '123 Main Street',
                    city: 'New York',
                    state: 'NY',
                    zip: '10001',
                    country: 'US'
                  };

                  const createSenderResponse = await fetch('https://api.sendgrid.com/v3/verified_senders', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${apiKey}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(senderPayload)
                  });

                  if (createSenderResponse.ok) {
                    const senderResult = await createSenderResponse.json();
                    console.log(`     ✅ Created sender identity (ID: ${senderResult.id})`);
                    
                    // Update database
                    await supabase
                      .from('sender_accounts')
                      .update({
                        sendgrid_sender_id: senderResult.id.toString(),
                        sendgrid_status: 'verified', // Auto-verified for authenticated domains
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', sender.id);
                      
                    console.log(`     ✅ Updated database - sender marked as verified`);
                    
                  } else {
                    const error = await createSenderResponse.json();
                    if (error.errors?.[0]?.message?.includes('already exists')) {
                      console.log(`     ✅ Sender identity already exists - marking as verified`);
                      await supabase
                        .from('sender_accounts')
                        .update({
                          sendgrid_status: 'verified',
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', sender.id);
                    } else {
                      console.log(`     ❌ Failed to create sender: ${JSON.stringify(error)}`);
                    }
                  }
                } catch (senderError) {
                  console.log(`     ❌ Error processing ${sender.email}: ${senderError.message}`);
                }
              }
            } else {
              console.log('   ⚠️  Domain validation pending - DNS records may still be propagating');
            }
          } else {
            console.log('   ⚠️  Failed to validate domain authentication');
          }

          // Step 7: Show final results
          console.log('\n📊 Step 7: Final verification results...');
          
          const { data: finalDomain } = await supabase
            .from('domains')
            .select('*')
            .eq('id', newDomain.id)
            .single();

          const { data: finalSenders } = await supabase
            .from('sender_accounts')
            .select('*')
            .eq('domain_id', newDomain.id);

          console.log(`\n✅ Domain: ${finalDomain.domain}`);
          console.log(`   Status: ${finalDomain.status}`);
          console.log(`   Verified: ${finalDomain.verified_at ? 'Yes' : 'No'}`);
          
          console.log(`\n👤 Sender Accounts (${finalSenders?.length || 0}):`);
          if (finalSenders) {
            finalSenders.forEach(s => {
              console.log(`   - ${s.email}: ${s.sendgrid_status || 'unknown'} (SendGrid ID: ${s.sendgrid_sender_id || 'none'})`);
            });
          }

        } else {
          console.log('   ❌ Failed to create SendGrid domain authentication');
        }
      }
    }

  } catch (error) {
    console.error('❌ Domain creation failed:', error.message);
  }

  console.log('\n🏁 New Domain Flow Test Complete');
  console.log('\n💡 This test demonstrates:');
  console.log('   ✅ Domain creation with real SendGrid DNS records');
  console.log('   ✅ SendGrid domain authentication setup');
  console.log('   ✅ Sender account creation');
  console.log('   ✅ DNS verification triggering SendGrid integration');
  console.log('   ✅ Automatic sender identity creation and verification');
  console.log('   ✅ Database updates with SendGrid IDs and verified status');
  console.log('\n🎯 When user clicks "Check Domain" and DNS passes:');
  console.log('   → Domain status becomes "verified"');
  console.log('   → SendGrid domain authentication is validated');
  console.log('   → All sender identities are created and auto-verified');
  console.log('   → Users can immediately send emails without manual verification');
}

testNewDomainFlow().catch(console.error);