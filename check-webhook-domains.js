#!/usr/bin/env node

/**
 * Check webhook domain configuration
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkWebhookDomains() {
  try {
    console.log('🔍 Checking webhook domain configuration\n')
    
    // 1. Check what domains are actually being used in captured messages
    console.log('1. Domains used in captured messages:')
    console.log('=' .repeat(50))
    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('sender_email')
      .order('received_at', { ascending: false })
      .limit(20)
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    const domains = [...new Set(messages.map(m => m.sender_email))]
    domains.forEach((domain, i) => {
      const count = messages.filter(m => m.sender_email === domain).length
      console.log(`${i + 1}. ${domain} (${count} messages)`)
    })
    
    // 2. Check campaign senders to see what reply-to should be
    console.log('\n2. Current campaign sender setup:')
    console.log('=' .repeat(50))
    const { data: senders, error: senderError } = await supabase
      .from('campaign_senders')
      .select('email, campaign_id')
      .eq('campaign_id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
    
    if (senderError) {
      console.error('❌ Error fetching senders:', senderError)
    } else {
      senders.forEach((sender, i) => {
        console.log(`${i + 1}. Sender: ${sender.email}`)
      })
    }
    
    console.log('\n3. Domain Analysis:')
    console.log('=' .repeat(50))
    console.log('✅ Working webhook domain: test@reply.leadsup.io')
    console.log('❌ You replied to: test@leadsup.io (missing "reply" subdomain)')
    console.log('')
    console.log('🔧 Solution Options:')
    console.log('   Option 1: Fix reply-to to use test@reply.leadsup.io')
    console.log('   Option 2: Setup webhook for test@leadsup.io domain')
    console.log('')
    console.log('🎯 Recommendation: Use Option 1 - keep existing working webhook')
    console.log('   The reply-to should be: test@reply.leadsup.io')
    
    // 4. Check what's in the fix
    console.log('\n4. Current fix verification:')
    console.log('=' .repeat(50))
    console.log('🔍 The deployed fix sets replyTo to: test@reply.leadsup.io')
    console.log('📧 But your test email might have been sent before the fix')
    console.log('⏰ Next campaign emails will have the correct reply-to address')
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkWebhookDomains()