import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const campaignId = '9e91bc69-521a-4723-bc24-5c51676a93a5'
    
    console.log('🔍 Debugging contact dates and sequence timing...')
    
    // Get contacts with their dates
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email, sequence_step, created_at, updated_at, last_contacted_at')
      .eq('campaign_id', campaignId)
    
    // Get campaign sequences with timing
    const { data: sequences } = await supabase
      .from('campaign_sequences')
      .select('step_number, timing_days, title')
      .eq('campaign_id', campaignId)
      .order('step_number')
    
    const debug = {
      currentTime: new Date().toISOString(),
      contacts: contacts?.map(contact => ({
        id: contact.id,
        email: contact.email,
        sequence_step: contact.sequence_step,
        created_at: contact.created_at,
        updated_at: contact.updated_at,
        last_contacted_at: contact.last_contacted_at,
        dates_parsed: {
          created_at_parsed: new Date(contact.created_at).toISOString(),
          created_at_age_days: Math.floor((new Date().getTime() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          updated_at_parsed: contact.updated_at ? new Date(contact.updated_at).toISOString() : null,
          updated_at_age_days: contact.updated_at ? Math.floor((new Date().getTime() - new Date(contact.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : null
        }
      })),
      sequences: sequences?.map(seq => ({
        step: seq.step_number,
        timing_days: seq.timing_days,
        title: seq.title
      }))
    }
    
    // Show what dates would be calculated
    const calculations = contacts?.map(contact => {
      const currentStep = contact.sequence_step || 0
      const nextSequence = sequences?.find(seq => seq.step_number === currentStep + 1)
      
      if (!nextSequence) {
        return {
          contact: contact.email,
          error: 'No next sequence found'
        }
      }
      
      const timingDays = nextSequence.timing_days !== undefined ? nextSequence.timing_days : 0
      
      let calculatedDate
      if (currentStep === 0) {
        // First email logic
        const contactDate = contact.created_at ? new Date(contact.created_at) : new Date()
        calculatedDate = new Date(contactDate)
        calculatedDate.setDate(contactDate.getDate() + timingDays)
      } else {
        // Follow-up email logic  
        const baseDate = contact.updated_at ? new Date(contact.updated_at) : new Date(contact.created_at || new Date())
        calculatedDate = new Date(baseDate)
        calculatedDate.setDate(baseDate.getDate() + timingDays)
      }
      
      return {
        contact: contact.email,
        current_step: currentStep,
        next_sequence: {
          step: nextSequence.step_number,
          timing_days: timingDays,
          title: nextSequence.title
        },
        base_date: currentStep === 0 ? contact.created_at : (contact.updated_at || contact.created_at),
        calculated_date: calculatedDate.toISOString(),
        days_from_now: Math.floor((calculatedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        is_future: calculatedDate > new Date()
      }
    })

    return NextResponse.json({
      success: true,
      debug: debug,
      calculations: calculations,
      summary: {
        oldest_contact_days: Math.max(...(contacts?.map(c => Math.floor((new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))) || [0])),
        sequences_count: sequences?.length || 0,
        timing_days_range: sequences ? `${Math.min(...sequences.map(s => s.timing_days || 0))}-${Math.max(...sequences.map(s => s.timing_days || 0))}` : 'none'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error checking contact dates:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}