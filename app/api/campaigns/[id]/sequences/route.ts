import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseServer } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabaseServer
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
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Fetch sequences with optimized select - only get needed fields
    const { data: sequences, error: sequenceError } = await supabaseServer
      .from("campaign_sequences")
      .select("id, step_number, subject, content, timing_days, variants, sequence_number, sequence_step, title, outreach_method")
      .eq("campaign_id", campaignId)
      .order("step_number", { ascending: true })

    if (sequenceError) {
      return NextResponse.json({ success: false, error: sequenceError.message }, { status: 500 })
    }

    if (!sequences || sequences.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Optimized transformation - pre-calculate defaults to avoid repeated conditionals
    const transformedSequences = sequences.map((seq) => {
      const stepNumber = seq.step_number || 1
      return {
        id: stepNumber,
        type: seq.outreach_method || "email",
        subject: seq.subject || "",
        content: seq.content || "",
        timing: seq.timing_days || (stepNumber === 1 ? 0 : 1),
        variants: seq.variants || 1,
        sequence: seq.sequence_number || 1,
        sequenceStep: seq.sequence_step || stepNumber,
        title: seq.title || `Email ${seq.sequence_step || stepNumber}`,
        outreach_method: seq.outreach_method || "email"
      }
    })


    return NextResponse.json({ success: true, data: transformedSequences })

  } catch (error) {
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
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("user_id", userId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    // Process sequences for saving
    if (sequences && sequences.length > 0) {

      // Sort sequences by their intended order before saving
      const sortedSequences = sequences.sort((a: any, b: any) => {
        const aStep = a.sequenceStep || a.id || 1
        const bStep = b.sequenceStep || b.id || 1
        return aStep - bStep
      })


      const sequenceData = sortedSequences.map((seq: any, index: number) => ({
        campaign_id: campaignId,
        step_number: index + 1,
        subject: seq.subject || `Email ${index + 1} Subject`,
        content: seq.content || "",
        timing_days: seq.timing || (index === 0 ? 0 : seq.timing || 1),
        variants: seq.variants || 1,
        outreach_method: seq.outreach_method || seq.type || "email",
        sequence_number: seq.sequence || 1,
        sequence_step: index + 1,
        title: seq.title || `Email ${index + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      console.log('💽 Final data for database upsert:', JSON.stringify(sequenceData, null, 2))

      // First, delete all existing sequences for this campaign
      const { error: deleteError } = await supabaseServer
        .from("campaign_sequences")
        .delete()
        .eq("campaign_id", campaignId)

      if (deleteError) {
        return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
      }

      // Then insert new sequences
      const { data: newSequences, error: insertError } = await supabaseServer
        .from("campaign_sequences")
        .insert(sequenceData)
        .select()

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }

      // Update all contacts' sequence_schedule to reflect the new sequences
      await updateContactSequenceSchedules(campaignId, newSequences)

      // Note: Email rescheduling disabled until scheduled_emails table is created
      // await triggerSequenceReschedule(campaignId)

      return NextResponse.json({ success: true, data: newSequences })
    }

    return NextResponse.json({ success: true, data: [] })

  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to trigger email rescheduling after sequence changes
async function triggerSequenceReschedule(campaignId: string) {
  try {
    
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
      } else {
      }
      
    } catch (importError) {
      
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
      } else {
      }
    }
    
  } catch (error) {
  }
}

// Helper function to update contacts' sequence_schedule when sequences change
async function updateContactSequenceSchedules(campaignId: string, newSequences: any[]) {
  try {
    
    // Get all contacts for this campaign that have sequence_schedule
    const { data: contacts, error: contactsError } = await supabaseServer
      .from('contacts')
      .select('id, email, sequence_step, sequence_schedule')
      .eq('campaign_id', campaignId)
      .not('sequence_schedule', 'is', null)
    
    if (contactsError) {
      return
    }
    
    if (!contacts || contacts.length === 0) {
      return
    }
    
    
    // Update each contact's sequence_schedule
    for (const contact of contacts) {
      try {
        const currentSchedule = contact.sequence_schedule
        if (!currentSchedule || !currentSchedule.steps) continue
        
        // Rebuild the schedule based on new sequences
        const newSteps = newSequences.map((seq, index) => {
          const stepNumber = index + 1
          const oldStep = currentSchedule.steps.find((s: any) => s.step === stepNumber)
          
          // Keep existing scheduled_date if step exists, or calculate new one
          let scheduledDate = oldStep?.scheduled_date
          if (!scheduledDate) {
            // Calculate new date based on timing_days
            const baseDate = contact.sequence_step === 0 ? new Date() : new Date(contact.sequence_schedule?.created_at || new Date())
            const timingDays = seq.timing_days || 0
            scheduledDate = new Date(baseDate.getTime() + (timingDays * 24 * 60 * 60 * 1000)).toISOString()
          }
          
          return {
            step: stepNumber,
            scheduled_date: scheduledDate
          }
        })
        
        const updatedSchedule = {
          ...currentSchedule,
          steps: newSteps,
          updated_at: new Date().toISOString()
        }
        
        // Update the contact
        const { error: updateError } = await supabaseServer
          .from('contacts')
          .update({ sequence_schedule: updatedSchedule })
          .eq('id', contact.id)
        
        if (updateError) {
        } else {
        }
        
      } catch (contactError) {
      }
    }
    
    
  } catch (error) {
  }
}