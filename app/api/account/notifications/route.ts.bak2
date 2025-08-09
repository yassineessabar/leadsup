import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import type { NotificationSettings } from "@/types/db"

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

    const { data: notificationSettings, error } = await supabase
      .from("users")
      .select("id, email, email_notifications, email_replies, notification_email, reply_email")
      .eq("id", userId)
      .single()

    if (error) {
      console.error("Error fetching notification settings:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!notificationSettings) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Map database fields to frontend expected format
    const mappedSettings = {
      user_id: notificationSettings.id,
      email_notifications: notificationSettings.email_notifications || false,
      sms_notifications: false, // Not in database schema
      review_alerts: false, // Not in database schema
      weekly_reports: false, // Not in database schema
      marketing_emails: false, // Not in database schema
      notification_email: notificationSettings.notification_email || notificationSettings.email || "", // Use notification_email or fallback to user email
      reply_email: notificationSettings.reply_email || notificationSettings.email || "", // Use reply_email or fallback to user email
    }

    return NextResponse.json({ success: true, data: mappedSettings })
  } catch (error) {
    console.error("Error in GET /api/account/notifications:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const updates = (await request.json()) as Partial<NotificationSettings>

    // Map frontend updates to database fields
    const dbUpdates: any = {}
    if (updates.email_notifications !== undefined) dbUpdates.email_notifications = updates.email_notifications
    if (updates.reply_email !== undefined) dbUpdates.reply_email = updates.reply_email
    if (updates.notification_email !== undefined) dbUpdates.notification_email = updates.notification_email

    // Only update database if there are actual database fields to update
    if (Object.keys(dbUpdates).length > 0) {
      const { data, error } = await supabase
        .from("users")
        .update(dbUpdates)
        .eq("id", userId)
        .select()
        .single()

      if (error) {
        console.error("Error updating notification settings:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      if (!data) {
        return NextResponse.json(
          { success: false, error: "Notification settings not found or not authorized" },
          { status: 404 },
        )
      }

      return NextResponse.json({ success: true, data })
    } else {
      // No database updates needed, just return success
      return NextResponse.json({ success: true, data: { message: "Settings updated" } })
    }
  } catch (error) {
    console.error("Error in PUT /api/account/notifications:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
