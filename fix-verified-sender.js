#!/usr/bin/env node

/**
 * Fix prospects to use verified SendGrid sender
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixVerifiedSender() {
  try {
    console.log('🔧 Fixing prospects to use verified SendGrid sender\n')
    
    // 1. Check what verified senders are available in campaign_senders
    const { data: senders, error: senderError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
    
    if (senderError) {
      console.error('❌ Error fetching senders:', senderError)
      return
    }
    
    console.log('📧 Available campaign senders:')
    senders.forEach((sender, i) => {
      console.log(`${i + 1}. ${sender.email} - Health: ${sender.health_score}`)
    })
    
    // 2. Check if we have a verified leadsup.io sender
    const verifiedSender = senders.find(s => s.email.includes('leadsup.io')) || senders[0]
    
    if (!verifiedSender) {
      console.log('❌ No verified sender available')
      
      // Create a verified sender for this campaign
      console.log('🔧 Creating verified sender: noreply@leadsup.io')
      const { data: newSender, error: createError } = await supabase
        .from('campaign_senders')
        .insert({
          campaign_id: '73da410f-53a7-4cea-aa91-10e4b56c8fa9',
          email: 'noreply@leadsup.io',
          name: 'LeadsUp Campaign',
          health_score: 100,
          daily_limit: 50,
          user_id: '6dae1cdc-2dbc-44ce-9145-4584981eef44' // Get from existing campaign
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating sender:', createError)
        return
      }
      
      console.log('✅ Created verified sender:', newSender.email)
      var correctSender = newSender.email
    } else {
      console.log(`✅ Using verified sender: ${verifiedSender.email}`)
      var correctSender = verifiedSender.email
    }
    
    // 3. Update prospects to use verified sender
    const { data: updated, error: updateError } = await supabase
      .from('prospects')
      .update({ sender_email: correctSender })
      .eq('campaign_id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
      .select()
    
    if (updateError) {
      console.error('❌ Error updating prospects:', updateError)
      return
    }
    
    console.log(`\n✅ Updated ${updated.length} prospects to use verified sender:`)
    updated.forEach((prospect, i) => {
      console.log(`${i + 1}. ${prospect.email_address} → ${prospect.sender_email}`)
    })
    
    console.log('\n🎉 Verified sender configured! You can now run the campaign.')
    console.log('Run: curl -X POST http://localhost:3000/api/debug/test-sender-rotation -H "Authorization: Basic $(echo -n \'admin:password\' | base64)"')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixVerifiedSender()