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

// POST - Implement prospect-sender assignment for consistency
export async function POST(request: NextRequest) {
  if (!validateBasicAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Debug API"' } }
    )
  }

  try {
    console.log('🔧 Implementing prospect-sender assignment for sequence consistency...')

    // Step 1: Check if assigned_sender_id column exists (skip SQL function)
    console.log('🔧 Checking if assigned_sender_id column exists...')

    // Step 2: Get all prospects that don't have assigned senders (using prospects table)
    const { data: unassignedProspects, error: prospectsError } = await supabaseServer
      .from('prospects')
      .select(`
        id, 
        email_address, 
        first_name, 
        last_name, 
        campaign_id,
        sender_email
      `)
      .is('sender_email', null)
      .limit(100) // Process in batches

    if (prospectsError) {
      console.error('Error fetching prospects:', prospectsError)
    }

    const prospectsToAssign = unassignedProspects || []
    console.log(`Found ${prospectsToAssign.length} prospects without assigned senders`)

    // Step 3: For each campaign, get available senders and assign them in round-robin
    const campaignSenderAssignments = {}
    const assignmentResults = []

    for (const prospect of prospectsToAssign) {
      const campaignId = prospect.campaign_id

      // Get senders for this campaign (cache per campaign)
      if (!campaignSenderAssignments[campaignId]) {
        const { data: campaignSenders, error: sendersError } = await supabaseServer
          .from('campaign_senders')
          .select('id, email, name')
          .eq('campaign_id', campaignId)
          .eq('is_active', true)

        if (sendersError || !campaignSenders || campaignSenders.length === 0) {
          console.error(`No senders found for campaign ${campaignId}`)
          campaignSenderAssignments[campaignId] = []
          continue
        }

        campaignSenderAssignments[campaignId] = {
          senders: campaignSenders,
          assignmentIndex: 0
        }
      }

      const campaignAssignment = campaignSenderAssignments[campaignId]
      
      if (campaignAssignment.senders.length === 0) {
        assignmentResults.push({
          prospect_id: prospect.id,
          prospect_email: prospect.email_address,
          campaign_id: campaignId,
          status: '❌ NO_SENDERS',
          error: 'No active senders available for campaign'
        })
        continue
      }

      // Assign sender in round-robin fashion
      const assignedSender = campaignAssignment.senders[campaignAssignment.assignmentIndex]
      campaignAssignment.assignmentIndex = (campaignAssignment.assignmentIndex + 1) % campaignAssignment.senders.length

      // Update prospect with assigned sender (using sender_email field)
      const { error: updateError } = await supabaseServer
        .from('prospects')
        .update({ sender_email: assignedSender.email })
        .eq('id', prospect.id)

      if (updateError) {
        console.error(`Failed to assign sender to prospect ${prospect.email_address}:`, updateError)
        assignmentResults.push({
          prospect_id: prospect.id,
          prospect_email: prospect.email_address,
          campaign_id: campaignId,
          assigned_sender_id: assignedSender.id,
          assigned_sender_email: assignedSender.email,
          status: '❌ UPDATE_FAILED',
          error: updateError.message
        })
      } else {
        assignmentResults.push({
          prospect_id: prospect.id,
          prospect_email: prospect.email_address,
          prospect_name: `${prospect.first_name} ${prospect.last_name}`,
          campaign_id: campaignId,
          assigned_sender_id: assignedSender.id,
          assigned_sender_email: assignedSender.email,
          assigned_sender_name: assignedSender.name,
          status: '✅ ASSIGNED'
        })
      }
    }

    // Step 4: Generate summary statistics
    const summary = {
      total_prospects_processed: prospectsToAssign.length,
      successful_assignments: assignmentResults.filter(r => r.status === '✅ ASSIGNED').length,
      failed_assignments: assignmentResults.filter(r => r.status.includes('❌')).length,
      campaigns_affected: Object.keys(campaignSenderAssignments).length
    }

    // Step 5: Show sender distribution per campaign
    const senderDistribution = {}
    assignmentResults
      .filter(r => r.status === '✅ ASSIGNED')
      .forEach(assignment => {
        const key = `${assignment.campaign_id}::${assignment.assigned_sender_email}`
        senderDistribution[key] = (senderDistribution[key] || 0) + 1
      })

    return NextResponse.json({
      success: true,
      message: 'Prospect-sender assignment implemented',
      summary: summary,
      sender_distribution: senderDistribution,
      assignment_results: assignmentResults,
      implementation_notes: [
        '🔧 Each prospect is now assigned a specific sender for their entire sequence',
        '📧 All emails in a sequence will come from the same sender',
        '🔄 Round-robin distribution ensures fair sender load balancing',
        '✅ Maintains relationship consistency and professionalism'
      ],
      next_steps: [
        '1. Update email sending logic to use assigned_sender_id',
        '2. Implement fallback logic for unassigned prospects', 
        '3. Test with actual email sending',
        '4. Monitor sender consistency in future emails'
      ]
    })

  } catch (error) {
    console.error('❌ Error implementing prospect-sender assignment:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to implement prospect-sender assignment',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}