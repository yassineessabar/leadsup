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

    // Query user_sessions table to get user_id
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

// GET - Fetch all customers for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const searchTerm = url.searchParams.get("search") || ""
    const typeFilter = url.searchParams.get("type") || "all"
    const statusFilter = url.searchParams.get("status") || "all"

    let query = supabase
      .from("customers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    // Apply search filter
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.like.%${searchTerm}%`)
    }

    // Apply type filter
    if (typeFilter && typeFilter !== "all") {
      query = query.eq("type", typeFilter)
    }

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching customers:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch customers" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in GET /api/customers:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email, phone, type = "both" } = body

    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      )
    }

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: "At least email or phone is required" },
        { status: 400 }
      )
    }

    if (!["sms", "email", "both"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid customer type" },
        { status: 400 }
      )
    }

    // Email validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: "Invalid email format" },
          { status: 400 }
        )
      }
    }

    // Phone validation
    if (phone) {
      const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/
      if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
        return NextResponse.json(
          { success: false, error: "Invalid phone format" },
          { status: 400 }
        )
      }
    }

    // Check for duplicate customers to prevent multiple submissions
    const duplicateConditions = []

    if (email) {
      duplicateConditions.push(`email.eq.${email.trim()}`)
    }

    if (phone) {
      duplicateConditions.push(`phone.eq.${phone.trim()}`)
    }

    if (duplicateConditions.length > 0) {
      const { data: existingCustomers, error: duplicateError } = await supabase
        .from("customers")
        .select("id, name, email, phone, created_at")
        .eq("user_id", userId)
        .or(duplicateConditions.join(','))

      if (duplicateError) {
        console.error("Error checking for duplicate customers:", duplicateError)
        // Continue with creation if duplicate check fails
      } else if (existingCustomers && existingCustomers.length > 0) {
        const duplicate = existingCustomers[0]
        `)

        return NextResponse.json({
          success: false,
          error: "Customer already exists",
          details: {
            existingCustomer: {
              id: duplicate.id,
              name: duplicate.name,
              email: duplicate.email,
              phone: duplicate.phone,
              createdAt: duplicate.created_at
            },
            message: `A customer with ${email ? 'this email' : 'this phone number'} already exists: ${duplicate.name}`
          }
        }, { status: 409 })
      }
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        user_id: userId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        type,
        status: "active"
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating customer:", error)
      return NextResponse.json(
        { success: false, error: "Failed to create customer" },
        { status: 500 }
      )
    }

    // Trigger automation for the new customer
    try {
      `)
      await triggerAutomationForNewCustomer(userId, data)
    } catch (automationError) {
      console.error('❌ Error triggering automation for new customer:', automationError)
      // Don't fail the customer creation if automation fails
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in POST /api/customers:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update a customer
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, name, email, phone, type, status } = body

    // Validation
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      )
    }

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: "At least email or phone is required" },
        { status: 400 }
      )
    }

    // Email validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: "Invalid email format" },
          { status: 400 }
        )
      }
    }

    // Phone validation
    if (phone) {
      const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/
      if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
        return NextResponse.json(
          { success: false, error: "Invalid phone format" },
          { status: 400 }
        )
      }
    }

    const updateData: any = {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      updated_at: new Date().toISOString()
    }

    if (type && ["sms", "email", "both"].includes(type)) {
      updateData.type = type
    }

    if (status && ["active", "inactive"].includes(status)) {
      updateData.status = status
    }

    const { data, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating customer:", error)
      return NextResponse.json(
        { success: false, error: "Failed to update customer" },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/customers:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a customer
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const customerId = url.searchParams.get("id")

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      console.error("Error deleting customer:", error)
      return NextResponse.json(
        { success: false, error: "Failed to delete customer" },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in DELETE /api/customers:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Trigger automation for a newly created customer
 */
async function triggerAutomationForNewCustomer(userId: string, customer: any) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Check if automation has already been triggered for this customer recently (within last hour)
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data: recentAutomation } = await supabase
      .from("automation_jobs")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("customer_id", customer.id)
      .gte("created_at", oneHourAgo.toISOString())
      .limit(1)

    if (recentAutomation && recentAutomation.length > 0) {
      return
    }

    // Get user's email and SMS templates to check their settings
    const { data: emailTemplate } = await supabase
      .from("email_templates")
      .select("*")
      .eq("user_id", userId)
      .single()

    const { data: smsTemplate } = await supabase
      .from("sms_templates")
      .select("*")
      .eq("user_id", userId)
      .single()

    // If no templates exist, no automation to trigger
    if (!emailTemplate && !smsTemplate) {
      return
    }

    // Create a "virtual review" entry to trigger automation system
    // This represents the customer interaction/signup event
    const { data: virtualReview, error: reviewError } = await supabase
      .from("reviews")
      .insert({
        user_id: userId,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        rating: 5, // Default to 5 stars for new customer signup
        comment: `New customer signup: ${customer.name}`,
        platform: "internal",
        status: "published"
      })
      .select()
      .single()

    if (reviewError) {
      console.error("Error creating virtual review for automation:", reviewError)
      return
    }

    // Now trigger the scheduler for this virtual review
    const schedulerResponse = await fetch(`${baseUrl}/api/automation/scheduler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reviewId: virtualReview.id
      })
    })

    if (schedulerResponse.ok) {
      const schedulerResult = await schedulerResponse.json()
      // If any templates have immediate triggers, process them right away
      const hasImmediateTrigger = (emailTemplate?.initial_trigger === 'immediate') ||
                                 (smsTemplate?.initial_trigger === 'immediate')

      if (hasImmediateTrigger) {
        const processResponse = await fetch(`${baseUrl}/api/automation/scheduler?action=process_pending&testMode=false`)

        if (processResponse.ok) {
          const processResult = await processResponse.json()
          `)
        } else {
          console.error('❌ Failed to process immediate automation:', await processResponse.text())
        }
      }

    } else {
      console.error(`❌ Failed to schedule automation for new customer:`, await schedulerResponse.text())
    }

  } catch (error) {
    console.error(`❌ Error in triggerAutomationForNewCustomer:`, error)
  }
}