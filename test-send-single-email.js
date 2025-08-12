#!/usr/bin/env node

/**
 * Send a single test email to verify the improved parsing works
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function sendSingleTestEmail() {
  try {
    console.log('📧 Sending single test email for parsing verification\n')
    
    // Send using the send-emails endpoint
    const response = await fetch('http://localhost:3000/api/campaigns/automation/send-emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64'),
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('❌ Send failed:', response.status, response.statusText)
      return
    }
    
    const result = await response.json()
    console.log('📤 Send result:', JSON.stringify(result, null, 2))
    
    if (result.sent > 0) {
      console.log('\n✅ Test email sent successfully!')
      console.log('📱 Check your email and reply to test the improved parsing')
      console.log('🎯 The reply should show only your actual message, not the quoted content')
    } else {
      console.log('❌ No emails were sent')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

sendSingleTestEmail()