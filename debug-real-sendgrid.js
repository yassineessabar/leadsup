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

async function debugRealSendGrid() {
  console.log('🔍 Debugging real SendGrid data availability...\n')
  
  try {
    // 1. Check what's in sendgrid_events table now
    const { data: allEvents, error: eventsError } = await supabase
      .from('sendgrid_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('📊 Current sendgrid_events table:')
    if (eventsError) {
      console.log('❌ Error:', eventsError)
    } else if (!allEvents || allEvents.length === 0) {
      console.log('⚠️ NO EVENTS FOUND in sendgrid_events table')
      console.log('💡 This means no SendGrid webhooks have been received')
    } else {
      console.log(`✅ Found ${allEvents.length} events`)
      allEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.event_type} - ${event.email} - ${event.created_at}`)
      })
    }
    
    // 2. Check inbox_messages table for real emails
    const { data: inboxMessages, error: inboxError } = await supabase
      .from('inbox_messages')
      .select('direction, sender_email, contact_email, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('\n📧 Current inbox_messages table:')
    if (inboxError) {
      console.log('❌ Error:', inboxError)
    } else if (!inboxMessages || inboxMessages.length === 0) {
      console.log('⚠️ NO MESSAGES FOUND in inbox_messages table')
    } else {
      console.log(`✅ Found ${inboxMessages.length} inbox messages`)
      inboxMessages.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.direction} - from: ${msg.sender_email} to: ${msg.contact_email}`)
      })
    }
    
    // 3. Check campaigns table
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log('\n📋 Current campaigns:')
    if (campaignsError) {
      console.log('❌ Error:', campaignsError)
    } else if (!campaigns || campaigns.length === 0) {
      console.log('⚠️ NO CAMPAIGNS FOUND')
    } else {
      console.log(`✅ Found ${campaigns.length} campaigns`)
      campaigns.forEach((campaign, i) => {
        console.log(`   ${i + 1}. ${campaign.name} (${campaign.status}) - ${campaign.id}`)
      })
    }
    
    // 4. Check if SendGrid webhooks are configured
    console.log('\n🔗 SendGrid Integration Status:')
    console.log('   Webhook endpoint should be: https://your-domain.com/api/sendgrid/webhook')
    console.log('   Expected events: processed, delivered, open, click, bounce, etc.')
    
    // 5. Test the analytics API directly
    console.log('\n🧪 Testing analytics API...')
    try {
      const testResponse = await fetch('http://localhost:3000/api/analytics/account?start_date=2024-01-01&end_date=2025-12-31')
      if (testResponse.ok) {
        const testData = await testResponse.json()
        console.log('📊 Analytics API response:', testData)
      } else {
        console.log('❌ Analytics API failed:', testResponse.status)
      }
    } catch (apiError) {
      console.log('❌ Could not test analytics API (app might not be running):', apiError.message)
    }
    
    console.log('\n📋 DIAGNOSIS:')
    
    if (!allEvents || allEvents.length === 0) {
      console.log('🚨 ROOT CAUSE: No SendGrid webhook events in database')
      console.log('')
      console.log('📝 TO FIX:')
      console.log('   1. Verify SendGrid webhook is configured and pointing to your app')
      console.log('   2. Check SendGrid webhook logs for delivery issues')
      console.log('   3. Send a test email through your campaign to trigger webhooks')
      console.log('   4. Verify SENDGRID_API_KEY is set correctly')
      console.log('')
      console.log('💡 ALTERNATIVE: If you have real emails but no webhooks,')
      console.log('   we can implement direct SendGrid API calls to fetch metrics')
    } else {
      console.log('✅ SendGrid events exist - investigating why dashboard says no data...')
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugRealSendGrid().catch(console.error)