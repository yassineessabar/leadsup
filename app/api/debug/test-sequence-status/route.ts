import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const campaignId = '9e91bc69-521a-4723-bc24-5c51676a93a5'
    
    console.log(`📊 Testing sequence status for campaign ${campaignId}`)
    
    // Check contacts table 
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, email_status, sequence_step, campaign_id, created_at')
      .eq('campaign_id', campaignId)
    
    console.log(`🔍 Found ${contacts?.length || 0} contacts`)
    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
    }
    
    // Check email tracking records
    const { data: emailTracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select(`
        contact_id,
        sequence_id,
        sequence_step,
        status,
        sent_at,
        created_at
      `)
      .eq('campaign_id', campaignId)
      .eq('status', 'sent')
      .order('created_at', { ascending: true })
    
    console.log(`📧 Found ${emailTracking?.length || 0} sent emails in tracking`)
    if (trackingError) {
      console.error('Error fetching email tracking:', trackingError)
    }
    
    // Process each contact's sequence status
    const contactStatuses = contacts?.map(contact => {
      // Find tracking records for this contact
      const contactProgress = emailTracking?.filter(t => 
        t.contact_id === contact.id.toString() || 
        t.contact_id === contact.id
      ) || []
      
      const sentCount = contactProgress.filter(p => p.status === 'sent').length
      
      console.log(`🔍 Contact ${contact.email} (ID: ${contact.id}):`)
      console.log(`   - Found ${contactProgress.length} tracking records`)
      console.log(`   - Sent count: ${sentCount}`)
      console.log(`   - Sequence step from contacts table: ${contact.sequence_step}`)
      
      // Generate sequence timeline
      const sequences = []
      for (let i = 1; i <= 6; i++) {
        let sequenceStatus = 'upcoming'
        let sentAt = null
        
        // Check if we have tracking record for this step
        const stepProgress = contactProgress.find(p => p.sequence_step === i)
        if (stepProgress) {
          sequenceStatus = stepProgress.status
          sentAt = stepProgress.sent_at
        } else if (i <= sentCount) {
          // Fallback: if we have sent count but no specific tracking
          sequenceStatus = 'sent'
        }
        
        sequences.push({
          step: i,
          status: sequenceStatus,
          sent_at: sentAt
        })
      }
      
      return {
        prospect_id: contact.id.toString(),
        email: contact.email,
        first_name: contact.first_name,
        last_name: contact.last_name,
        current_step: Math.max(sentCount, contact.sequence_step || 0),
        sequences_sent: sentCount,
        sequences: sequences,
        debug: {
          contactTableStep: contact.sequence_step,
          trackingRecords: contactProgress.length,
          sentFromTracking: sentCount
        }
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: contactStatuses,
      debug: {
        contactsFound: contacts?.length || 0,
        trackingRecordsFound: emailTracking?.length || 0,
        firstContact: contactStatuses[0] || null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error testing sequence status:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}