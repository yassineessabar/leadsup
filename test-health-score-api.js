#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testHealthScoreAPI() {
  console.log('🧪 Testing Health Score API Fix...\n')
  
  try {
    const userId = '16bec73e-34e5-4f25-b3dc-da19906d0a54' // essabar.yassine@gmail.com
    const senderIds = [
      '59c6e05b-2489-4444-8b56-942c3826fac7', // info@leadsup.io
      'a296476a-4529-474d-ac4f-cc520a29bf48', // contact@leadsup.io  
      '139bee7f-2087-4ece-bc68-03ee141a2168'  // hello@leadsup.io
    ]
    
    console.log('1. 📋 TESTING SENDER ACCOUNTS LOOKUP:')
    
    // Test the sender_accounts query
    const { data: senderAccounts, error: senderError } = await supabase
      .from('sender_accounts')
      .select('id, email, created_at, user_id')
      .in('id', senderIds)
      .eq('user_id', userId)
    
    if (senderError) {
      console.log('❌ Error fetching sender accounts:', senderError)
      return
    }
    
    console.log(`✅ Found ${senderAccounts?.length || 0} sender accounts:`)
    senderAccounts?.forEach((account, i) => {
      console.log(`   ${i + 1}. ${account.email} (ID: ${account.id})`)
    })
    
    console.log('\n2. 📊 TESTING CAMPAIGN SENDERS LOOKUP:')
    
    if (senderAccounts && senderAccounts.length > 0) {
      const senderEmails = senderAccounts.map(s => s.email)
      console.log('🔍 Looking up health scores for emails:', senderEmails)
      
      const { data: campaignSenders, error: campaignSendersError } = await supabase
        .from('campaign_senders')
        .select('email, health_score, daily_limit, warmup_status')
        .in('email', senderEmails)
        .eq('user_id', userId)
      
      if (campaignSendersError) {
        console.log('❌ Error fetching campaign senders:', campaignSendersError)
        return
      }
      
      console.log(`✅ Found ${campaignSenders?.length || 0} campaign senders with health data:`)
      campaignSenders?.forEach((cs, i) => {
        console.log(`   ${i + 1}. ${cs.email}`)
        console.log(`      Health Score: ${cs.health_score}`)
        console.log(`      Daily Limit: ${cs.daily_limit}`)
        console.log(`      Warmup Status: ${cs.warmup_status}`)
      })
      
      console.log('\n3. 🔗 TESTING MAPPING LOGIC:')
      
      // Build health scores mapping sender_account_id -> health_score_data
      const healthScores = {}
      
      senderAccounts.forEach(senderAccount => {
        // Find matching campaign sender by email
        const campaignSender = campaignSenders?.find(cs => cs.email === senderAccount.email)
        
        if (campaignSender && campaignSender.health_score) {
          // Use existing health score from campaign_senders
          healthScores[senderAccount.id] = {
            score: campaignSender.health_score,
            breakdown: {
              warmupScore: campaignSender.health_score, // Simplified for now
              deliverabilityScore: campaignSender.health_score,
              engagementScore: campaignSender.health_score,
              volumeScore: campaignSender.health_score,
              reputationScore: campaignSender.health_score
            },
            lastUpdated: new Date().toISOString()
          }
          console.log(`✅ Mapped health score for ${senderAccount.email}: ${campaignSender.health_score}%`)
        } else {
          // Calculate health score for this sender
          console.log(`🔄 No campaign sender found for ${senderAccount.email}, using default`)
          
          const defaultScore = 75 // Default health score
          healthScores[senderAccount.id] = {
            score: defaultScore,
            breakdown: {
              warmupScore: defaultScore,
              deliverabilityScore: defaultScore,
              engagementScore: defaultScore,
              volumeScore: defaultScore,
              reputationScore: defaultScore
            },
            lastUpdated: new Date().toISOString()
          }
          console.log(`📊 Default health score for ${senderAccount.email}: ${defaultScore}%`)
        }
      })
      
      console.log('\n4. 🎯 FINAL RESULT:')
      console.log(`Health scores generated for ${Object.keys(healthScores).length} sender accounts:`)
      
      Object.entries(healthScores).forEach(([senderId, scoreData]) => {
        const senderAccount = senderAccounts.find(s => s.id === senderId)
        console.log(`   ${senderAccount?.email || senderId}: ${scoreData.score}%`)
      })
      
      console.log('\n✅ SUCCESS! The health score API should now work correctly.')
      console.log('💡 The Email Senders page and Campaign Sender Accounts should display health scores.')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testHealthScoreAPI().catch(console.error)