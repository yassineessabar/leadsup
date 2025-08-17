import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSupabaseClient, getSupabaseServerClient } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await getSupabaseServerClient()
      .from("user_sessions")
      .select("user_id, expires_at")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

// GET - Fetch sequences for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const campaignId = (await params).id

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await getSupabaseServerClient()
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Fetch sequences
    const { data: sequences, error: sequenceError } = await getSupabaseServerClient()
      .from("campaign_sequences")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("step_number", { ascending: true })

    if (sequenceError) {
      console.error("❌ Error fetching sequences:", sequenceError)
      return NextResponse.json({ success: false, error: sequenceError.message }, { status: 500 })
    }

    if (!sequences || sequences.length === 0) {
      console.log("ℹ️ No sequences found for campaign:", campaignId)
      return NextResponse.json({ success: true, data: [] })
    }

    console.log(`📖 Fetched ${sequences.length} sequences from database for campaign ${campaignId}`)
    console.log('🔍 Raw database data:', JSON.stringify(sequences, null, 2))

    // Transform database format back to component format
    const transformedSequences = sequences.map((seq) => ({
      id: seq.step_number, // Use step_number as frontend ID for consistency
      type: seq.outreach_method || "email",
      subject: seq.subject || "",
      content: seq.content || "",
      timing: seq.timing_days || (seq.step_number === 1 ? 0 : 1),
      variants: seq.variants || 1,
      sequence: seq.sequence_number || 1,
      sequenceStep: seq.sequence_step || seq.step_number,
      title: seq.title || `Email ${seq.sequence_step || seq.step_number}`,
      outreach_method: seq.outreach_method || "email",
      // Keep database metadata for debugging
      _dbId: seq.id,
      _stepNumber: seq.step_number
    }))

    console.log('🔄 Transformed sequences for frontend:', JSON.stringify(transformedSequences.map(s => ({
      id: s.id,
      title: s.title,
      subject: s.subject,
      timing: s.timing,
      sequence: s.sequence,
      sequenceStep: s.sequenceStep
    })), null, 2))

    return NextResponse.json({ success: true, data: transformedSequences })

  } catch (error) {
    console.error("❌ Error fetching sequences:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// POST - Save/update sequences for a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const campaignId = (await params).id
    const body = await request.json()
    const { sequences } = body

    // Verify campaign belongs to user
    const { data: campaign, error: campaignError } = await getSupabaseServerClient()
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Delete existing sequences
    const { error: deleteError } = await getSupabaseServerClient()
      .from("campaign_sequences")
      .delete()
      .eq("campaign_id", campaignId)

    if (deleteError) {
      console.error("❌ Error deleting sequences:", deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    // Insert new sequences
    if (sequences && sequences.length > 0) {
      console.log('💾 Processing sequences for database insert:', JSON.stringify(sequences.map(s => ({
        id: s.id,
        title: s.title,
        subject: s.subject,
        sequence: s.sequence,
        sequenceStep: s.sequenceStep,
        timing: s.timing,
        type: s.type
      })), null, 2))

      // Sort sequences by their intended order before saving
      const sortedSequences = sequences.sort((a: any, b: any) => {
        // Sort by sequenceStep if available, otherwise by array index
        const aStep = a.sequenceStep || a.id || 1
        const bStep = b.sequenceStep || b.id || 1
        return aStep - bStep
      })

      console.log('🔄 Sorted sequences before save:', JSON.stringify(sortedSequences.map(s => ({
        id: s.id,
        sequenceStep: s.sequenceStep,
        subject: s.subject?.substring(0, 30)
      })), null, 2))

      const sequenceData = sortedSequences.map((seq: any, index: number) => ({
        campaign_id: campaignId,
        step_number: index + 1, // Use sorted array index as step_number
        subject: seq.subject || `Email ${index + 1} Subject`,
        content: seq.content || "",
        timing_days: seq.timing || (index === 0 ? 0 : seq.timing || 1),
        variants: seq.variants || 1,
        outreach_method: seq.outreach_method || seq.type || "email",
        sequence_number: seq.sequence || 1,
        sequence_step: index + 1, // Use sorted array index as sequence_step too
        title: seq.title || `Email ${index + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      console.log('💽 Final data for database insert:', JSON.stringify(sequenceData, null, 2))

      const { data: newSequences, error: insertError } = await getSupabaseServerClient()
        .from("campaign_sequences")
        .insert(sequenceData)
        .select()

      if (insertError) {
        console.error("❌ Error inserting sequences:", insertError)
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }

      // Note: Email rescheduling disabled until scheduled_emails table is created
      // await triggerSequenceReschedule(campaignId)

      return NextResponse.json({ success: true, data: newSequences })
    }

    return NextResponse.json({ success: true, data: [] })

  } catch (error) {
    console.error("❌ Error saving sequences:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to trigger email rescheduling after sequence changes
async function triggerSequenceReschedule(campaignId: string) {
  try {
    console.log(`🔄 Triggering email reschedule for campaign ${campaignId} after sequence change`)
    
    // Import and call the reschedule function directly to avoid URL/port issues
    try {
      // Dynamically import the reschedule route handler
      const rescheduleModule = await import('../reschedule-emails/route')
      
      // Create a mock request object
      const mockRequest = new Request(`http://localhost/api/campaigns/${campaignId}/reschedule-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      // Create mock params
      const mockParams = { params: Promise.resolve({ id: campaignId }) }
      
      // Call the POST handler directly
      const response = await rescheduleModule.POST(mockRequest, mockParams)
      const result = await response.json()
      
      if (response.ok) {
        console.log(`✅ Successfully triggered reschedule: ${result.message || 'Reschedule completed'}`)
      } else {
        console.error(`❌ Reschedule failed: ${result.error || 'Unknown error'}`)
      }
      
    } catch (importError) {
      console.error('❌ Failed to import reschedule module, falling back to fetch:', importError.message)
      
      // Fallback to fetch approach
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const rescheduleUrl = `${baseUrl}/api/campaigns/${campaignId}/reschedule-emails`
      
      const rescheduleResponse = await fetch(rescheduleUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (rescheduleResponse.ok) {
        const result = await rescheduleResponse.json()
        console.log(`✅ Successfully triggered reschedule via fetch: ${result.message}`)
      } else {
        console.error('❌ Failed to trigger reschedule via fetch:', rescheduleResponse.statusText)
      }
    }
    
  } catch (error) {
    console.error('❌ Error triggering sequence reschedule:', error)
  }
}