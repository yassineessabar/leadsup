import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const contactEmail = searchParams.get('email') || 'crytopianconsulting@gmail.com'
    
    console.log(`Checking data for contact: ${contactEmail}`)
    
    // Get contact from database
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', contactEmail)
      .single()
    
    if (contactError) {
      return NextResponse.json({ error: 'Contact not found', details: contactError }, { status: 404 })
    }
    
    // Get progression records
    const { data: progressionRecords, error: progressionError } = await supabase
      .from('prospect_sequence_progress')
      .select('*')
      .eq('campaign_id', contact.campaign_id)
      .eq('prospect_id', String(contact.id))
      .order('created_at', { ascending: false })
    
    // Get email tracking records  
    const { data: emailTracking, error: trackingError } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('contact_id', String(contact.id))
      .order('created_at', { ascending: false })
    
    // Get campaign sequences
    const { data: campaignSequences, error: sequencesError } = await supabase
      .from('campaign_sequences')
      .select('*')
      .eq('campaign_id', contact.campaign_id)
      .order('step_number', { ascending: true })
    
    return NextResponse.json({
      success: true,
      contact: {
        id: contact.id,
        email: contact.email,
        sequence_step: contact.sequence_step,
        last_contacted_at: contact.last_contacted_at,
        updated_at: contact.updated_at,
        campaign_id: contact.campaign_id
      },
      progressionRecords: progressionRecords || [],
      emailTracking: emailTracking || [],
      campaignSequences: campaignSequences?.map(s => ({
        step_number: s.step_number,
        subject: s.subject
      })) || [],
      analysis: {
        databaseSequenceStep: contact.sequence_step,
        progressionRecordsCount: progressionRecords?.length || 0,
        emailTrackingCount: emailTracking?.length || 0,
        totalSequences: campaignSequences?.length || 0,
        expectedFrontendDisplay: contact.sequence_step > 0 
          ? `Should show Step ${contact.sequence_step + 1} of ${campaignSequences?.length || 0}` 
          : 'Should show Step 1 of X',
        actualFrontendIssue: 'Frontend shows all as Upcoming instead of reading sequence_step'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error checking contact data:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}