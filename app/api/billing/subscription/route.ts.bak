import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: "No session token found" }, { status: 401 })
    }

    // Get user from session
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 })
    }

    // Get user subscription data from users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("subscription_type, subscription_status, subscription_start_date, subscription_end_date, trial_end_date")
      .eq("id", session.user_id)
      .single()

    if (userError) {
      console.error("Error fetching user subscription:", userError)
      return NextResponse.json({ success: false, error: userError.message }, { status: 500 })
    }

    if (!user || !user.subscription_type || user.subscription_type === 'free') {
      return NextResponse.json({ success: false, error: "No active subscription found" }, { status: 404 })
    }

    // Map subscription type to plan details
    const planDetails = {
      basic: {
        plan_name: "Basic Plan",
        price: "39.00",
        features: [
          "Multi-channel collection (SMS, Email)",
          "Custom review page",
          "Choice of action for each review",
          "Basic analytics dashboard",
          "Email support"
        ]
      },
      pro: {
        plan_name: "Pro Plan",
        price: "79.00",
        features: [
          "Everything in Basic +",
          "CSV import & export",
          "WhatsApp integration",
          "Multi-channel follow-ups",
          "Dynamic routing of reviews",
          "Advanced analytics",
          "Priority support"
        ]
      },
      enterprise: {
        plan_name: "Enterprise Plan",
        price: "180.00",
        features: [
          "Everything in Pro +",
          "Checkout & in-store QR code reviews",
          "AI responses to Google reviews",
          "Automated Trustpilot responses",
          "AI suggestions for negative reviews",
          "Monthly strategic review with success manager",
          "Custom integrations",
          "24/7 phone support"
        ]
      }
    }

    const planDetail = planDetails[user.subscription_type as keyof typeof planDetails]

    const subscription = {
      plan_name: planDetail?.plan_name || "Unknown Plan",
      status: user.subscription_status || "inactive",
      price: planDetail?.price || "0.00",
      currency: "$",
      end_date: user.subscription_end_date,
      features: planDetail?.features || []
    }

    return NextResponse.json({ success: true, data: subscription })
  } catch (error) {
    console.error("Error in GET /api/billing/subscription:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = (await request.json()) as Partial<Subscription>

    const { data, error } = await supabase
      .from("subscriptions")
      .update(updates)
      .eq("user_id", MOCK_USER_ID)
      .select()
      .single()

    if (error) {
      console.error("Error updating subscription:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Subscription not found or not authorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/billing/subscription:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
