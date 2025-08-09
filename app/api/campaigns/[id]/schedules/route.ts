import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase, supabaseServer } from "@/lib/supabase"

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

// GET - Fetch schedules for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { id: campaignId } = await params

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

    // Fetch schedules
    const { data: schedules, error: scheduleError } = await supabaseServer
      .from("campaign_schedules")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true })

    if (scheduleError) {
      console.error("❌ Error fetching schedules:", scheduleError)
      return NextResponse.json({ success: false, error: scheduleError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: schedules || [] })

  } catch (error) {
    console.error("❌ Error fetching schedules:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// POST - Save/update schedule for a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { id: campaignId } = await params
    const body = await request.json()
    const { 
      name,
      fromTime,
      toTime,
      timezone,
      selectedDays,
      scheduleId 
    } = body

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

    const scheduleData = {
      campaign_id: campaignId,
      name: name || "New schedule",
      from_time: fromTime || "9:00 AM",
      to_time: toTime || "6:00 PM",
      timezone: timezone || "eastern",
      monday: selectedDays?.monday ?? true,
      tuesday: selectedDays?.tuesday ?? true,
      wednesday: selectedDays?.wednesday ?? true,
      thursday: selectedDays?.thursday ?? true,
      friday: selectedDays?.friday ?? true,
      saturday: selectedDays?.saturday ?? false,
      sunday: selectedDays?.sunday ?? false,
    }

    let result

    if (scheduleId) {
      // Update existing schedule
      const { data: updatedSchedule, error: updateError } = await supabaseServer
        .from("campaign_schedules")
        .update(scheduleData)
        .eq("id", scheduleId)
        .eq("campaign_id", campaignId)
        .select()
        .single()

      if (updateError) {
        console.error("❌ Error updating schedule:", updateError)
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      result = updatedSchedule
    } else {
      // Create new schedule
      const { data: newSchedule, error: insertError } = await supabaseServer
        .from("campaign_schedules")
        .insert(scheduleData)
        .select()
        .single()

      if (insertError) {
        console.error("❌ Error creating schedule:", insertError)
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }

      result = newSchedule
    }

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error("❌ Error saving schedule:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}