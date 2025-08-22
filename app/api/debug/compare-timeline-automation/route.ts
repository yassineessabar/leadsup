import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging timeline vs automation sender selection...')
    
    // Get active campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'Active')
      .limit(1)
      .single()
    
    if (!campaign) {
      return NextResponse.json({ error: 'No active campaign found' }, { status: 404 })
    }
    
    // Get contact for mouai.tax@gmail.com
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', 'mouai.tax@gmail.com')
      .eq('campaign_id', campaign.id)
      .single()
    
    if (!contact) {
      return NextResponse.json({ error: 'Contact mouai.tax@gmail.com not found' }, { status: 404 })
    }
    
    // TIMELINE LOGIC: Get senders exactly like timeline does
    const { data: timelineSenders } = await supabase
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('is_selected', true)
      .order('email', { ascending: true })
    
    // AUTOMATION LOGIC: Get senders exactly like automation does  
    const { data: automationSenders } = await supabase
      .from('campaign_senders')
      .select('id, email, name, daily_limit, is_active, is_selected')
      .eq('campaign_id', campaign.id)
      .eq('is_selected', true)
      .order('email', { ascending: true })
    
    // Calculate timeline assignment
    const timelineSenderEmails = timelineSenders?.map(s => s.email) || []
    const timelineContactId = parseInt(String(contact.id)) || 0
    const timelineIndex = timelineContactId % timelineSenderEmails.length
    const timelineAssignment = timelineSenderEmails[timelineIndex]
    
    // Calculate automation assignment  
    const automationSenderEmails = automationSenders?.map(s => s.email) || []
    const automationContactId = parseInt(String(contact.id)) || 0
    const automationIndex = automationContactId % automationSenderEmails.length
    const automationAssignment = automationSenderEmails[automationIndex]
    
    return NextResponse.json({
      success: true,
      contact: {
        id: contact.id,
        email: contact.email,
        campaign_id: contact.campaign_id
      },
      timeline_logic: {
        senders_query: 'WHERE campaign_id = ? AND is_selected = true ORDER BY email ASC',
        senders_found: timelineSenders?.map(s => ({
          email: s.email,
          is_active: s.is_active,
          is_selected: s.is_selected
        })),
        sender_emails: timelineSenderEmails,
        contact_id: timelineContactId,
        calculation: `${timelineContactId} % ${timelineSenderEmails.length} = ${timelineIndex}`,
        assigned_sender: timelineAssignment
      },
      automation_logic: {
        senders_query: 'WHERE campaign_id = ? AND is_selected = true ORDER BY email ASC',
        senders_found: automationSenders?.map(s => ({
          email: s.email,
          is_active: s.is_active,
          is_selected: s.is_selected
        })),
        sender_emails: automationSenderEmails,
        contact_id: automationContactId,
        calculation: `${automationContactId} % ${automationSenderEmails.length} = ${automationIndex}`,
        assigned_sender: automationAssignment
      },
      comparison: {
        same_contact_id: timelineContactId === automationContactId,
        same_sender_arrays: JSON.stringify(timelineSenderEmails) === JSON.stringify(automationSenderEmails),
        same_assignment: timelineAssignment === automationAssignment,
        timeline_shows: timelineAssignment,
        automation_should_send: automationAssignment,
        match: timelineAssignment === automationAssignment ? 'CONSISTENT' : 'INCONSISTENT'
      },
      debug_info: {
        timeline_sender_count: timelineSenderEmails.length,
        automation_sender_count: automationSenderEmails.length,
        timeline_senders_active_status: timelineSenders?.map(s => `${s.email}:${s.is_active}`),
        automation_senders_active_status: automationSenders?.map(s => `${s.email}:${s.is_active}`)
      }
    })
    
  } catch (error) {
    console.error('❌ Error debugging timeline vs automation:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}