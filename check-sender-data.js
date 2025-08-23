#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSenderData() {
  console.log('🔍 Checking what data exists for health score calculation...\n')
  
  const userId = '16bec73e-34e5-4f25-b3dc-da19906d0a54'
  const senderEmail = 'contact@leadsup.io'
  
  // 1. Check SendGrid events
  console.log('1️⃣ CHECKING SENDGRID EVENTS:')
  const { data: events, error: eventsError } = await supabase
    .from('sendgrid_events')
    .select('event_type, created_at')
    .eq('user_id', userId)
    .limit(10)
  
  if (events && events.length > 0) {
    console.log(`   ✅ Found ${events.length} SendGrid events`)
    const eventTypes = [...new Set(events.map(e => e.event_type))]
    console.log(`   Event types: ${eventTypes.join(', ')}`)
  } else {
    console.log('   ❌ No SendGrid events found - this is why score is default 75%')
  }
  
  // 2. Check sender metrics
  console.log('\n2️⃣ CHECKING SENDER METRICS:')
  const { data: metrics } = await supabase
    .from('sender_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('sender_email', senderEmail)
    .limit(5)
  
  if (metrics && metrics.length > 0) {
    console.log(`   ✅ Found ${metrics.length} daily metric records`)
    const totals = metrics.reduce((acc, m) => ({
      sent: acc.sent + (m.emails_sent || 0),
      delivered: acc.delivered + (m.emails_delivered || 0),
      opens: acc.opens + (m.unique_opens || 0)
    }), { sent: 0, delivered: 0, opens: 0 })
    console.log(`   Totals: ${totals.sent} sent, ${totals.delivered} delivered, ${totals.opens} opens`)
  } else {
    console.log('   ❌ No sender metrics found')
  }
  
  // 3. Check inbox messages (actual sending)
  console.log('\n3️⃣ CHECKING ACTUAL EMAILS SENT:')
  const { data: messages } = await supabase
    .from('inbox_messages')
    .select('direction, status, created_at')
    .eq('user_id', userId)
    .eq('sender_email', senderEmail)
    .limit(10)
  
  if (messages && messages.length > 0) {
    const outbound = messages.filter(m => m.direction === 'outbound').length
    const inbound = messages.filter(m => m.direction === 'inbound').length
    console.log(`   ✅ Found ${messages.length} messages`)
    console.log(`   ${outbound} sent, ${inbound} received`)
  } else {
    console.log('   ❌ No messages sent from this sender')
  }
  
  // 4. Check sender account age
  console.log('\n4️⃣ CHECKING SENDER ACCOUNT AGE:')
  const { data: account } = await supabase
    .from('sender_accounts')
    .select('created_at, health_score')
    .eq('email', senderEmail)
    .single()
  
  if (account) {
    const age = Math.floor((Date.now() - new Date(account.created_at).getTime()) / (1000 * 60 * 60 * 24))
    console.log(`   ✅ Account age: ${age} days`)
    console.log(`   Current stored health_score: ${account.health_score}`)
  }
  
  console.log('\n=====================================')
  console.log('📊 WHY YOUR SCORE IS 75%:\n')
  console.log('The system uses 75% as a default "neutral" score when:')
  console.log('• No sending history exists yet')
  console.log('• Account is new (no data to calculate from)')
  console.log('• Waiting for first emails to be sent\n')
  console.log('🚀 TO IMPROVE:')
  console.log('1. Start sending emails through campaigns')
  console.log('2. Score will update automatically as data comes in')
  console.log('3. Follow the warmup schedule for best results')
}

checkSenderData().catch(console.error)
