#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testCampaignSendersAPI() {
  console.log('🧪 Testing Campaign Senders API...\n')
  
  try {
    const userId = '16bec73e-34e5-4f25-b3dc-da19906d0a54' // essabar.yassine@gmail.com
    
    // Get the first active campaign
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('user_id', userId)
      .eq('status', 'Active')
      .limit(1)
      .single()
    
    if (campaignError || !campaigns) {
      console.log('❌ Error or no active campaigns found:', campaignError)
      return
    }
    
    console.log(`🎯 Testing with campaign: ${campaigns.name} (${campaigns.id})`)
    
    console.log('\n1. 📋 TESTING RAW DATABASE QUERY:')
    
    // Test the exact query the API uses
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaigns.id)
      .eq('is_selected', true)
      .order('email', { ascending: true })
    
    if (assignmentsError) {
      console.log('❌ Database query error:', assignmentsError)
      return
    }
    
    console.log(`✅ Database query returned ${assignmentsData?.length || 0} assignments:`)
    assignmentsData?.forEach((assignment, i) => {
      console.log(`   ${i + 1}. ${assignment.email}`)
      console.log(`      is_selected: ${assignment.is_selected}`)
      console.log(`      health_score: ${assignment.health_score}`)
      console.log(`      daily_limit: ${assignment.daily_limit}`)
    })
    
    console.log('\n2. 🌐 TESTING API RESPONSE FORMAT:')
    
    // Simulate what the API should return
    const apiResponse = {
      success: true,
      assignments: assignmentsData || []
    }
    
    console.log('📤 API would return:', JSON.stringify(apiResponse, null, 2))
    
    console.log('\n3. 🧪 TESTING ANALYTICS PARSING LOGIC:')
    
    // Test the exact logic used in analytics
    const senderAssignments = apiResponse.assignments || []
    console.log(`📋 senderAssignments.length: ${senderAssignments.length}`)
    
    if (senderAssignments.length > 0) {
      console.log('✅ Would pass the "assignments exist" check')
      
      // Test email extraction
      const senderEmails = senderAssignments.map((assignment) => assignment.email).filter(Boolean)
      console.log(`📧 Extracted emails: [${senderEmails.join(', ')}]`)
      console.log(`📊 senderEmails.length: ${senderEmails.length}`)
      
      // Test sender_id extraction
      const senderIds = senderAssignments.map((assignment) => assignment.sender_id).filter(Boolean)
      console.log(`🆔 Extracted sender_ids: [${senderIds.join(', ')}]`)
      console.log(`📊 senderIds.length: ${senderIds.length}`)
      
      if (senderIds.length === 0) {
        console.log('✅ Would use email-based health score lookup')
        
        if (senderEmails.length > 0) {
          console.log('✅ Would successfully fetch health scores')
          console.log(`🎯 Health score API URL: /api/sender-accounts/health-score?emails=${senderEmails.join(',')}&campaignId=${campaigns.id}`)
        } else {
          console.log('❌ Would fail - no emails found')
        }
      } else {
        console.log('✅ Would use ID-based health score lookup')
      }
    } else {
      console.log('❌ Would fail the "assignments exist" check')
      console.log('🚨 This is the problem causing "0 selected sender"!')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testCampaignSendersAPI().catch(console.error)