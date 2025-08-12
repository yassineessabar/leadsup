#!/usr/bin/env node

/**
 * Fix sender assignment for campaign testing
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixSenderAssignment() {
  try {
    console.log('🔧 Fixing sender assignment for Test campaign\n')
    
    // 1. Get the Test campaign
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('name', 'Test')
      .single()
    
    if (campError || !campaign) {
      console.error('❌ Campaign not found:', campError)
      return
    }
    
    console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})`)
    
    // 2. Check available senders for this campaign
    const { data: senders, error: senderError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaign.id)
    
    if (senderError) {
      console.error('❌ Error fetching senders:', senderError)
      return
    }
    
    console.log(`📧 Available active senders: ${senders.length}`)
    senders.forEach((sender, i) => {
      console.log(`${i + 1}. ${sender.email} - Health: ${sender.health_score}`)
    })
    
    if (senders.length === 0) {
      console.log('❌ No active senders found for campaign')
      return
    }
    
    // 3. Get prospects with incorrect sender assignments
    const { data: prospects, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('assigned_sender', 'weleadsup@gmail.com')
    
    if (prospectError) {
      console.error('❌ Error fetching prospects:', prospectError)
      return
    }
    
    console.log(`\n👥 Found ${prospects.length} prospects with incorrect sender assignment`)
    
    if (prospects.length === 0) {
      console.log('✅ No prospects need fixing')
      return
    }
    
    // 4. Use the first available sender
    const correctSender = senders[0]
    console.log(`🔄 Reassigning prospects to: ${correctSender.email}`)
    
    // 5. Update prospect assignments
    const { data: updated, error: updateError } = await supabase
      .from('prospects')
      .update({ assigned_sender: correctSender.email })
      .eq('campaign_id', campaign.id)
      .eq('assigned_sender', 'weleadsup@gmail.com')
      .select()
    
    if (updateError) {
      console.error('❌ Error updating prospects:', updateError)
      return
    }
    
    console.log(`✅ Updated ${updated.length} prospects`)
    updated.forEach((prospect, i) => {
      console.log(`${i + 1}. ${prospect.email} → ${prospect.assigned_sender}`)
    })
    
    console.log('\n🎉 Sender assignment fixed! You can now run the campaign again.')
    console.log('Run: curl -X POST http://localhost:3000/api/debug/test-sender-rotation -H "Authorization: Basic $(echo -n \'admin:password\' | base64)"')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixSenderAssignment()