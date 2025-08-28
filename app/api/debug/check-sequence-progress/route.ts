import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId') || '1540' // Default to one of the failing contacts
    
    console.log(`Checking sequence progress for contact: ${contactId}`)
    
    // Get contact info
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, sequence_step, campaign_id, last_contacted_at, updated_at')
      .eq('id', parseInt(contactId))
      .single()
    
    if (contactError) {
      return NextResponse.json({ error: 'Contact not found', details: contactError }, { status: 404 })
    }
    
    // Get progression records
    const { data: progressionRecords, error: progressionError } = await supabase
      .from('prospect_sequence_progress')
      .select('*')
      .eq('campaign_id', contact.campaign_id)
      .eq('prospect_id', contactId)
      .order('created_at', { ascending: false })
    
    // Get email tracking records
    const { data: emailTracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('contact_id', contactId)
      .eq('campaign_id', contact.campaign_id)
      .order('created_at', { ascending: false })
    
    // Get campaign sequences for reference
    const { data: campaignSequences, error: sequencesError } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', contact.campaign_id)
      .order('step_number', { ascending: true })
    
    return NextResponse.json({
      success: true,
      contactId: contactId,
      contact: contact,
      progressionRecords: progressionRecords || [],
      emailTracking: emailTracking || [],
      campaignSequences: campaignSequences || [],
      analysis: {
        contactSequenceStep: contact.sequence_step,
        progressionRecordsCount: progressionRecords?.length || 0,
        emailTrackingCount: emailTracking?.length || 0,
        lastContactedAt: contact.last_contacted_at,
        shouldShowStep: contact.sequence_step > 0 ? `Step ${contact.sequence_step} of ${campaignSequences?.length || 0}` : 'Step 1 of X',
        frontendMightShow: progressionRecords?.length > 0 ? `Step ${progressionRecords.length + 1} based on progression records` : 'Step 1 based on no progression records'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error checking sequence progress:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}