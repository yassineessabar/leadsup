import { NextRequest, NextResponse } from 'next/server'
import { cookies } from "next/headers"
import { getSupabaseServerClient } from "@/lib/supabase"


// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    // Query user_sessions table to get user_id
    const { data, error } = await getSupabaseServerClient()
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      console.error("Error fetching user from session:", error)
      return null
    }

    return data.user_id
  } catch (error) {
    console.error("Error in getUserIdFromSession:", error)
    return null
  }
}

// GET /api/campaigns/[id]/senders - Get selected senders for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: campaignId } = await params

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await getSupabaseServerClient()
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Get all sender assignments for this campaign from the existing campaign_senders table
    console.log('📖 DEBUGGING CAMPAIGN SENDERS API:')
    console.log(`🏷️ Campaign ID: ${campaignId}`)
    console.log(`👤 User ID: ${userId}`)
    
    const { data: assignmentsData, error: assignmentsError } = await getSupabaseServerClient()
      .from('campaign_senders')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_selected', true)
      .order('email', { ascending: true })

    if (assignmentsError) {
      console.error('Error fetching campaign senders:', assignmentsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch campaign senders' },
        { status: 500 }
      )
    }

    const assignments = assignmentsData || []
    console.log(`📋 Found ${assignments.length} assignments for campaign ${campaignId}`)
    
    // Use existing health scores from database - they're already stored in campaign_senders table
    // Health scores are calculated and updated by:
    // 1. The warmup automation (every time it runs)
    // 2. The dedicated health-score API endpoint (when specifically requested)
    // We should NOT recalculate them on every fetch - that's too slow!
    
    // Just ensure each assignment has a health score (use existing or default)
    const assignmentsWithScores = assignments.map(assignment => {
      if (!assignment.health_score && assignment.health_score !== 0) {
        // Only use default if truly missing
        return { ...assignment, health_score: 75 }
      }
      return assignment
    })
    
    console.log(`📊 Returning ${assignmentsWithScores.length} assignments with cached health scores`)

    return NextResponse.json({
      success: true,
      assignments: assignmentsWithScores
    })

  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]/senders:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/campaigns/[id]/senders - Assign senders to a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 POST /api/campaigns/[id]/senders called')
    
    const userId = await getUserIdFromSession()
    console.log('👤 User ID:', userId)
    
    if (!userId) {
      console.log('❌ No user ID found - unauthorized')
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: campaignId } = await params
    console.log('📋 Campaign ID:', campaignId)
    
    const body = await request.json()
    console.log('📦 Request body:', body)
    
    const { selectedSenderIds } = body
    console.log('📋 Selected sender IDs:', selectedSenderIds)

    if (!Array.isArray(selectedSenderIds)) {
      return NextResponse.json(
        { success: false, error: 'selectedSenderIds must be an array' },
        { status: 400 }
      )
    }

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await getSupabaseServerClient()
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Verify all sender accounts belong to verified domains owned by the user
    if (selectedSenderIds.length > 0) {
      const { data: senderAccounts, error: sendersError } = await getSupabaseServerClient()
        .from('sender_accounts')
        .select(`
          id,
          email,
          domain_id,
          domains:domain_id (
            id,
            domain,
            status,
            user_id
          )
        `)
        .in('id', selectedSenderIds)

      if (sendersError) {
        console.error('Error verifying sender accounts:', sendersError)
        return NextResponse.json(
          { success: false, error: 'Failed to verify sender accounts' },
          { status: 500 }
        )
      }

      // Check that all senders belong to verified domains owned by the user
      const invalidSenders = senderAccounts?.filter(sender => 
        !sender.domains || 
        sender.domains.user_id !== userId || 
        sender.domains.status !== 'verified'
      )

      if (invalidSenders && invalidSenders.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Some sender accounts are invalid or belong to unverified domains' },
          { status: 400 }
        )
      }
    }

    // Use the existing campaign_senders table instead of campaign_sender_assignments
    console.log('📝 Using existing campaign_senders table...')
    
    // First, remove all existing assignments for this campaign
    const { error: deleteError } = await getSupabaseServerClient()
      .from('campaign_senders')
      .delete()
      .eq('campaign_id', campaignId)

    if (deleteError) {
      console.error('Error deleting existing campaign senders:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to update sender assignments' },
        { status: 500 }
      )
    }

    // Add new assignments if any senders are selected
    if (selectedSenderIds.length > 0) {
      console.log('📝 Inserting new sender assignments...')
      
      // Since campaign_senders table doesn't have sender_id column, we need to get the sender details first
      const { data: senderAccounts, error: senderError } = await getSupabaseServerClient()
        .from('sender_accounts')
        .select('id, email, display_name')
        .in('id', selectedSenderIds)

      if (senderError || !senderAccounts) {
        console.error('❌ Error fetching sender accounts:', senderError)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch sender account details' },
          { status: 500 }
        )
      }

      // Create assignments using email field (which exists in campaign_senders table)
      const emailBasedAssignments = senderAccounts.map(sender => ({
        campaign_id: campaignId,
        user_id: userId, // Required field
        email: sender.email, // Required field
        name: sender.display_name || sender.email.split('@')[0],
        sender_type: 'email',
        is_selected: true,
        is_active: true,
        // Note: access_token and expires_at are required but we don't have them from sender_accounts
        // This suggests the table design needs to be aligned with the use case
        access_token: 'placeholder', // Temporary placeholder
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      }))

      console.log('📋 Attempting email-based insert:', emailBasedAssignments)

      const { data: insertData, error: insertError } = await getSupabaseServerClient()
        .from('campaign_senders')
        .upsert(emailBasedAssignments, { 
          onConflict: 'campaign_id,email',
          ignoreDuplicates: false 
        })
        .select()

      if (insertError) {
        console.error('❌ Error with email-based insert:', insertError)
        return NextResponse.json(
          { success: false, error: `Failed to assign senders: ${insertError.message}` },
          { status: 500 }
        )
      }

      console.log('✅ Email-based insert successful:', insertData)
    }

    const successResponse = {
      success: true,
      message: `${selectedSenderIds.length} sender(s) assigned to campaign`,
      assignedCount: selectedSenderIds.length
    }
    
    console.log('✅ Returning success response:', successResponse)
    return NextResponse.json(successResponse)

  } catch (error) {
    console.error('❌ Caught error in POST /api/campaigns/[id]/senders:', error)
    const errorResponse = { success: false, error: 'Internal server error' }
    console.log('❌ Returning error response:', errorResponse)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// DELETE /api/campaigns/[id]/senders - Remove specific sender from campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)
    const senderId = searchParams.get('senderId')

    if (!senderId) {
      return NextResponse.json(
        { success: false, error: 'senderId parameter is required' },
        { status: 400 }
      )
    }

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await getSupabaseServerClient()
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Remove the specific sender assignment
    const { error: deleteError } = await getSupabaseServerClient()
      .from('campaign_sender_assignments')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('sender_account_id', senderId)

    if (deleteError) {
      console.error('Error removing sender assignment:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to remove sender from campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Sender removed from campaign successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/campaigns/[id]/senders:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}