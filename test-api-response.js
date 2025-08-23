#!/usr/bin/env node

const fetch = require('node-fetch')
require('dotenv').config({ path: ['.env.local', '.env'] })

async function testAPIResponse() {
  console.log('🔍 Testing campaign senders API response...\n')
  
  const campaignId = 'a279e202-8a2a-41e2-a32f-80cc771a6bc5' // test campaign
  
  // Simulate API call
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  // Get the exact data the API returns
  const { data: assignmentsData, error } = await supabase
    .from('campaign_senders')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_selected', true)
    .order('email', { ascending: true })
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  const apiResponse = {
    success: true,
    assignments: assignmentsData || []
  }
  
  console.log('📤 API Response structure:')
  console.log(JSON.stringify(apiResponse, null, 2))
  
  console.log('\n🔍 Checking first assignment health_score field:')
  if (apiResponse.assignments.length > 0) {
    const firstAssignment = apiResponse.assignments[0]
    console.log(`   email: ${firstAssignment.email}`)
    console.log(`   health_score field exists: ${firstAssignment.hasOwnProperty('health_score')}`)
    console.log(`   health_score value: ${firstAssignment.health_score}`)
    console.log(`   health_score type: ${typeof firstAssignment.health_score}`)
  }
}

testAPIResponse().catch(console.error)
