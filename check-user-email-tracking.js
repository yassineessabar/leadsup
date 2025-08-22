#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUserEmailTracking() {
  console.log('🔍 Checking how emails are tracked per user...\n')
  
  try {
    // 1. Find active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5)
    
    console.log('👥 Users in system:')
    if (usersError) {
      console.log('❌ Error:', usersError)
    } else if (users && users.length > 0) {
      users.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email} (ID: ${user.id})`)
      })
      
      // Use first user as example
      const exampleUser = users[0]
      console.log(`\n🔍 Checking email tracking for user: ${exampleUser.email}`)
      
      // 2. Check how campaigns link to users
      const { data: userCampaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, user_id')
        .eq('user_id', exampleUser.id)
        .limit(5)
      
      console.log('\n📋 User campaigns:')
      if (campaignError) {
        console.log('❌ Error:', campaignError)
      } else if (userCampaigns && userCampaigns.length > 0) {
        userCampaigns.forEach((campaign, i) => {
          console.log(`   ${i + 1}. ${campaign.name} (ID: ${campaign.id})`)
        })
        
        // 3. Check if sendgrid_events has user_id
        const { data: eventSample, error: eventError } = await supabase
          .from('sendgrid_events')
          .select('*')
          .limit(3)
        
        console.log('\n📊 SendGrid events structure:')
        if (eventError) {
          console.log('❌ Error:', eventError)
        } else if (eventSample && eventSample.length > 0) {
          console.log('✅ Sample event structure:')
          const event = eventSample[0]
          Object.keys(event).forEach(key => {
            console.log(`   ${key}: ${event[key]}`)
          })
          
          // Check if events are linked to users
          const hasUserId = eventSample.some(e => e.user_id)
          const hasCampaignId = eventSample.some(e => e.campaign_id)
          
          console.log('\n🔗 User tracking in SendGrid events:')
          console.log(`   Has user_id field: ${hasUserId}`)
          console.log(`   Has campaign_id field: ${hasCampaignId}`)
          
        } else {
          console.log('⚠️ No SendGrid events found')
        }
        
        // 4. Check inbox_messages user tracking
        const { data: inboxSample, error: inboxError } = await supabase
          .from('inbox_messages')
          .select('*')
          .eq('user_id', exampleUser.id)
          .limit(3)
        
        console.log('\n📧 User inbox messages:')
        if (inboxError) {
          console.log('❌ Error:', inboxError)
        } else if (inboxSample && inboxSample.length > 0) {
          console.log(`✅ Found ${inboxSample.length} inbox messages for this user`)
          inboxSample.forEach((msg, i) => {
            console.log(`   ${i + 1}. ${msg.direction} - ${msg.sender_email} → ${msg.contact_email}`)
          })
        } else {
          console.log('⚠️ No inbox messages found for this user')
        }
        
      } else {
        console.log('⚠️ No campaigns found for this user')
      }
      
    } else {
      console.log('⚠️ No users found')
    }
    
    console.log('\n📋 ANALYSIS:')
    console.log('💡 To get user-specific email metrics, we need to:')
    console.log('   1. Filter by user_id in sendgrid_events table')
    console.log('   2. OR filter by user campaigns (campaign_id)')
    console.log('   3. OR link emails via sender/contact relationships')
    console.log('   4. OR use categories in SendGrid to tag user emails')
    
  } catch (error) {
    console.error('❌ Analysis failed:', error)
  }
}

checkUserEmailTracking().catch(console.error)