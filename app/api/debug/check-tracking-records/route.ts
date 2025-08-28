import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('🔍 Checking tracking records for JD John Doe contact...')
    
    // Check email tracking records
    console.log('📧 Checking email_tracking table...')
    const { data: emailTracking, error: emailError } = await supabase
      .from('email_tracking')
      .select('*')
      .or('contact_id.eq.1561,email.eq.sigmaticinvestments@gmail.com')
      .order('created_at', { ascending: false })
    
    if (emailError) {
      console.error('❌ Error fetching email tracking:', emailError)
    } else {
      console.log(`✅ Found ${emailTracking?.length || 0} email tracking records`)
      emailTracking?.forEach((record, i) => {
        console.log(`  ${i + 1}. ID: ${record.id}, Step: ${record.sequence_step}, Status: ${record.status}`)
      })
    }

    // Check progression records  
    console.log('📈 Checking prospect_sequence_progress table...')
    const { data: progression, error: progressError } = await supabase
      .from('prospect_sequence_progress')
      .select('*')
      .eq('prospect_id', '1561')
      .order('created_at', { ascending: false })
    
    if (progressError) {
      console.error('❌ Error fetching progression records:', progressError)
    } else {
      console.log(`✅ Found ${progression?.length || 0} progression records`)
      progression?.forEach((record, i) => {
        console.log(`  ${i + 1}. Campaign: ${record.campaign_id}, Sequence: ${record.sequence_id}, Status: ${record.status}`)
      })
    }

    // Check contact current state
    console.log('👤 Checking contact current state...')
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, sequence_step, last_contacted_at, contact_latest_update_ts')
      .eq('id', 1561)
      .single()
    
    if (contactError) {
      console.error('❌ Error fetching contact:', contactError)
    } else {
      console.log(`✅ Contact state: Step ${contact?.sequence_step}, Last contacted: ${contact?.last_contacted_at}`)
    }

    return NextResponse.json({
      success: true,
      emailTrackingCount: emailTracking?.length || 0,
      progressionCount: progression?.length || 0,
      emailTracking: emailTracking,
      progression: progression,
      contact: contact,
      analysis: {
        hasEmailTracking: (emailTracking?.length || 0) > 0,
        hasProgression: (progression?.length || 0) > 0,
        contactSequenceStep: contact?.sequence_step || 0,
        expectedFrontendDisplay: (emailTracking?.length || 0) > 0 || (progression?.length || 0) > 0 
          ? "Should show sequence 1 as 'Sent'" 
          : "Missing tracking records - will show as 'Up Next'"
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error checking tracking records:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}