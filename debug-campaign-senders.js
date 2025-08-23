#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugCampaignSenders() {
  console.log('🔍 Debugging campaign sender assignments...\n')
  
  try {
    const userId = '16bec73e-34e5-4f25-b3dc-da19906d0a54' // essabar.yassine@gmail.com
    
    console.log('1. 📋 CHECKING USER CAMPAIGNS:')
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (campaignError) {
      console.log('❌ Error fetching campaigns:', campaignError)
      return
    }
    
    console.log(`✅ Found ${campaigns?.length || 0} campaigns:`)
    campaigns?.forEach((campaign, i) => {
      console.log(`   ${i + 1}. ${campaign.name} (ID: ${campaign.id}) - ${campaign.status}`)
    })
    
    if (!campaigns || campaigns.length === 0) {
      console.log('⚠️ No campaigns found')
      return
    }
    
    // Check each campaign's senders
    for (const campaign of campaigns) {
      console.log(`\n2. 📊 CHECKING SENDERS FOR CAMPAIGN: ${campaign.name} (${campaign.id})`)
      
      const { data: campaignSenders, error: sendersError } = await supabase
        .from('campaign_senders')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('email', { ascending: true })
      
      if (sendersError) {
        console.log(`❌ Error fetching senders for campaign ${campaign.id}:`, sendersError)
        continue
      }
      
      console.log(`✅ Found ${campaignSenders?.length || 0} campaign senders:`)
      
      if (campaignSenders && campaignSenders.length > 0) {
        campaignSenders.forEach((sender, i) => {
          console.log(`   ${i + 1}. ${sender.email}`)
          console.log(`      is_selected: ${sender.is_selected}`)
          console.log(`      is_active: ${sender.is_active}`)
          console.log(`      health_score: ${sender.health_score}`)
          console.log(`      daily_limit: ${sender.daily_limit}`)
          console.log(`      warmup_status: ${sender.warmup_status}`)
          console.log('')
        })
        
        // Count selected vs total
        const selectedCount = campaignSenders.filter(s => s.is_selected).length
        const activeCount = campaignSenders.filter(s => s.is_active).length
        
        console.log(`📊 SUMMARY for ${campaign.name}:`)
        console.log(`   Total senders: ${campaignSenders.length}`)
        console.log(`   Selected (is_selected=true): ${selectedCount}`)
        console.log(`   Active (is_active=true): ${activeCount}`)
        
        if (selectedCount === 0) {
          console.log('🚨 PROBLEM: No senders have is_selected=true!')
          console.log('💡 This explains why analytics shows "0 selected sender"')
        }
        
        if (selectedCount > 0) {
          console.log('✅ Campaign has selected senders - analytics should work')
        }
      } else {
        console.log('⚠️ No campaign senders found for this campaign')
      }
    }
    
    console.log('\n3. 🧪 TESTING CAMPAIGN SENDERS API:')
    const testCampaign = campaigns[0]
    console.log(`Testing API for campaign: ${testCampaign.name} (${testCampaign.id})`)
    console.log(`API URL: /api/campaigns/${testCampaign.id}/senders`)
    console.log('💡 You can test this API endpoint manually in the browser while logged in.')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugCampaignSenders().catch(console.error)