const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTestContacts() {
  try {
    console.log('🔍 Looking for campaigns...')
    
    // Get the first campaign
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status, user_id')
      .limit(1)
    
    if (campaignError || !campaigns || campaigns.length === 0) {
      console.error('❌ No campaigns found:', campaignError)
      return
    }
    
    const campaign = campaigns[0]
    console.log(`✅ Found campaign: "${campaign.name}" (Status: ${campaign.status})`)
    
    // Check for existing sequences
    const { data: sequences, error: sequenceError } = await supabase
      .from('campaign_sequences')
      .select('step_number, subject, timing_days')
      .eq('campaign_id', campaign.id)
      .order('step_number')
    
    if (sequenceError) {
      console.error('❌ Error checking sequences:', sequenceError)
    } else {
      console.log(`📧 Campaign has ${sequences?.length || 0} email sequences:`)
      sequences?.forEach(seq => {
        console.log(`   Step ${seq.step_number}: "${seq.subject}" (${seq.timing_days} days)`)
      })
    }
    
    // Create three test contacts using the correct schema
    const testContacts = [
      {
        campaign_id: campaign.id,
        user_id: campaign.user_id,
        email: 'john.doe@testcompany.com',
        first_name: 'John',
        last_name: 'Doe',
        company: 'Test Company Inc',
        title: 'Software Engineer',
        email_status: 'Valid',
        privacy: 'Normal',
        location: 'San Francisco, CA',
        industry: 'Technology',
        note: 'Test contact for auto-scheduling feature',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        campaign_id: campaign.id,
        user_id: campaign.user_id,
        email: 'jane.smith@innovatecorp.com',
        first_name: 'Jane',
        last_name: 'Smith',
        company: 'Innovate Corp',
        title: 'Marketing Manager',
        email_status: 'Valid',
        privacy: 'Normal',
        location: 'New York, NY',
        industry: 'Marketing',
        note: 'Test contact for auto-scheduling feature',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        campaign_id: campaign.id,
        user_id: campaign.user_id,
        email: 'mike.wilson@techstartup.io',
        first_name: 'Mike',
        last_name: 'Wilson',
        company: 'Tech Startup',
        title: 'CEO',
        email_status: 'Valid',
        privacy: 'Normal',
        location: 'Los Angeles, CA',
        industry: 'Technology',
        note: 'Test contact for auto-scheduling feature',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
    
    console.log('📝 Creating test contacts...')
    
    const { data: insertedContacts, error: insertError } = await supabase
      .from('contacts')
      .insert(testContacts)
      .select()
    
    if (insertError) {
      console.error('❌ Error creating contacts:', insertError)
      return
    }
    
    console.log('✅ Successfully created 3 test contacts:')
    insertedContacts?.forEach(contact => {
      console.log(`   📧 ${contact.email} (${contact.first_name} ${contact.last_name})`)
    })
    
    // If campaign is active, show what would happen with auto-scheduling
    if (campaign.status === 'Active') {
      console.log('\n🔄 Campaign is ACTIVE - Auto-scheduling would trigger if these were added via API:')
      if (sequences && sequences.length > 0) {
        const totalScheduled = insertedContacts.length * sequences.length
        console.log(`   📅 ${totalScheduled} emails would be scheduled (${insertedContacts.length} contacts × ${sequences.length} sequences)`)
        console.log('   📧 Each contact would get:')
        sequences.forEach(seq => {
          if (seq.timing_days === 0) {
            console.log(`      - Email ${seq.step_number}: Immediate (5 min from now)`)
          } else {
            console.log(`      - Email ${seq.step_number}: ${seq.timing_days} days from now`)
          }
        })
      } else {
        console.log('   ℹ️ No sequences configured - no emails would be scheduled')
      }
    } else {
      console.log(`\nℹ️ Campaign is ${campaign.status} - Auto-scheduling would NOT trigger`)
    }
    
    // Show final state
    console.log('\n📊 Current state:')
    const { data: allContacts } = await supabase
      .from('contacts')
      .select('email, first_name, last_name, email_status')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log(`   ${allContacts?.length || 0} total contacts in campaign`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createTestContacts()