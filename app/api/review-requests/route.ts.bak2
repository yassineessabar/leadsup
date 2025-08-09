import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import type { ReviewRequest } from "@/types/db"

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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const contactType = searchParams.get("contactType") // 'sms' or 'email'
    const dateFilter = searchParams.get("dateFilter") // 'All', 'Today', 'Last 7 Days', 'Last 30 Days'

    let dbQuery = supabase
      .from("review_requests")
      .select("*")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })

    if (contactType && contactType !== "all") {
      dbQuery = dbQuery.eq("request_type", contactType)
    }

    if (query) {
      dbQuery = dbQuery.or(`contact_name.ilike.%${query}%,contact_email.ilike.%${query}%,contact_phone.ilike.%${query}%`)
    }

    if (dateFilter && dateFilter !== "All") {
      const now = new Date()
      let startDate: Date | undefined

      if (dateFilter === "Today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (dateFilter === "Last 7 Days") {
        startDate = new Date(now.setDate(now.getDate() - 7))
      } else if (dateFilter === "Last 30 Days") {
        startDate = new Date(now.setMonth(now.getMonth() - 1))
      }

      if (startDate) {
        dbQuery = dbQuery.gte("sent_at", startDate.toISOString())
      }
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error("Error fetching review requests:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in GET /api/review-requests:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()

    if (!userId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const requestData = await request.json()
    const { type, contacts, content, subject_line, from_email, sms_sender_name } = requestData

    if (!type || !contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: type, contacts array"
      }, { status: 400 })
    }

    if (!['sms', 'email'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: "Invalid request type. Must be 'sms' or 'email'"
      }, { status: 400 })
    }

    // Get the user's review_link_id
    const { data: reviewLink, error: reviewLinkError } = await supabase
      .from("review_link")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (reviewLinkError || !reviewLink) {
      return NextResponse.json({
        success: false,
        error: "Review link not found. Please set up your review link first."
      }, { status: 404 })
    }

    // Prepare the review requests data
    const reviewRequests = contacts
      .filter(contact => {
        // Filter out empty contacts
        if (type === 'sms') {
          return contact.name && contact.number
        } else {
          return contact.name && contact.email
        }
      })
      .map(contact => ({
        user_id: userId,
        review_link_id: reviewLink.id,
        contact_name: contact.name,
        contact_phone: type === 'sms' ? contact.number : null,
        contact_email: type === 'email' ? contact.email : null,
        request_type: type,
        content: content || '',
        subject_line: type === 'email' ? subject_line : null,
        from_email: type === 'email' ? from_email : null,
        sms_sender_name: type === 'sms' ? sms_sender_name : null,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }))

    if (reviewRequests.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid contacts found to send requests to"
      }, { status: 400 })
    }

    // Insert the review requests into the database
    const { data, error } = await supabase
      .from("review_requests")
      .insert(reviewRequests)
      .select()

    if (error) {
      console.error("Error creating review requests:", error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        requests_sent: data.length,
        requests: data
      }
    })

  } catch (error) {
    console.error("Error in POST /api/review-requests:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
