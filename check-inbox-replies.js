#!/usr/bin/env node

/**
 * Check if email replies have been captured in the database
 * 
 * Run this after replying to a test email to verify webhook is working
 * Usage: node check-inbox-replies.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkInboxReplies() {
  console.log('🔍 Checking for Captured Email Replies\n')
  console.log('=' .repeat(50))

  // Load last test details if available
  let lastTest = null
  try {
    if (fs.existsSync('last-test-email.json')) {
      lastTest = JSON.parse(fs.readFileSync('last-test-email.json', 'utf8'))
      console.log('\n📋 Last Test Email Details:')
      console.log(`   Test ID: ${lastTest.testId}`)
      console.log(`   Sent to: ${lastTest.recipientEmail}`)
      console.log(`   Sent at: ${lastTest.sentAt}`)
      console.log(`   Time ago: ${Math.round((Date.now() - new Date(lastTest.sentAt).getTime()) / 60000)} minutes`)
    }
  } catch (error) {
    console.log('No previous test email details found')
  }

  // Check recent inbound messages
  console.log('\n📥 Recent Inbound Messages (Last 24 Hours):')
  console.log('-'.repeat(40))
  
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: messages, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('direction', 'inbound')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('❌ Database error:', error.message)
      return
    }
    
    if (!messages || messages.length === 0) {
      console.log('❌ No inbound messages found in the last 24 hours')
      console.log('\nPossible reasons:')
      console.log('   • No replies have been sent yet')
      console.log('   • Webhook is not receiving data from SendGrid')
      console.log('   • MX records not pointing to SendGrid')
      console.log('   • Database connection issues')
      
      console.log('\n💡 Troubleshooting Steps:')
      console.log('   1. Check SendGrid Activity Feed for inbound emails')
      console.log('   2. Verify MX records: dig MX reply.leadsup.io')
      console.log('   3. Check webhook logs: tail -f your-app-logs')
      console.log('   4. Test webhook manually: node test-webhook-direct.js')
    } else {
      console.log(`✅ Found ${messages.length} inbound message(s):\n`)
      
      messages.forEach((msg, index) => {
        console.log(`📧 Message ${index + 1}:`)
        console.log(`   ID: ${msg.id}`)
        console.log(`   From: ${msg.contact_email}`)
        console.log(`   To: ${msg.sender_email}`)
        console.log(`   Subject: ${msg.subject}`)
        console.log(`   Preview: ${msg.body_text?.substring(0, 100)}...`)
        console.log(`   Provider: ${msg.provider}`)
        console.log(`   Received: ${msg.created_at}`)
        console.log(`   Campaign ID: ${msg.campaign_id || 'None'}`)
        console.log(`   Conversation ID: ${msg.conversation_id}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Failed to check database:', error.message)
  }

  // Check recent threads
  console.log('\n🧵 Recent Email Threads:')
  console.log('-'.repeat(40))
  
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: threads, error } = await supabase
      .from('inbox_threads')
      .select('*')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(5)
    
    if (error) {
      console.error('❌ Database error:', error.message)
      return
    }
    
    if (!threads || threads.length === 0) {
      console.log('No recent thread activity')
    } else {
      console.log(`Found ${threads.length} active thread(s):\n`)
      
      threads.forEach((thread, index) => {
        console.log(`Thread ${index + 1}:`)
        console.log(`   Contact: ${thread.contact_email}`)
        console.log(`   Subject: ${thread.subject}`)
        console.log(`   Messages: ${thread.message_count || 0}`)
        console.log(`   Last Activity: ${thread.last_message_at}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Failed to check threads:', error.message)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 WEBHOOK STATUS CHECK')
  console.log('='.repeat(50))
  
  console.log('\n🔗 SendGrid Configuration:')
  console.log('   Inbound Parse Domain: reply.leadsup.io')
  console.log('   Webhook URL: http://app.leadsup.io/api/webhooks/sendgrid')
  
  console.log('\n📝 To Test the Complete Flow:')
  console.log('   1. Send test email: node test-send-real-email.js your@email.com')
  console.log('   2. Reply to the email you receive')
  console.log('   3. Wait 30-60 seconds')
  console.log('   4. Run this script again to check for replies')
  
  console.log('\n⚠️  If replies are not appearing:')
  console.log('   • Check SendGrid Dashboard → Email Activity')
  console.log('   • Verify DNS MX records are set correctly')
  console.log('   • Ensure webhook endpoint is publicly accessible')
  console.log('   • Check application logs for webhook errors')
}

// Run the check
checkInboxReplies().catch(console.error)