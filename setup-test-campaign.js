#!/usr/bin/env node

/**
 * Set up a test campaign and sender for webhook testing
 * This creates the necessary database records to test email replies
 * 
 * Usage: node setup-test-campaign.js
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function setupTestCampaign() {
  console.log('🚀 Setting Up Test Campaign for SendGrid Testing\n')
  console.log('=' .repeat(50))

  // Test data
  const testUserId = 'test-user-' + Date.now() // You should replace with actual user ID
  const testCampaignId = 'test-campaign-' + Date.now()
  const testSenderEmail = 'test@reply.leadsup.io' // Your parse domain email
  
  try {
    // Step 1: Create test campaign
    console.log('\n1️⃣ Creating test campaign...')
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        id: testCampaignId,
        user_id: testUserId,
        name: 'SendGrid Test Campaign',
        status: 'active',
        keywords: ['test'],
        location: 'Test Location',
        industry: 'Technology',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (campaignError) {
      console.log('⚠️  Could not create campaign:', campaignError.message)
      console.log('   This might be okay if the table has different columns')
    } else {
      console.log('✅ Test campaign created')
      console.log(`   Campaign ID: ${testCampaignId}`)
    }

    // Step 2: Create campaign sender
    console.log('\n2️⃣ Creating campaign sender...')
    const { data: sender, error: senderError } = await supabase
      .from('campaign_senders')
      .insert({
        campaign_id: testCampaignId,
        user_id: testUserId,
        email: testSenderEmail,
        name: 'Test Sender',
        is_active: true,
        daily_limit: 100,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (senderError) {
      console.log('⚠️  Could not create sender:', senderError.message)
      
      // Try to update if already exists
      const { data: updatedSender, error: updateError } = await supabase
        .from('campaign_senders')
        .update({
          campaign_id: testCampaignId,
          user_id: testUserId,
          is_active: true
        })
        .eq('email', testSenderEmail)
        .select()
        .single()
      
      if (updateError) {
        console.log('❌ Could not update sender:', updateError.message)
      } else {
        console.log('✅ Updated existing sender')
      }
    } else {
      console.log('✅ Campaign sender created')
      console.log(`   Sender Email: ${testSenderEmail}`)
    }

    // Step 3: Create a test contact/prospect
    console.log('\n3️⃣ Creating test prospect...')
    const testProspectEmail = `john.doe.${Date.now()}@example.com`
    
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .insert({
        campaign_id: testCampaignId,
        first_name: 'John',
        last_name: 'Doe',
        email: testProspectEmail,
        company: 'Test Company',
        title: 'Manager',
        sender_email: testSenderEmail,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (prospectError) {
      console.log('⚠️  Could not create prospect:', prospectError.message)
    } else {
      console.log('✅ Test prospect created')
      console.log(`   Prospect Email: ${testProspectEmail}`)
    }

    // Step 4: Instructions for testing
    console.log('\n' + '='.repeat(50))
    console.log('✅ TEST SETUP COMPLETE')
    console.log('='.repeat(50))
    
    console.log('\n📋 Test Configuration:')
    console.log(`   Campaign ID: ${testCampaignId}`)
    console.log(`   Sender Email: ${testSenderEmail}`)
    console.log(`   User ID: ${testUserId}`)
    
    console.log('\n🧪 How to Test:')
    console.log('\n1. Update the webhook test to use this sender:')
    console.log(`   Change 'to' field to: ${testSenderEmail}`)
    console.log('\n2. Run the webhook test:')
    console.log('   node test-webhook-direct.js')
    console.log('\n3. The webhook should now process the email successfully')
    console.log('\n4. Check the database:')
    console.log('   node check-inbox-replies.js')
    
    console.log('\n💡 For Real Email Testing:')
    console.log('1. Send an email from your campaign automation')
    console.log('2. Reply to that email')
    console.log(`3. The reply will go to ${testSenderEmail}`)
    console.log('4. SendGrid will capture it and send to your webhook')
    console.log('5. Check database for the captured reply')
    
    // Save config for other scripts
    const fs = require('fs')
    const config = {
      campaignId: testCampaignId,
      senderEmail: testSenderEmail,
      userId: testUserId,
      createdAt: new Date().toISOString()
    }
    
    fs.writeFileSync('test-campaign-config.json', JSON.stringify(config, null, 2))
    console.log('\n📝 Test configuration saved to: test-campaign-config.json')
    
  } catch (error) {
    console.error('❌ Setup error:', error.message)
  }
}

// Run setup
setupTestCampaign().catch(console.error)