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
      console.error("Error fetching user from session:", error)
      return null
    }

    return data.user_id
  } catch (error) {
    console.error("Error in getUserIdFromSession:", error)
    return null
  }
}

// POST - Sync customer last request status from review_requests table
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get all customers for this user who have sent requests
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, name, last_request_sent")
      .eq("user_id", userId)
      .not("last_request_sent", "is", null)

    if (customersError) {
      console.error("Error fetching customers:", customersError)
      return NextResponse.json(
        { success: false, error: "Failed to fetch customers" },
        { status: 500 }
      )
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        success: true,
        data: { message: "No customers with sent requests found", updated: 0 }
      })
    }

    let updatedCount = 0

    // For each customer, find their latest request status
    for (const customer of customers) {
      try {
        // Get the most recent request for this customer
        const { data: latestRequest, error: requestError } = await supabase
          .from("review_requests")
          .select("status, request_type, sent_at")
          .eq("user_id", userId)
          .or(`contact_email.eq.${customer.email},contact_phone.eq.${customer.phone}`)
          .order("sent_at", { ascending: false })
          .limit(1)
          .single()

        if (requestError || !latestRequest) {
          continue
        }

        // Update customer with latest request status
        const { error: updateError } = await supabase
          .from("customers")
          .update({
            last_request_status: latestRequest.status,
            updated_at: new Date().toISOString()
          })
          .eq("id", customer.id)
          .eq("user_id", userId)

        if (updateError) {
          console.error(`Error updating customer ${customer.name}:`, updateError)
        } else {
          updatedCount++
        }

      } catch (error) {
        console.error(`Error processing customer ${customer.name}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Successfully synced request status for ${updatedCount} customers`,
        updated: updatedCount,
        total: customers.length
      }
    })

  } catch (error) {
    console.error("Error in POST /api/customers/sync-request-status:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}