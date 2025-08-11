#!/usr/bin/env node

/**
 * Check New Campaign
 * 
 * This script checks your newly created campaign and prepares it for sending.
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://ajcubavmrrxzmonsdnsj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqY3ViYXZtcnJ4em1vbnNkbnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ3NTM4NSwiZXhwIjoyMDcwMDUxMzg1fQ.6WttVoVbs6-h2E7dNDJaGFAEhLw1IJcJjlPoZ-smTyk'
)

async function checkNewCampaign() {
  console.log('🔍 CHECKING YOUR NEW CAMPAIGN');
  console.log('============================\n');

  try {
    const userId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // Get all campaigns ordered by creation date (newest first)
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    console.log(`Found ${campaigns?.length || 0} campaigns:`)
    campaigns?.forEach((campaign, i) => {
      const isNew = i === 0 && campaigns.length > 1
      console.log(`${i + 1}. ${isNew ? '🆕' : '📧'} "${campaign.name}" (${campaign.status})`)
      console.log(`   Type: ${campaign.type}`)
      console.log(`   Created: ${new Date(campaign.created_at).toLocaleString()}`)
      console.log(`   Pending: ${campaign.emails_pending || 0}`)
      console.log('')
    })
    
    if (!campaigns || campaigns.length === 0) {
      console.log('❌ No campaigns found')
      return
    }
    
    // Get the newest campaign
    const newCampaign = campaigns[0]
    console.log(`🎯 Focusing on: "${newCampaign.name}"`)
    
    // Check campaign sequences
    console.log('\n📋 Campaign Sequences:')
    const { data: sequences } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', newCampaign.id)
      .order('step_number', { ascending: true })
    
    if (sequences && sequences.length > 0) {
      sequences.forEach(seq => {
        console.log(`   Step ${seq.step_number}: "${seq.title || seq.subject || 'Untitled'}"`)
        console.log(`   Active: ${seq.is_active}`)
        console.log(`   Method: ${seq.outreach_method || 'email'}`)
        if (seq.content) {
          console.log(`   Preview: ${seq.content.substring(0, 80)}...`)
        }
        console.log('')
      })
    } else {
      console.log('   No sequences found for this campaign')
    }
    
    // Check campaign contacts
    console.log('\n👥 Campaign Contacts:')
    const { data: campaignContacts } = await supabase
      .from('campaign_contacts')
      .select(`
        *,
        contacts!inner(*)
      `)
      .eq('campaign_id', newCampaign.id)
    
    if (campaignContacts && campaignContacts.length > 0) {
      campaignContacts.forEach((cc, i) => {
        const contact = cc.contacts
        console.log(`   ${i + 1}. ${contact.first_name} ${contact.last_name} (${contact.email})`)
        console.log(`      Current step: ${cc.current_step}`)
        console.log(`      Status: ${cc.status || 'active'}`)
        console.log(`      Next send: ${cc.next_contact_date ? new Date(cc.next_contact_date).toLocaleString() : 'Not scheduled'}`)
        console.log('')
      })
    } else {
      console.log('   No contacts assigned to this campaign')
    }
    
    // Summary for email sending
    console.log('\n📊 CAMPAIGN SUMMARY:')
    console.log(`   Campaign: "${newCampaign.name}"`)
    console.log(`   Status: ${newCampaign.status}`)
    console.log(`   Sequences: ${sequences?.length || 0}`)
    console.log(`   Contacts: ${campaignContacts?.length || 0}`)
    console.log(`   Pending emails: ${newCampaign.emails_pending || 0}`)
    
    const readyToSend = newCampaign.status === 'Active' && sequences?.length > 0 && campaignContacts?.length > 0
    console.log(`   Ready to send: ${readyToSend ? '✅ YES' : '❌ NO'}`)
    
    if (!readyToSend) {
      console.log('\n💡 To make campaign ready:')
      if (newCampaign.status !== 'Active') console.log('   - Set campaign status to Active')
      if (!sequences || sequences.length === 0) console.log('   - Add at least one sequence/email template')
      if (!campaignContacts || campaignContacts.length === 0) console.log('   - Add contacts to the campaign')
    }
    
    // Return campaign info for next step
    return {
      campaign: newCampaign,
      sequences: sequences,
      contacts: campaignContacts,
      readyToSend: readyToSend
    }
    
  } catch (error) {
    console.error('❌ Error checking campaign:', error)
  }
}

// Run the check
checkNewCampaign().then((result) => {
  console.log('\n✅ Campaign check complete')
  if (result?.readyToSend) {
    console.log('\n🚀 Campaign is ready! Run send-campaign-email.js to send the email.')
  }
  process.exit(0)
}).catch((error) => {
  console.error('❌ Check failed:', error)
  process.exit(1)
});