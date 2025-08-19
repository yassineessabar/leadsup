#!/usr/bin/env node

/**
 * Find Actually Processed Contacts
 * 
 * Investigates which specific contacts were processed in the recent automation run
 * to understand why our test contacts were ignored
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CAMPAIGN_ID = '695fcc7f-7674-4d1f-adf2-ff910ffdb853'

async function findActualProcessedContacts() {
  const now = new Date()
  
  console.log('🔍 FINDING ACTUALLY PROCESSED CONTACTS')
  console.log('═'.repeat(80))
  console.log(`⏰ Analysis Time: ${now.toISOString()}`)
  console.log(`📊 Looking for contacts processed in last 2 hours`)
  console.log('')

  // Get all recent email tracking records (this shows what was actually sent)
  const { data: recentTracking } = await supabase
    .from('email_tracking')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .gte('sent_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())
    .order('sent_at', { ascending: false })

  console.log(`📋 Found ${recentTracking?.length || 0} recent email tracking records`)
  
  if (!recentTracking || recentTracking.length === 0) {
    console.log('❌ No recent email activity found!')
    return
  }

  // Group by contact to see unique contacts processed
  const contactIds = [...new Set(recentTracking.map(t => t.contact_id))]
  console.log(`📧 Unique contacts processed: ${contactIds.length}`)
  console.log('')

  // Get details of each processed contact
  for (const contactId of contactIds) {
    // Try prospects table first (UUID format)
    let contact = null
    let source = 'unknown'
    
    if (contactId.includes('-')) {
      // UUID format - check prospects
      const { data: prospectData } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', contactId)
        .single()
      
      if (prospectData) {
        contact = prospectData
        source = 'prospects'
      }
    } else {
      // Integer format - check contacts (legacy)
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', parseInt(contactId))
        .single()
      
      if (contactData) {
        contact = {
          ...contactData,
          email_address: contactData.email, // Normalize field name
        }
        source = 'contacts'
      }
    }

    if (!contact) {
      console.log(`❌ Contact ${contactId} not found in database!`)
      continue
    }

    const contactEmails = recentTracking.filter(t => t.contact_id === contactId)
    
    console.log(`📧 PROCESSED CONTACT:`)
    console.log(`   ID: ${contactId} (${source} table)`)
    console.log(`   Email: ${contact.email_address || contact.email}`)
    console.log(`   Name: ${contact.first_name} ${contact.last_name}`)
    console.log(`   Company: ${contact.company || contact.company_name}`)
    console.log(`   Location: ${contact.location}`)
    console.log(`   Created: ${contact.created_at}`)
    console.log(`   📤 Emails sent: ${contactEmails.length}`)
    
    contactEmails.forEach((email, index) => {
      console.log(`      ${index + 1}. Sent at: ${email.sent_at}`)
      console.log(`         Status: ${email.status}`)
      console.log(`         Message ID: ${email.message_id}`)
    })
    
    // Check if this is one of our test contacts
    const isTestContact = contact.email_address?.includes('test.') || contact.email?.includes('test.')
    console.log(`   🧪 Test contact: ${isTestContact ? '✅ YES' : '❌ NO'}`)
    console.log('')
  }

  // Analyze why our new contacts weren't processed
  console.log('═'.repeat(80))
  console.log('🔍 ANALYZING WHY NEW CONTACTS WERE NOT PROCESSED')
  console.log('═'.repeat(80))

  // Check if our new contacts exist in the right campaign
  const { data: ourContacts } = await supabase
    .from('prospects')
    .select('*')
    .like('email_address', 'automation.test.%@example.com')
    .eq('campaign_id', CAMPAIGN_ID)

  console.log(`📧 Our new test contacts in database: ${ourContacts?.length || 0}`)
  
  if (ourContacts && ourContacts.length > 0) {
    console.log('\n📋 Our test contacts details:')
    ourContacts.forEach(contact => {
      console.log(`   📧 ${contact.email_address}`)
      console.log(`      ID: ${contact.id}`)
      console.log(`      Campaign: ${contact.campaign_id}`)
      console.log(`      Created: ${contact.created_at}`)
      console.log(`      Location: ${contact.location}`)
    })

    // Check if any have progression records
    console.log('\n🔍 Checking progression records for our contacts...')
    for (const contact of ourContacts) {
      const { data: progression } = await supabase
        .from('prospect_sequence_progress')
        .select('*')
        .eq('prospect_id', contact.id)

      console.log(`   📧 ${contact.email_address}: ${progression?.length || 0} progression records`)
    }
  }

  // Check automation query logic
  console.log('\n🔍 INVESTIGATING AUTOMATION QUERY LOGIC:')
  console.log('─'.repeat(80))
  console.log('The automation queries for contacts using:')
  console.log('1. prospects table: .select("*").order("created_at", { ascending: true }).limit(50)')
  console.log('2. contacts table: .select("*").order("created_at", { ascending: true }).limit(50)')
  console.log('')
  console.log('Possible reasons our contacts were not processed:')
  console.log('• They might be beyond the 50 contact limit')
  console.log('• They might not meet hidden filtering criteria')
  console.log('• The campaign_id filter might not be working')
  console.log('• The automation might process oldest contacts first')

  // Test the actual automation query
  console.log('\n🧪 TESTING AUTOMATION QUERY:')
  console.log('─'.repeat(80))
  
  const { data: prospectQuery } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(50)

  console.log(`📊 Automation prospects query returns: ${prospectQuery?.length || 0} contacts`)
  
  if (prospectQuery && prospectQuery.length > 0) {
    console.log('   📅 Oldest 5 contacts:')
    prospectQuery.slice(0, 5).forEach((contact, index) => {
      console.log(`      ${index + 1}. ${contact.email_address} (${contact.created_at})`)
    })
    
    console.log('   📅 Newest 5 contacts:')
    prospectQuery.slice(-5).forEach((contact, index) => {
      console.log(`      ${index + 1}. ${contact.email_address} (${contact.created_at})`)
    })
  }

  return {
    processedContacts: contactIds.length,
    trackingRecords: recentTracking.length,
    ourContactsInDb: ourContacts?.length || 0,
    totalProspectsInQuery: prospectQuery?.length || 0
  }
}

// Run analysis
findActualProcessedContacts()
  .then((result) => {
    console.log(`\n✅ Analysis complete:`)
    console.log(`   📧 Processed contacts: ${result.processedContacts}`)
    console.log(`   📋 Tracking records: ${result.trackingRecords}`)
    console.log(`   🧪 Our contacts in DB: ${result.ourContactsInDb}`)
    console.log(`   📊 Total prospects in query: ${result.totalProspectsInQuery}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Analysis failed:', error)
    process.exit(1)
  })