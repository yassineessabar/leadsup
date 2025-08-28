import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const logs: string[] = []
  
  // Override console.log to capture logs
  const originalLog = console.log
  const originalError = console.error
  
  console.log = (...args) => {
    logs.push(`[LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`)
    originalLog(...args)
  }
  
  console.error = (...args) => {
    logs.push(`[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`)
    originalError(...args)
  }

  try {
    console.log('🔍 Starting automation debug with log capture...')
    
    // Test if we have a contact at step 1 that should have tracking records
    console.log('📋 Checking for contacts at step 1...')
    
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, email, sequence_step, campaign_id, first_name, last_name')
      .eq('sequence_step', 1)
      .limit(5)

    if (error) {
      console.error('❌ Error fetching contacts:', error)
    } else {
      console.log(`✅ Found ${contacts?.length || 0} contacts at step 1:`)
      contacts?.forEach(contact => {
        console.log(`  - Contact ${contact.id}: ${contact.first_name} ${contact.last_name} (${contact.email})`)
      })
    }

    // Check for tracking records for these contacts
    if (contacts && contacts.length > 0) {
      const contactIds = contacts.map(c => c.id.toString())
      console.log('🔍 Checking email tracking records for these contacts...')
      
      const { data: trackingRecords, error: trackingError } = await supabase
        .from('email_tracking')
        .select('contact_id, sequence_step, status, sent_at, message_id')
        .in('contact_id', contactIds)

      if (trackingError) {
        console.error('❌ Error fetching tracking records:', trackingError)
      } else {
        console.log(`📧 Found ${trackingRecords?.length || 0} tracking records:`)
        trackingRecords?.forEach(record => {
          console.log(`  - Contact ${record.contact_id}: Step ${record.sequence_step}, Status: ${record.status}`)
        })
      }

      // Check progression records
      console.log('🔍 Checking progression records...')
      const { data: progressRecords, error: progressError } = await supabase
        .from('prospect_sequence_progress')
        .select('prospect_id, sequence_id, status, sent_at, campaign_id')
        .in('prospect_id', contactIds)

      if (progressError) {
        console.error('❌ Error fetching progression records:', progressError)
      } else {
        console.log(`📈 Found ${progressRecords?.length || 0} progression records:`)
        progressRecords?.forEach(record => {
          console.log(`  - Contact ${record.prospect_id}: Status: ${record.status}`)
        })
      }
    }

    console.log('🔍 Debug complete!')

    // Restore original console functions
    console.log = originalLog
    console.error = originalError

    return NextResponse.json({
      success: true,
      logs: logs,
      contactsFound: contacts?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    // Restore original console functions
    console.log = originalLog
    console.error = originalError
    
    console.error('Debug error:', error)
    logs.push(`[ERROR] Debug error: ${error.message}`)

    return NextResponse.json({
      success: false,
      error: error.message,
      logs: logs,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}