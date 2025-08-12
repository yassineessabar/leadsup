#!/usr/bin/env node

/**
 * Check prospect table structure and fix assignments
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ajcubavmrrxzmonsdnsj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkProspectStructure() {
  try {
    console.log('🔍 Checking prospect table structure\n')
    
    // Get Test campaign prospects
    const { data: prospects, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('campaign_id', '73da410f-53a7-4cea-aa91-10e4b56c8fa9')
      .limit(3)
    
    if (prospectError) {
      console.error('❌ Error fetching prospects:', prospectError)
      return
    }
    
    console.log(`✅ Found ${prospects.length} prospects for Test campaign`)
    
    if (prospects.length > 0) {
      console.log('\n📋 Prospect structure:')
      const firstProspect = prospects[0]
      Object.keys(firstProspect).forEach(key => {
        console.log(`   ${key}: ${firstProspect[key]}`)
      })
      
      console.log('\n👥 All prospects:')
      prospects.forEach((prospect, i) => {
        console.log(`${i + 1}. ${prospect.email} - Step: ${prospect.current_sequence_step || 'Not started'}`)
      })
    }
    
    // Check prospect_senders table for assignments
    console.log('\n🔍 Checking prospect_senders table...')
    const { data: assignments, error: assignError } = await supabase
      .from('prospect_senders')
      .select('*')
      .in('prospect_id', prospects.map(p => p.id))
    
    if (assignError) {
      console.error('❌ Error fetching assignments:', assignError)
    } else {
      console.log(`📧 Found ${assignments.length} sender assignments`)
      assignments.forEach((assignment, i) => {
        console.log(`${i + 1}. Prospect: ${assignment.prospect_id} → Sender: ${assignment.sender_email}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkProspectStructure()