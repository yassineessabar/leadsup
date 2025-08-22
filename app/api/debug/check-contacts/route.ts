import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const campaignId = 'a1eca083-a7c6-489b-b59e-c66aa2b0b601'
    
    // Get contacts for this campaign
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .neq('email_status', 'Completed')
      .neq('email_status', 'Replied') 
      .neq('email_status', 'Unsubscribed')
      .neq('email_status', 'Bounced')
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch contacts',
        details: error
      }, { status: 500 })
    }
    
    // Sample a few contacts for inspection
    const sampleContacts = contacts?.slice(0, 3).map(c => ({
      id: c.id,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      location: c.location,
      email_status: c.email_status,
      sequence_step: c.sequence_step,
      created_at: c.created_at,
      updated_at: c.updated_at
    }))
    
    return NextResponse.json({
      success: true,
      total_contacts: contacts?.length || 0,
      sample_contacts: sampleContacts,
      note: 'Active contacts for the campaign'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}