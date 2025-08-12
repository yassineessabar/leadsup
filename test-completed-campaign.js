#!/usr/bin/env node

/**
 * Create a test campaign with "Completed" status to test the Domain Setup button
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function createTestCompletedCampaign() {
  try {
    console.log('🎯 Creating test completed campaign...\n')
    
    // Use the correct user ID (from your previous examples)
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // Create a test campaign with "Completed" status
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        user_id: correctUserId,
        name: 'Summer Email Campaign',
        type: 'Email',
        trigger_type: 'Manual',
        status: 'Completed', // This will show the Domain Setup button
        outreach_strategy: 'email',
        description: 'Completed summer outreach campaign for testing domain setup'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating campaign:', error)
      return
    }

    console.log('✅ Test campaign created successfully!')
    console.log(`📋 Campaign ID: ${campaign.id}`)
    console.log(`📝 Campaign Name: ${campaign.name}`)
    console.log(`📊 Status: ${campaign.status}`)
    console.log('')
    console.log('🔍 To test the Domain Setup button:')
    console.log('   1. Go to Campaigns tab in your app')
    console.log('   2. Look for "Summer Email Campaign" with Completed status')
    console.log('   3. Click the "Setup Domain" button in the Actions column')
    console.log('   4. Test both automated and manual setup flows')
    console.log('')
    console.log('🎉 Ready to test!')

  } catch (error) {
    console.error('❌ Failed to create test campaign:', error)
  }
}

createTestCompletedCampaign()