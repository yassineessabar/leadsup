import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get campaign and sequence info for contact 1525
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, campaign_id')
      .eq('id', 1525)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Get first sequence for this campaign
    const { data: sequence } = await supabase
      .from('campaign_sequences')
      .select('id, step_number')
      .eq('campaign_id', contact.campaign_id)
      .eq('step_number', 1)
      .single()

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    console.log('Creating progression record:', {
      campaign_id: contact.campaign_id,
      prospect_id: String(contact.id),
      sequence_id: sequence.id
    })

    // Try to create a progression record
    const { data: progression, error: progressError } = await supabase
      .from('prospect_sequence_progress')
      .upsert({
        campaign_id: contact.campaign_id,
        prospect_id: String(contact.id),
        sequence_id: sequence.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'campaign_id,prospect_id,sequence_id'
      })
      .select()

    if (progressError) {
      console.error('Progression error:', progressError)
      return NextResponse.json({
        success: false,
        error: progressError.message,
        details: progressError
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test progression record created',
      contact,
      sequence,
      progression
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}