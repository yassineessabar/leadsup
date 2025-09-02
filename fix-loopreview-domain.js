const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
);

async function fixLoopreviewDomain() {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not set');
    return;
  }

  console.log('🔧 Fixing loopreview.io domain authentication...');
  
  const DOMAIN_ID = 27377626; // loopreview.io domain ID from SendGrid
  
  try {
    // 1. Try to validate the existing domain authentication
    console.log(`✅ Validating domain authentication for loopreview.io (ID: ${DOMAIN_ID})`);
    
    const validateResponse = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${DOMAIN_ID}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (validateResponse.ok) {
      const validationResult = await validateResponse.json();
      console.log('🔍 Validation result:', JSON.stringify(validationResult, null, 2));
      
      if (validationResult.valid) {
        console.log('✅ Domain authentication is now VALID!');
        
        // 2. Now that domain is validated, delete and recreate sender identities so they auto-verify
        console.log('🔄 Re-creating sender identities to trigger auto-verification...');
        
        const sendersToProcess = [
          'hello@loopreview.io',
          'contact@loopreview.io', 
          'info@loopreview.io'
        ];
        
        for (const senderEmail of sendersToProcess) {
          try {
            // Get current sender ID
            const getResponse = await fetch('https://api.sendgrid.com/v3/verified_senders', {
              headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (getResponse.ok) {
              const senders = await getResponse.json();
              const existingSender = senders.results?.find(s => s.from_email === senderEmail);
              
              if (existingSender) {
                console.log(`🗑️ Deleting existing sender identity: ${senderEmail} (ID: ${existingSender.id})`);
                
                // Delete existing sender
                await fetch(`https://api.sendgrid.com/v3/verified_senders/${existingSender.id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                console.log(`✅ Deleted ${senderEmail}`);
              }
            }
            
            // Wait a bit before recreating
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Create new sender identity (should auto-verify since domain is authenticated)
            console.log(`🆔 Creating new sender identity: ${senderEmail}`);
            
            const createResponse = await fetch('https://api.sendgrid.com/v3/verified_senders', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                nickname: `LeadsUp - ${senderEmail}`,
                from_email: senderEmail,
                from_name: senderEmail.split('@')[0],
                reply_to: senderEmail,
                reply_to_name: senderEmail.split('@')[0],
                address: '123 Main Street',
                city: 'New York',
                state: 'NY',
                zip: '10001',
                country: 'US'
              })
            });
            
            if (createResponse.ok) {
              const createResult = await createResponse.json();
              console.log(`✅ Created ${senderEmail} - Verified: ${createResult.verified}`);
              
              // Update our database
              await supabase
                .from('sender_accounts')
                .update({
                  sendgrid_sender_id: createResult.id.toString(),
                  sendgrid_status: createResult.verified ? 'verified' : 'pending',
                  updated_at: new Date().toISOString()
                })
                .eq('email', senderEmail);
                
              console.log(`✅ Updated database for ${senderEmail}`);
            } else {
              const errorData = await createResponse.json().catch(() => ({}));
              console.log(`❌ Failed to create ${senderEmail}:`, errorData);
            }
            
          } catch (senderError) {
            console.log(`❌ Error processing ${senderEmail}:`, senderError.message);
          }
        }
        
        // 3. Setup inbound parse now that domain is validated
        console.log('📧 Setting up inbound parse...');
        
        const parseResponse = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            hostname: 'reply.loopreview.io',
            url: 'https://app.leadsup.io/api/webhooks/sendgrid',
            spam_check: true,
            send_raw: false
          })
        });
        
        if (parseResponse.ok) {
          const parseResult = await parseResponse.json();
          console.log('✅ Inbound parse configured for reply.loopreview.io');
          
          // Update database
          await supabase
            .from('domains')
            .update({
              inbound_parse_configured: true,
              inbound_parse_hostname: 'reply.loopreview.io',
              inbound_parse_webhook_id: parseResult.id,
              updated_at: new Date().toISOString()
            })
            .eq('domain', 'loopreview.io');
            
        } else {
          const parseError = await parseResponse.json().catch(() => ({}));
          if (parseError.errors?.[0]?.message?.includes('duplicate entry')) {
            console.log('✅ Inbound parse already configured');
          } else {
            console.log('❌ Inbound parse failed:', parseError);
          }
        }
        
      } else {
        console.log('❌ Domain validation failed:', validationResult.validation_results);
        console.log('💡 Check DNS records for loopreview.io');
      }
    } else {
      const error = await validateResponse.json().catch(() => ({}));
      console.log('❌ Validation request failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Error fixing loopreview domain:', error);
  }
}

fixLoopreviewDomain();