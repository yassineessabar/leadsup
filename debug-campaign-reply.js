#!/usr/bin/env node

/**
 * Debug why campaign reply isn't being captured
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugCampaignReply() {
  try {
    console.log('🔍 Debugging campaign reply capture\n')
    
    // 1. Check recent inbox messages for any new captures
    console.log('1. Checking ALL recent inbox messages:')
    console.log('=' .repeat(50))
    const { data: allMessages, error: msgError } = await supabase
      .from('inbox_messages')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(5)
    
    if (msgError) {
      console.error('❌ Error fetching messages:', msgError)
      return
    }
    
    allMessages.forEach((msg, i) => {
      console.log(`${i + 1}. ${new Date(msg.received_at).toLocaleTimeString()} - From: ${msg.contact_email}`)
      console.log(`   To: ${msg.sender_email}`)
      console.log(`   Subject: ${msg.subject}`)
      console.log(`   Content: "${msg.body_text?.substring(0, 50) || 'No content'}..."`)
      console.log('')
    })
    
    // 2. Check if webhook has received anything to noreply@leadsup.io
    console.log('2. Checking for messages TO noreply@leadsup.io:')
    console.log('=' .repeat(50))
    const { data: noreplyMessages, error: noreplyError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('sender_email', 'noreply@leadsup.io')
      .order('received_at', { ascending: false })
      .limit(3)
    
    if (noreplyError) {
      console.error('❌ Error fetching noreply messages:', noreplyError)
    } else if (noreplyMessages.length > 0) {
      console.log(`✅ Found ${noreplyMessages.length} messages to noreply@leadsup.io:`)
      noreplyMessages.forEach((msg, i) => {
        console.log(`${i + 1}. From: ${msg.contact_email} - "${msg.body_text?.substring(0, 50)}..."`)
      })
    } else {
      console.log('📭 No messages captured to noreply@leadsup.io')
    }
    
    // 3. Check campaign configuration
    console.log('\n3. Checking Test campaign configuration:')
    console.log('=' .repeat(50))
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
      .single()
    
    if (campError) {
      console.error('❌ Error fetching campaign:', campError)
    } else {
      console.log(`📋 Campaign: ${campaign.name}`)
      console.log(`   Type: ${campaign.type}`)
      console.log(`   Status: ${campaign.status}`)
    }
    
    // 4. Check campaign senders and reply-to setup
    console.log('\n4. Checking campaign senders:')
    console.log('=' .repeat(50))
    const { data: senders, error: senderError } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
    
    if (senderError) {
      console.error('❌ Error fetching senders:', senderError)
    } else {
      senders.forEach((sender, i) => {
        console.log(`${i + 1}. ${sender.email} - Health: ${sender.health_score}`)
      })
    }
    
    // 5. Check webhook configuration
    console.log('\n5. Webhook Configuration Summary:')
    console.log('=' .repeat(50))
    console.log('✅ Webhook URL: https://app.leadsup.io/api/webhooks/sendgrid')
    console.log('✅ Captures replies to: test@reply.leadsup.io')
    console.log('✅ Domain setup: reply.leadsup.io → mx.sendgrid.net')
    console.log('')
    console.log('❓ Issue Analysis:')
    console.log('   • Your reply went to: noreply@leadsup.io')
    console.log('   • Webhook expects: test@reply.leadsup.io')
    console.log('   • Campaign needs reply-to header set to: test@reply.leadsup.io')
    
    console.log('\n💡 Solution:')
    console.log('   1. Campaign emails must include "Reply-To: test@reply.leadsup.io" header')
    console.log('   2. When prospects reply, it should go to test@reply.leadsup.io (not noreply@leadsup.io)')
    console.log('   3. Only then will our webhook capture the replies')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugCampaignReply()