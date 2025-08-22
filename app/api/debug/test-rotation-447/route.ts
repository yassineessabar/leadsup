import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing rotation logic for contact ID 447...')
    
    const contactId = 447
    
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
    
    // Get senders using EXACT same query as automation
    const { data: senders } = await supabase
      .from('campaign_senders')
      .select('id, email, name, daily_limit, is_active, is_selected')
      .eq('campaign_id', campaign.id)
      .eq('is_selected', true)  // Match timeline query exactly
      .order('email', { ascending: true }) // Consistent ordering
    
    if (!senders || senders.length === 0) {
      return NextResponse.json({ error: 'No selected senders found' }, { status: 404 })
    }
    
    console.log('📧 Timeline senders query result:', senders)
    
    // Filter to only active senders (matching automation logic)
    const activeSenders = senders.filter(s => s.is_active === true)
    console.log('🎯 Active senders for rotation:', activeSenders)
    
    // Apply EXACT same rotation logic as automation
    const contactIdNum = parseInt(String(contactId)) || 0
    const rotationIndex = activeSenders.length > 0 ? contactIdNum % activeSenders.length : 0
    const selectedSender = activeSenders[rotationIndex]
    
    console.log('🔄 Rotation calculation:')
    console.log(`   Contact ID: ${contactId}`)
    console.log(`   Converted to number: ${contactIdNum}`)
    console.log(`   Active senders count: ${activeSenders.length}`)
    console.log(`   Calculation: ${contactIdNum} % ${activeSenders.length} = ${rotationIndex}`)
    console.log(`   Selected sender: ${selectedSender?.email}`)
    
    // Also test what timeline logic would show
    const timelineSenderEmails = senders.map(s => s.email) // What timeline sees
    const timelineIndex = contactIdNum % timelineSenderEmails.length
    const timelineSelectedSender = timelineSenderEmails[timelineIndex]
    
    return NextResponse.json({
      success: true,
      contactId,
      campaign: {
        id: campaign.id,
        name: campaign.name
      },
      senders: {
        all_selected: senders.map(s => ({
          email: s.email,
          is_active: s.is_active,
          is_selected: s.is_selected
        })),
        active_only: activeSenders.map(s => s.email),
        timeline_sees: timelineSenderEmails
      },
      automation_logic: {
        rotation_index: rotationIndex,
        selected_sender: selectedSender?.email,
        calculation: `${contactIdNum} % ${activeSenders.length} = ${rotationIndex}`
      },
      timeline_logic: {
        rotation_index: timelineIndex,
        selected_sender: timelineSelectedSender,
        calculation: `${contactIdNum} % ${timelineSenderEmails.length} = ${timelineIndex}`
      },
      consistency_check: {
        match: selectedSender?.email === timelineSelectedSender,
        automation_sender: selectedSender?.email,
        timeline_sender: timelineSelectedSender,
        issue: selectedSender?.email !== timelineSelectedSender ? 'MISMATCH - different sender arrays or filtering' : 'OK'
      }
    })
    
  } catch (error) {
    console.error('❌ Error testing rotation:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}