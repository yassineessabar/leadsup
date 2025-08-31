import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { SendGridAnalyticsService } from "@/lib/sendgrid-analytics"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return null
    }

    const { data: session, error } = await supabase
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
  } catch (err) {
    return null
  }
}

// GET - Fetch user-level analytics metrics
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Build date range if provided, default to last 30 days
    let dateRange: { start: Date; end: Date }
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    } else {
      dateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      }
    }

    // Get user metrics
    const metrics = await SendGridAnalyticsService.getUserMetrics({
      userId,
      dateRange
    })

    // Get time series data for charts
    const timeSeries = await SendGridAnalyticsService.getUserMetricsTimeSeries({
      userId,
      dateRange,
      granularity: 'day'
    })

    // Get recent events for debugging
    const recentEvents = await SendGridAnalyticsService.getRecentEvents(userId, {
      limit: 20
    })

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        timeSeries,
        recentEvents,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        }
      }
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// POST - Recalculate metrics (for data fixes)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, date } = body

    const targetDate = date ? new Date(date) : new Date()

    const result = await SendGridAnalyticsService.recalculateMetrics(
      userId,
      campaignId,
      targetDate
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Metrics recalculated successfully"
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Failed to recalculate metrics",
        details: result.error
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}