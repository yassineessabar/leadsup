#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugHealthScores() {
  console.log('🔍 Debugging health score display issues...\n')
  
  try {
    const userId = '16bec73e-34e5-4f25-b3dc-da19906d0a54' // essabar.yassine@gmail.com
    
    console.log('1. 📋 CHECKING SENDER ACCOUNTS TABLE:')
    const { data: senderAccounts, error: senderError } = await supabase
      .from('sender_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (senderError) {
      console.log('❌ Error fetching sender accounts:', senderError)
      return
    }
    
    console.log(`✅ Found ${senderAccounts?.length || 0} sender accounts:`)
    senderAccounts?.forEach((account, i) => {
      console.log(`   ${i + 1}. ${account.email} (ID: ${account.id})`)
      console.log(`      Health Score: ${account.health_score}`)
      console.log(`      Daily Limit: ${account.daily_limit}`)
      console.log(`      Status: ${account.warmup_status}`)
      console.log('')
    })
    
    console.log('2. 📋 CHECKING DOMAINS TABLE:')
    const { data: domains, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (domainError) {
      console.log('❌ Error fetching domains:', domainError)
      return
    }
    
    console.log(`✅ Found ${domains?.length || 0} domains:`)
    domains?.forEach((domain, i) => {
      console.log(`   ${i + 1}. ${domain.domain} (ID: ${domain.id})`)
      console.log(`      Status: ${domain.status}`)
    })
    
    // For each domain, check its senders
    for (const domain of domains || []) {
      console.log(`\n3. 📋 CHECKING SENDERS FOR DOMAIN: ${domain.domain}`)
      
      const { data: domainSenders, error: domainSendersError } = await supabase
        .from('sender_accounts')
        .select('*')
        .eq('domain_id', domain.id)
        .order('created_at', { ascending: false })
      
      if (domainSendersError) {
        console.log('❌ Error fetching domain senders:', domainSendersError)
        continue
      }
      
      console.log(`✅ Found ${domainSenders?.length || 0} senders for ${domain.domain}:`)
      domainSenders?.forEach((sender, i) => {
        console.log(`   ${i + 1}. ${sender.email} (ID: ${sender.id})`)
        console.log(`      Health Score: ${sender.health_score}`)
        console.log(`      Daily Limit: ${sender.daily_limit}`)
        console.log(`      Display Name: ${sender.display_name}`)
        console.log(`      Is Default: ${sender.is_default}`)
        console.log(`      Status: ${sender.warmup_status}`)
        console.log('')
      })
    }
    
    console.log('4. 🧪 TESTING HEALTH SCORE API:')
    const senderIds = senderAccounts?.map(s => s.id) || []
    console.log(`Testing with sender IDs: [${senderIds.join(', ')}]`)
    
    if (senderIds.length > 0) {
      // Simulate the API call
      const apiUrl = `http://localhost:3000/api/sender-accounts/health-score?senderIds=${senderIds.join(',')}`
      console.log(`API URL would be: ${apiUrl}`)
      console.log('\n💡 You can test this URL manually in the browser while logged in.')
    } else {
      console.log('⚠️ No sender IDs to test with')
    }
    
    console.log('\n5. 🔍 CHECKING FOR DATA DISCREPANCIES:')
    
    // Check if there are sender accounts without health_score
    const sendersWithoutHealthScore = senderAccounts?.filter(s => !s.health_score) || []
    console.log(`Senders without health_score: ${sendersWithoutHealthScore.length}`)
    
    // Check if there are sender accounts without domain_id
    const sendersWithoutDomainId = senderAccounts?.filter(s => !s.domain_id) || []
    console.log(`Senders without domain_id: ${sendersWithoutDomainId.length}`)
    
    // Check for campaigns and campaign senders
    console.log('\n6. 📋 CHECKING CAMPAIGN SENDERS:')
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!campaignError && campaigns?.length > 0) {
      console.log(`✅ Found ${campaigns.length} recent campaigns:`)
      
      for (const campaign of campaigns) {
        console.log(`\n   Campaign: ${campaign.name} (${campaign.id}) - ${campaign.status}`)
        
        const { data: campaignSenders, error: campaignSendersError } = await supabase
          .from('campaign_senders')
          .select('*')
          .eq('campaign_id', campaign.id)
        
        if (!campaignSendersError) {
          console.log(`   Campaign Senders: ${campaignSenders?.length || 0}`)
          campaignSenders?.forEach(cs => {
            console.log(`     - ${cs.email} (ID: ${cs.id}, Health: ${cs.health_score})`)
          })
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugHealthScores().catch(console.error)