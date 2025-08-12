#!/usr/bin/env node

/**
 * Add verified noreply@leadsup.io sender to Test campaign
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function addVerifiedSender() {
  try {
    console.log('🔧 Adding verified sender to Test campaign\n')
    
    // 1. Get user_id from campaign
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
      .single()
    
    if (campError) {
      console.error('❌ Error fetching campaign:', campError)
      return
    }
    
    // 2. Add noreply@leadsup.io as verified sender
    const { data: newSender, error: createError } = await supabase
      .from('campaign_senders')
      .insert({
        campaign_id: '73da410f-53a7-4cea-aa91-10e4b56c8fa9',
        email: 'noreply@leadsup.io',
        name: 'LeadsUp Campaign',
        health_score: 100,
        daily_limit: 50,
        user_id: campaign.user_id
      })
      .select()
      .single()
    
    if (createError) {
      // Check if it already exists
      if (createError.code === '23505') {
        console.log('✅ Verified sender already exists: noreply@leadsup.io')
      } else {
        console.error('❌ Error creating sender:', createError)
        return
      }
    } else {
      console.log('✅ Created verified sender:', newSender.email)
    }
    
    // 3. Update prospects to use verified sender
    const { data: updated, error: updateError } = await supabase
      .from('prospects')
      .update({ sender_email: 'noreply@leadsup.io' })
      .eq('campaign_id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
      .select()
    
    if (updateError) {
      console.error('❌ Error updating prospects:', updateError)
      return
    }
    
    console.log(`\n✅ Updated ${updated.length} prospects:`)
    updated.forEach((prospect, i) => {
      console.log(`${i + 1}. ${prospect.email_address} → ${prospect.sender_email}`)
    })
    
    // 4. Set reply-to address for capturing responses
    console.log('\n📧 Emails will be sent from: noreply@leadsup.io')
    console.log('📨 Replies will be captured at: test@reply.leadsup.io')
    
    console.log('\n🎉 Ready to test! Run the campaign now:')
    console.log('curl -X POST http://localhost:3000/api/debug/test-sender-rotation -H "Authorization: Basic $(echo -n \'admin:password\' | base64)"')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

addVerifiedSender()