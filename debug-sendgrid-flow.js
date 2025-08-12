require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugSendGridFlow() {
  console.log('🔍 SendGrid Integration Debug Report\n')
  console.log('=' .repeat(60))
  
  try {
    // 1. Check campaign senders
    console.log('\n1️⃣ CAMPAIGN SENDERS CHECK')
    console.log('-'.repeat(30))
    
    const { data: senders, error: sendersError } = await supabase
      .from('campaign_senders')
      .select('email, campaign_id, user_id, is_active')
      .eq('is_active', true)
    
    if (sendersError) {
      console.log('❌ Error fetching senders:', sendersError.message)
    } else {
      console.log(`Found ${senders.length} active senders:`)
      senders.forEach(sender => {
        console.log(`   ✅ ${sender.email} (Campaign: ${sender.campaign_id})`)
      })
    }
    
    // 2. Check for recent webhook attempts
    console.log('\n2️⃣ RECENT WEBHOOK ACTIVITY')
    console.log('-'.repeat(30))
    
    const { data: messages, error: messagesError } = await supabase
      .from('inbox_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (messagesError) {
      console.log('❌ Error fetching messages:', messagesError.message)
    } else {
      console.log(`Found ${messages.length} recent messages:`)
      messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.contact_email} → ${msg.sender_email}`)
        console.log(`      Subject: ${msg.subject}`)
        console.log(`      Direction: ${msg.direction}`)
        console.log(`      Received: ${msg.received_at}`)
        console.log(`      Provider: ${msg.provider}`)
        console.log('')
      })
    }
    
    // 3. Check if test@reply.leadsup.io sender exists
    console.log('3️⃣ REPLY DOMAIN SENDER CHECK')
    console.log('-'.repeat(30))
    
    const { data: replySender } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('email', 'test@reply.leadsup.io')
      .single()
    
    if (replySender) {
      console.log('✅ Reply domain sender exists:')
      console.log(`   Email: ${replySender.email}`)
      console.log(`   Campaign: ${replySender.campaign_id}`)
      console.log(`   User: ${replySender.user_id}`)
      console.log(`   Active: ${replySender.is_active}`)
    } else {
      console.log('❌ No sender found for test@reply.leadsup.io')
    }
    
    // 4. Check last test email details
    console.log('\n4️⃣ LAST TEST EMAIL STATUS')
    console.log('-'.repeat(30))
    
    try {
      const fs = require('fs')
      if (fs.existsSync('last-test-email.json')) {
        const lastTest = JSON.parse(fs.readFileSync('last-test-email.json', 'utf8'))
        console.log('Last test email sent:')
        console.log(`   Test ID: ${lastTest.testId}`)
        console.log(`   Recipient: ${lastTest.recipientEmail}`)
        console.log(`   Sent: ${lastTest.sentAt}`)
        console.log(`   Message ID: ${lastTest.messageId}`)
        
        const sentTime = new Date(lastTest.sentAt)
        const now = new Date()
        const minutesAgo = Math.floor((now - sentTime) / (1000 * 60))
        console.log(`   Time ago: ${minutesAgo} minutes`)
      } else {
        console.log('No test email record found')
      }
    } catch (e) {
      console.log('Error reading test email data:', e.message)
    }
    
    // 5. Configuration summary
    console.log('\n5️⃣ CONFIGURATION SUMMARY')
    console.log('-'.repeat(30))
    console.log('Expected flow:')
    console.log('   1. Email sent to: essabar.yassine@gmail.com')
    console.log('   2. Reply-To set to: test@reply.leadsup.io')
    console.log('   3. When you reply, email goes to: test@reply.leadsup.io')
    console.log('   4. MX record routes to: mx.sendgrid.net ✅')
    console.log('   5. SendGrid forwards to: https://app.leadsup.io/api/webhooks/sendgrid')
    console.log('   6. Webhook should find campaign_sender for: test@reply.leadsup.io')
    console.log('   7. Message stored in database')
    
    console.log('\n6️⃣ TROUBLESHOOTING CHECKLIST')
    console.log('-'.repeat(30))
    console.log('☐ Did you actually reply to the test email?')
    console.log('☐ Did you reply to the LATEST test email (#1754957010588)?')
    console.log('☐ Is SendGrid webhook URL set to HTTPS?')
    console.log('☐ Can you access https://app.leadsup.io/api/webhooks/sendgrid in browser?')
    console.log('☐ Check SendGrid Dashboard > Settings > Inbound Parse')
    console.log('☐ Check SendGrid Dashboard > Activity for webhook failures')
    
  } catch (error) {
    console.error('❌ Debug error:', error.message)
  }
}

debugSendGridFlow()