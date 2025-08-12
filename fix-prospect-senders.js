#!/usr/bin/env node

/**
 * Fix prospect sender assignments
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixProspectSenders() {
  try {
    console.log('🔧 Fixing prospect sender assignments\n')
    
    // 1. Get prospects with invalid sender
    const { data: prospects, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('campaign_id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
      .eq('sender_email', 'weleadsup@gmail.com')
    
    if (prospectError) {
      console.error('❌ Error fetching prospects:', prospectError)
      return
    }
    
    console.log(`✅ Found ${prospects.length} prospects with invalid sender`)
    
    // 2. Get available sender for this campaign
    const { data: senders, error: senderError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
      .limit(1)
    
    if (senderError || !senders.length) {
      console.error('❌ No senders available:', senderError)
      return
    }
    
    const correctSender = senders[0].email
    console.log(`📧 Using correct sender: ${correctSender}`)
    
    // 3. Update prospects
    const { data: updated, error: updateError } = await supabase
      .from('prospects')
      .update({ sender_email: correctSender })
      .eq('campaign_id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
      .eq('sender_email', 'weleadsup@gmail.com')
      .select()
    
    if (updateError) {
      console.error('❌ Error updating prospects:', updateError)
      return
    }
    
    console.log(`✅ Updated ${updated.length} prospects:`)
    updated.forEach((prospect, i) => {
      console.log(`${i + 1}. ${prospect.email_address} → ${prospect.sender_email}`)
    })
    
    console.log('\n🎉 Prospect senders fixed! You can now run the campaign.')
    console.log('Run: curl -X POST http://localhost:3000/api/debug/test-sender-rotation -H "Authorization: Basic $(echo -n \'admin:password\' | base64)"')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixProspectSenders()