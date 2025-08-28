import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const campaignId = '9e91bc69-521a-4723-bc24-5c51676a93a5'
    
    console.log('🔍 Checking what the automation sees...')
    
    // Replicate the automation logic exactly
    // Step 1: Get "Due next" contacts (what frontend shows)
    const { data: dueNextContacts, error: dueError } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'Due next')
    
    // Step 2: Get all active contacts (what automation looks for)
    const { data: allContacts, error: allError } = await supabase
      .from('contacts')
      .select('*')
      .eq('campaign_id', campaignId)
      .neq('email_status', 'Completed')
      .neq('email_status', 'Replied')
      .neq('email_status', 'Unsubscribed')
      .neq('email_status', 'Bounced')

    console.log(`📋 Due Next Contacts: ${dueNextContacts?.length || 0}`)
    console.log(`📋 All Active Contacts: ${allContacts?.length || 0}`)

    return NextResponse.json({
      success: true,
      campaignId,
      debug: {
        dueNextQuery: {
          count: dueNextContacts?.length || 0,
          error: dueError?.message || null,
          contacts: dueNextContacts?.map(c => ({
            id: c.id,
            email: c.email,
            status: c.status,
            email_status: c.email_status,
            sequence_step: c.sequence_step,
            created_at: c.created_at
          })) || []
        },
        allActiveQuery: {
          count: allContacts?.length || 0, 
          error: allError?.message || null,
          contacts: allContacts?.map(c => ({
            id: c.id,
            email: c.email,
            status: c.status,
            email_status: c.email_status,
            sequence_step: c.sequence_step,
            created_at: c.created_at
          })) || []
        }
      },
      analysis: {
        possibleIssues: [
          dueNextContacts?.length === 0 ? "No contacts with status='Due next' found" : null,
          allContacts?.length === 0 ? "No active contacts found for campaign" : null,
          dueError ? `Error querying Due next contacts: ${dueError.message}` : null,
          allError ? `Error querying all contacts: ${allError.message}` : null
        ].filter(Boolean)
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error checking automation contacts:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}