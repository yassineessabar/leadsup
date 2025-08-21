#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

// Use the same credentials as the automation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDatabase() {
  console.log('🔍 Testing database contents...')
  console.log(`📊 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log(`🔑 Has Service Key: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`)
  
  const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
  
  try {
    // Test 1: Check campaigns table
    console.log('\n1️⃣ Checking campaigns table...')
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
    
    if (campaignsError) {
      console.error('❌ Campaign query error:', campaignsError)
    } else {
      console.log(`✅ Campaign found:`, campaigns?.[0])
    }
    
    // Test 2: Check contacts table
    console.log('\n2️⃣ Checking contacts table...')
    const { data: contacts, count: contactsCount, error: contactsError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaignId)
    
    if (contactsError) {
      console.error('❌ Contacts query error:', contactsError)
    } else {
      console.log(`✅ Contacts found: ${contactsCount}`)
      if (contacts && contacts.length > 0) {
        console.log('📝 Sample contacts:')
        contacts.slice(0, 3).forEach(c => {
          console.log(`   - ${c.email} (${c.first_name} ${c.last_name}) - Status: ${c.email_status}`)
        })
      }
    }
    
    // Test 3: Check prospects table
    console.log('\n3️⃣ Checking prospects table...')
    const { data: prospects, count: prospectsCount, error: prospectsError } = await supabase
      .from('prospects')
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaignId)
    
    if (prospectsError) {
      console.error('❌ Prospects query error:', prospectsError)
    } else {
      console.log(`✅ Prospects found: ${prospectsCount}`)
      if (prospects && prospects.length > 0) {
        console.log('📝 Sample prospects:')
        prospects.slice(0, 3).forEach(p => {
          console.log(`   - ${p.email_address || p.email} (${p.first_name} ${p.last_name}) - Status: ${p.email_status}`)
        })
      }
    }
    
    // Test 4: Check ALL campaigns
    console.log('\n4️⃣ Checking all active campaigns...')
    const { data: allCampaigns, error: allCampaignsError } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('status', 'Active')
    
    if (allCampaignsError) {
      console.error('❌ All campaigns query error:', allCampaignsError)
    } else {
      console.log(`✅ All active campaigns: ${allCampaigns?.length || 0}`)
      allCampaigns?.forEach(c => {
        console.log(`   - ${c.name} (${c.id}) - Status: ${c.status}`)
      })
    }
    
    console.log('\n🎯 SUMMARY:')
    console.log(`   Campaign exists: ${campaigns?.length > 0 ? '✅' : '❌'}`)
    console.log(`   Contacts in campaign: ${contactsCount || 0}`)
    console.log(`   Prospects in campaign: ${prospectsCount || 0}`)
    console.log(`   Total records: ${(contactsCount || 0) + (prospectsCount || 0)}`)
    
  } catch (error) {
    console.error('🚨 Test failed:', error)
  }
}

testDatabase()