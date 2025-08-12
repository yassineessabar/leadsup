#!/usr/bin/env node

/**
 * Check what emails were just sent
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkSentEmails() {
  try {
    console.log('📧 Checking recently sent emails\n')
    
    const correctUserId = '1ecada7a-a538-4ee5-a193-14f5c482f387'
    
    // 1. Check recent outbound messages
    console.log('1. Recent outbound messages:')
    console.log('=' .repeat(50))
    
    const { data: recentSent, error: sentError } = await supabase
      .from('inbox_messages')
      .select('contact_email, sender_email, subject, sent_at, user_id, provider_data')
      .eq('user_id', correctUserId)
      .eq('direction', 'outbound')
      .gte('sent_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
      .order('sent_at', { ascending: false })
    
    if (sentError) {
      console.error('❌ Error:', sentError)
      return
    }
    
    console.log(`📤 Found ${recentSent.length} emails sent in last 30 minutes:`)
    recentSent.forEach((email, i) => {
      console.log(`${i + 1}. To: ${email.contact_email}`)
      console.log(`   From: ${email.sender_email}`)
      console.log(`   Subject: ${email.subject}`)
      console.log(`   Sent: ${new Date(email.sent_at).toLocaleTimeString()}`)
      console.log(`   Provider: ${email.provider_data?.provider || 'unknown'}`)
      console.log('')
    })
    
    if (recentSent.length === 0) {
      console.log('❌ No emails sent recently!')
      console.log('🔧 Let me check if there are any pending emails to send...')
      
      // Check pending emails
      const response = await fetch('http://localhost:3000/api/campaigns/automation/process-pending', {
        headers: {
          'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📋 Pending emails check:', data)
      } else {
        console.log('❌ Could not check pending emails')
      }
      
      return
    }
    
    // 2. Check if these are the right email addresses
    console.log('2. Email address verification:')
    console.log('=' .repeat(50))
    
    const emailAddresses = recentSent.map(e => e.contact_email)
    console.log('📧 Emails were sent to:')
    emailAddresses.forEach((email, i) => {
      console.log(`${i + 1}. ${email}`)
    })
    
    console.log('\n🔍 Are these your email addresses?')
    console.log('   If not, we may need to update the campaign prospects')
    
    // 3. Check campaign prospects
    console.log('\n3. Campaign prospects:')
    console.log('=' .repeat(50))
    
    const { data: prospects, error: prospectError } = await supabase
      .from('prospects')
      .select('email, first_name, last_name, campaign_id')
      .eq('campaign_id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9') // Test campaign
    
    if (prospectError) {
      console.error('❌ Prospect error:', prospectError)
    } else {
      console.log(`👥 Campaign prospects:`)
      prospects.forEach((prospect, i) => {
        console.log(`${i + 1}. ${prospect.email} (${prospect.first_name} ${prospect.last_name})`)
      })
    }
    
    // 4. Instructions
    console.log('\n4. Next steps:')
    console.log('=' .repeat(50))
    if (recentSent.length > 0) {
      console.log('✅ Emails were sent successfully!')
      console.log('📱 Check the following email addresses for campaign emails:')
      emailAddresses.forEach((email, i) => {
        console.log(`   ${i + 1}. ${email}`)
      })
      console.log('')
      console.log('🔍 Look for emails with subject: "Una pregunta rápida sobre {{companyName}}"')
      console.log('📧 Reply-To should be: test@reply.leadsup.io')
      console.log('🔄 Reply to one of them to test the capture system')
    } else {
      console.log('❌ No emails were sent')
      console.log('🔧 May need to manually trigger email sending')
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkSentEmails()