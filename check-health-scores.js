#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkHealthScores() {
  console.log('🔍 Checking health scores in campaign_senders table...\n')
  
  try {
    const userId = '16bec73e-34e5-4f25-b3dc-da19906d0a54' // essabar.yassine@gmail.com
    const campaignId = 'a279e202-8a2a-41e2-a32f-80cc771a6bc5' // test campaign
    
    // Get campaign senders with all fields
    const { data: senders, error } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_selected', true)
    
    if (error) {
      console.log('❌ Error fetching senders:', error)
      return
    }
    
    console.log(`✅ Found ${senders?.length || 0} selected senders for campaign\n`)
    
    senders?.forEach((sender, i) => {
      console.log(`📧 Sender ${i + 1}: ${sender.email}`)
      console.log(`   health_score: ${sender.health_score} (type: ${typeof sender.health_score})`)
      console.log(`   daily_limit: ${sender.daily_limit} (type: ${typeof sender.daily_limit})`)
      console.log(`   warmup_status: ${sender.warmup_status}`)
      console.log(`   is_selected: ${sender.is_selected}`)
      console.log('')
    })
    
    // Check if health_score is null or needs to be calculated
    const sendersWithoutHealthScore = senders?.filter(s => s.health_score === null || s.health_score === undefined)
    if (sendersWithoutHealthScore?.length > 0) {
      console.log('⚠️ WARNING: Some senders have null/undefined health scores:')
      sendersWithoutHealthScore.forEach(s => {
        console.log(`   - ${s.email}: health_score = ${s.health_score}`)
      })
      console.log('\n💡 This might be why you see NaN - the health scores might need to be initialized')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkHealthScores().catch(console.error)
