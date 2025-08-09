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

// POST - Bulk create customers from CSV data
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
    const { customers } = body

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Customers array is required" },
        { status: 400 }
      )
    }

    const validCustomers = []
    const errors = []

    // Validate each customer
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i]
      const rowNumber = i + 1

      // Validate required fields
      if (!customer.name || typeof customer.name !== 'string') {
        errors.push(`Row ${rowNumber}: Missing or invalid name`)
        continue
      }

      if (!customer.email && !customer.phone) {
        errors.push(`Row ${rowNumber}: Missing both email and phone`)
        continue
      }

      // Email validation
      if (customer.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(customer.email)) {
          errors.push(`Row ${rowNumber}: Invalid email format`)
          continue
        }
      }

      // Phone validation
      if (customer.phone) {
        const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/
        if (!phoneRegex.test(customer.phone) || customer.phone.replace(/\D/g, '').length < 10) {
          errors.push(`Row ${rowNumber}: Invalid phone format`)
          continue
        }
      }

      // Determine type
      let type = "both"
      if (customer.email && !customer.phone) type = "email"
      if (customer.phone && !customer.email) type = "sms"

      validCustomers.push({
        user_id: userId,
        name: customer.name.trim(),
        email: customer.email?.trim() || null,
        phone: customer.phone?.trim() || null,
        type,
        status: "active"
      })
    }

    // If there are validation errors, return them
    if (errors.length > 0 && validCustomers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "All rows have validation errors",
          details: errors
        },
        { status: 400 }
      )
    }

    // Insert valid customers
    let insertedCustomers = []
    if (validCustomers.length > 0) {
      const { data, error } = await supabase
        .from("customers")
        .insert(validCustomers)
        .select()

      if (error) {
        console.error("Error bulk creating customers:", error)
        return NextResponse.json(
          { success: false, error: "Failed to create customers" },
          { status: 500 }
        )
      }

      insertedCustomers = data || []

      // Trigger automation for each newly created customer
      if (insertedCustomers.length > 0) {
        for (const customer of insertedCustomers) {
          try {
            await triggerAutomationForNewCustomer(userId, customer)
          } catch (automationError) {
            console.error(`❌ Error triggering automation for customer ${customer.id}:`, automationError)
            // Don't fail the bulk creation if automation fails
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        inserted: insertedCustomers,
        insertedCount: insertedCustomers.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    })
  } catch (error) {
    console.error("Error in POST /api/customers/bulk:", error)
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