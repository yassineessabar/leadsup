#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: ['.env.local', '.env'] })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fetchSendGridEvents() {
  console.log('🔍 Fetching open and click events from SendGrid API...\n')
  
  const userId = '16bec73e-34e5-4f25-b3dc-da19906d0a54' // essabar.yassine@gmail.com
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  console.log(`👤 User: essabar.yassine@gmail.com`)
  console.log(`📅 Date range: ${startDate} to ${endDate}`)
  
  try {
    // First, get user's sent emails to find message IDs
    const { data: sentEmails, error: emailError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('direction', 'outbound')
      .gte('created_at', startDate + 'T00:00:00Z')
      .lte('created_at', endDate + 'T23:59:59Z')
      .order('created_at', { ascending: false })
    
    if (emailError) {
      console.log('❌ Error fetching emails:', emailError)
      return
    }
    
    if (!sentEmails || sentEmails.length === 0) {
      console.log('⚠️ No sent emails found in date range')
      return
    }
    
    console.log(`📧 Found ${sentEmails.length} sent emails`)
    
    // Extract message IDs and email addresses for SendGrid query
    const messageIds = sentEmails
      .map(email => email.provider_message_id)
      .filter(id => id) // Only include emails with SendGrid message IDs
    
    const emailAddresses = [...new Set(sentEmails.map(email => email.contact_email))]
    
    console.log(`🆔 Emails with SendGrid message IDs: ${messageIds.length}`)
    console.log(`📬 Unique recipient emails: ${emailAddresses.length}`)
    
    if (messageIds.length === 0) {
      console.log('⚠️ No SendGrid message IDs found - cannot track opens/clicks')
      console.log('💡 This means either:')
      console.log('   1. Emails were sent before provider_message_id tracking was implemented')
      console.log('   2. Emails were sent through a different method')
      console.log('   3. The campaign sending code needs to be updated')
      console.log('\n🔧 SOLUTION: Send new emails after the fix is deployed')
      return
    }
    
    // Fetch events from SendGrid API
    const sendGridApiKey = process.env.SENDGRID_API_KEY
    if (!sendGridApiKey) {
      console.log('❌ SENDGRID_API_KEY not found in environment variables')
      return
    }
    
    console.log('\n🔗 Fetching events from SendGrid API...')
    
    // Query SendGrid Events API
    const query = new URLSearchParams({
      start_time: Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000).toString(),
      end_time: Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000).toString(),
      limit: '1000'
    })
    
    // Add email filter if we have specific recipients
    if (emailAddresses.length <= 10) { // API has limits on query length
      emailAddresses.forEach(email => {
        query.append('email', email)
      })
    }
    
    const response = await fetch(`https://api.sendgrid.com/v3/messages?${query}`, {
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.log(`❌ SendGrid API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.log('Error details:', errorText)
      return
    }
    
    const data = await response.json()
    console.log(`✅ SendGrid API response received`)
    console.log(`📊 Total messages found: ${data.messages?.length || 0}`)
    
    if (!data.messages || data.messages.length === 0) {
      console.log('⚠️ No messages found in SendGrid for this period')
      return
    }
    
    // Analyze events
    let totalOpens = 0
    let totalClicks = 0
    let uniqueOpens = new Set()
    let uniqueClicks = new Set()
    
    data.messages.forEach(message => {
      if (message.events) {
        message.events.forEach(event => {
          if (event.event_name === 'open') {
            totalOpens++
            uniqueOpens.add(event.email)
          }
          if (event.event_name === 'click') {
            totalClicks++
            uniqueClicks.add(event.email)
          }
        })
      }
    })
    
    console.log('\n📊 EVENT ANALYSIS:')
    console.log(`👀 Total Opens: ${totalOpens}`)
    console.log(`👀 Unique Opens: ${uniqueOpens.size}`)
    console.log(`🖱️ Total Clicks: ${totalClicks}`)
    console.log(`🖱️ Unique Clicks: ${uniqueClicks.size}`)
    
    // Calculate rates
    const openRate = sentEmails.length > 0 ? ((uniqueOpens.size / sentEmails.length) * 100).toFixed(1) : '0.0'
    const clickRate = sentEmails.length > 0 ? ((uniqueClicks.size / sentEmails.length) * 100).toFixed(1) : '0.0'
    
    console.log('\n🎯 CALCULATED RATES:')
    console.log(`📤 Emails Sent: ${sentEmails.length}`)
    console.log(`👀 Open Rate: ${openRate}%`)
    console.log(`🖱️ Click Rate: ${clickRate}%`)
    
    if (totalOpens === 0 && totalClicks === 0) {
      console.log('\n💡 POSSIBLE REASONS FOR 0% RATES:')
      console.log('   1. Emails were sent without tracking enabled')
      console.log('   2. Recipients haven\'t opened the emails yet')
      console.log('   3. Email clients block tracking pixels')
      console.log('   4. Emails are in spam/promotions folder')
      console.log('   5. SendGrid tracking not properly configured')
    }
    
    // Optionally save events to database
    if (totalOpens > 0 || totalClicks > 0) {
      console.log('\n💾 Would you like to save these events to the database? (This would update the dashboard)')
    }
    
  } catch (error) {
    console.error('❌ Error fetching SendGrid events:', error)
  }
}

fetchSendGridEvents().catch(console.error)