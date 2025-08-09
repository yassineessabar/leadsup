import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to get user ID from session
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data, error } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (error || !data) {
      return null
    }

    return data.user_id
  } catch (error) {
    console.error("Error in getUserIdFromSession:", error)
    return null
  }
}

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

    const { id: customerId } = await params

    // First verify the customer belongs to this user
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, email")
      .eq("id", customerId)
      .eq("user_id", userId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      )
    }

    // Fetch click tracking data for this customer
    const { data: clicks, error: clicksError } = await supabase
      .from("click_tracking")
      .select("*")
      .eq("customer_id", customerId)
      .order("timestamp", { ascending: false })

    if (clicksError) {
      console.error("Error fetching clicks:", clicksError)
      return NextResponse.json(
        { success: false, error: "Failed to fetch click data" },
        { status: 500 }
      )
    }

    // Group clicks by session for better understanding
    const sessions = clicks.reduce((acc: any[], click: any) => {
      const existingSession = acc.find(s => s.session_id === click.session_id)

      if (existingSession) {
        existingSession.events.push(click)
      } else {
        acc.push({
          session_id: click.session_id,
          start_time: click.timestamp,
          events: [click]
        })
      }

      return acc
    }, [])

    // Calculate summary statistics
    const summary = {
      total_visits: clicks.filter((c: any) => c.event_type === 'page_visit').length,
      star_selections: clicks.filter((c: any) => c.event_type === 'star_selection'),
      platform_redirects: clicks.filter((c: any) => c.event_type === 'platform_redirect'),
      last_activity: clicks[0]?.timestamp || null
    }

    return NextResponse.json({
      success: true,
      data: {
        customer,
        clicks,
        sessions,
        summary
      }
    })
  } catch (error) {
    console.error("Error in GET /api/customers/[id]/clicks:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}