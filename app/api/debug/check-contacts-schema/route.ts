import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

// Basic Auth helper function
function validateBasicAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    const expectedUsername = process.env.N8N_API_USERNAME || 'admin'
    const expectedPassword = process.env.N8N_API_PASSWORD || 'password'
    
    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    return false
  }
}

// POST - Check contacts table schema and data
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm=\"Debug API\"' } }
    )
  }

  try {
    console.log('🔍 Checking contacts table schema and data...')

    // Get sample contacts to see table structure
    const { data: sampleContacts, error: contactsError, count } = await supabaseServer
      .from('contacts')
      .select('*', { count: 'exact' })
      .limit(3)

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
    }

    // Check available columns
    const availableColumns = sampleContacts && sampleContacts[0] ? Object.keys(sampleContacts[0]) : []
    const hasAssignedSender = availableColumns.includes('assigned_sender_id')

    // Get counts by campaign
    const { data: campaignCounts, error: campaignError } = await supabaseServer
      .from('contacts')
      .select('campaign_id')
      .not('campaign_id', 'is', null)

    const campaignStats = campaignCounts?.reduce((acc: Record<string, number>, contact) => {
      acc[contact.campaign_id] = (acc[contact.campaign_id] || 0) + 1
      return acc
    }, {}) || {}

    // If assigned_sender_id exists, check assignment status
    let assignmentStatus = null
    if (hasAssignedSender) {
      const { data: assignedCount } = await supabaseServer
        .from('contacts')
        .select('id', { count: 'exact' })
        .not('assigned_sender_id', 'is', null)

      const { data: unassignedCount } = await supabaseServer
        .from('contacts')
        .select('id', { count: 'exact' })
        .is('assigned_sender_id', null)

      assignmentStatus = {
        assigned_contacts: assignedCount?.length || 0,
        unassigned_contacts: unassignedCount?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      contacts_analysis: {
        total_contacts: count || 0,
        sample_contacts: sampleContacts?.map(c => ({
          id: c.id,
          email: c.email,
          first_name: c.first_name,
          campaign_id: c.campaign_id,
          assigned_sender_id: c.assigned_sender_id || null
        })),
        table_schema: {
          available_columns: availableColumns,
          has_assigned_sender_id: hasAssignedSender
        },
        campaign_distribution: campaignStats,
        assignment_status: assignmentStatus
      },
      recommendations: [
        `Found ${count || 0} total contacts in system`,
        hasAssignedSender ? '✅ assigned_sender_id column exists' : '❌ assigned_sender_id column missing - needs to be added',
        count === 0 ? '⚠️ No contacts found - import contacts first' : `✅ ${count} contacts available`,
        assignmentStatus ? 
          `📊 ${assignmentStatus.assigned_contacts} assigned, ${assignmentStatus.unassigned_contacts} unassigned` : 
          '🔧 Assignment tracking not available'
      ]
    })

  } catch (error) {
    console.error('❌ Error checking contacts schema:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check contacts schema',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}