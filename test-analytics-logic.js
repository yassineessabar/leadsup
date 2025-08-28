// Test the analytics logic locally
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testAnalytics() {
  try {
    console.log('🧪 Testing analytics logic...')
    
    // Get active campaigns
    const { data: activeCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('status', 'active')
    
    console.log('📊 Active campaigns:', activeCampaigns?.length || 0)
    
    if (!activeCampaigns?.length) {
      console.log('❌ No active campaigns found')
      return
    }
    
    let analyticsContacts = []
    
    // Test the analytics logic for each campaign
    for (const campaign of activeCampaigns) {
      console.log(`\n🎯 Checking campaign: ${campaign.name} (${campaign.id})`)
      
      const { data: campaignContacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, sequence_step, campaign_id, created_at')
        .eq('campaign_id', campaign.id)
      
      const { data: sequences } = await supabase
        .from('campaign_sequences')
        .select('step_number')
        .eq('campaign_id', campaign.id)
        .order('step_number')
      
      const maxStep = sequences?.length || 0
      
      console.log(`  📧 Contacts: ${campaignContacts?.length || 0}`)
      console.log(`  📝 Sequences: ${maxStep}`)
      
      if (campaignContacts?.length) {
        for (const contact of campaignContacts) {
          const currentStep = contact.sequence_step || 0
          const isDue = currentStep < maxStep
          console.log(`    Contact ${contact.id}: step ${contact.sequence_step} -> ${isDue ? 'DUE' : 'COMPLETED'}`)
        }
      }
      
      // Find contacts that haven't completed all sequences
      const dueContacts = campaignContacts?.filter(contact => {
        const currentStep = contact.sequence_step || 0
        return currentStep < maxStep
      }) || []
      
      console.log(`  ✅ Due contacts: ${dueContacts.length}`)
      
      analyticsContacts.push(...dueContacts)
    }
    
    console.log(`\n🎯 TOTAL ANALYTICS DUE CONTACTS: ${analyticsContacts.length}`)
    if (analyticsContacts.length > 0) {
      console.log('Due contacts:')
      analyticsContacts.forEach(contact => {
        console.log(`  - ${contact.email} (ID: ${contact.id}, step: ${contact.sequence_step})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testAnalytics()