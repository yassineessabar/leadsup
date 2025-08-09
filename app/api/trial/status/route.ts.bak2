import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !session) {
      return null
    }

    return session.user_id
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Get user trial information
    const { data: user, error } = await supabase
      .from("users")
      .select(`
        subscription_status,
        trial_start_date,
        trial_end_date,
        trial_ending_notified,
        subscription_type,
        subscription_start_date,
        subscription_end_date
      `)
      .eq("id", userId)
      .single()

    if (error) {
      console.error("Error fetching trial status:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Calculate trial information
    const now = new Date()
    const trialEndDate = user.trial_end_date ? new Date(user.trial_end_date) : null
    const isInTrial = user.subscription_status === 'trialing'

    let daysLeft = 0
    let isTrialExpired = false
    let isTrialEndingSoon = false

    if (trialEndDate && isInTrial) {
      const timeDiff = trialEndDate.getTime() - now.getTime()
      daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
      isTrialExpired = daysLeft <= 0
      isTrialEndingSoon = daysLeft <= 2 && daysLeft > 0
    }

    const trialInfo = {
      isInTrial,
      trialStartDate: user.trial_start_date,
      trialEndDate: user.trial_end_date,
      daysLeft: Math.max(0, daysLeft),
      isTrialExpired,
      isTrialEndingSoon,
      trialEndingNotified: user.trial_ending_notified,
      subscriptionStatus: user.subscription_status,
      subscriptionType: user.subscription_type
    }

    return NextResponse.json({
      success: true,
      data: trialInfo
    })
  } catch (error) {
    console.error("Error in GET /api/trial/status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}