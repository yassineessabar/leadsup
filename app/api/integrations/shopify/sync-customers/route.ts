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

// Helper function to get Shopify access token
async function getShopifyIntegration(userId: string) {
  const { data, error } = await supabase
    .from("review_integrations")
    .select("additional_data")
    .eq("user_id", userId)
    .eq("platform_name", "shopify")
    .eq("integration_status", "connected")
    .single()

  if (error || !data) {
    console.error("Shopify integration error:", error)
    throw new Error("Shopify integration not found or not connected")
  }

  const additionalData = data.additional_data as any
  return {
    accessToken: additionalData.access_token,
    shopDomain: additionalData.shop_domain
  }
}

// Helper function to sync customers from Shopify
async function syncCustomersFromShopify(userId: string, shopDomain: string, accessToken: string) {

  let allCustomers = []
  let nextPageInfo = null
  let page = 1
  const limit = 250 // Shopify's max limit per request

  try {
    // Fetch all customers with pagination
    do {

      let url = `https://${shopDomain}/admin/api/2023-10/customers.json?limit=${limit}`
      if (nextPageInfo) {
        url += `&page_info=${nextPageInfo}`
      }

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Shopify API error response:`, errorText)
        throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      const customers = data.customers || []
      allCustomers.push(...customers)

      // Check for next page
      const linkHeader = response.headers.get('Link')
      nextPageInfo = null

      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/)
        if (nextMatch) {
          nextPageInfo = nextMatch[1]
        }
      }

      page++
    } while (nextPageInfo && page <= 20) // Safety limit of 20 pages (5000 customers max)

    // Transform and insert customers
    const transformedCustomers = []
    const errors = []

    for (const shopifyCustomer of allCustomers) {
      try {
        // Get primary email and phone
        const primaryEmail = shopifyCustomer.email
        const primaryPhone = shopifyCustomer.phone ||
                            (shopifyCustomer.addresses && shopifyCustomer.addresses[0]?.phone)

        // Skip customers without email or phone
        if (!primaryEmail && !primaryPhone) {
          continue
        }

        // Determine customer type
        let customerType = "both"
        if (primaryEmail && !primaryPhone) customerType = "email"
        if (primaryPhone && !primaryEmail) customerType = "sms"

        // Create customer name
        const firstName = shopifyCustomer.first_name || ""
        const lastName = shopifyCustomer.last_name || ""
        const customerName = `${firstName} ${lastName}`.trim() || primaryEmail || "Shopify Customer"

        const transformedCustomer = {
          user_id: userId,
          name: customerName,
          email: primaryEmail || null,
          phone: primaryPhone || null,
          type: customerType,
          status: shopifyCustomer.state === "enabled" ? "active" : "inactive",
          // Add Shopify-specific metadata
          shopify_customer_id: shopifyCustomer.id.toString(),
          shopify_created_at: shopifyCustomer.created_at,
          shopify_updated_at: shopifyCustomer.updated_at,
          shopify_total_spent: shopifyCustomer.total_spent,
          shopify_orders_count: shopifyCustomer.orders_count,
          shopify_tags: shopifyCustomer.tags,
        }

        transformedCustomers.push(transformedCustomer)

      } catch (error) {
        console.error(`Error transforming customer ${shopifyCustomer.id}:`, error)
        errors.push({
          shopify_id: shopifyCustomer.id,
          error: error.message
        })
      }
    }

    // Filter out existing customers (only import new ones)
    // Check Shopify ID, email, and phone to prevent duplicates

    const existingShopifyIds = new Set()
    const existingEmails = new Set()
    const existingPhones = new Set()

    try {
      const { data: existingCustomers } = await supabase
        .from("customers")
        .select("shopify_customer_id, email, phone")
        .eq("user_id", userId)

      if (existingCustomers) {
        existingCustomers.forEach((customer) => {
          // Track Shopify IDs
          if (customer.shopify_customer_id) {
            existingShopifyIds.add(customer.shopify_customer_id)
          }

          // Track emails (case-insensitive)
          if (customer.email) {
            existingEmails.add(customer.email.toLowerCase().trim())
          }

          // Track phones (normalize by removing non-digits)
          if (customer.phone) {
            const normalizedPhone = customer.phone.replace(/\D/g, '')
            if (normalizedPhone.length >= 10) {
              existingPhones.add(normalizedPhone)
            }
          }
        })
      }

    } catch (error) {
      console.error("Error fetching existing customers:", error)
    }

    // Filter to only new customers - check all three fields
    const newCustomers = transformedCustomers.filter(customer => {
      const shopifyId = customer.shopify_customer_id
      const email = customer.email?.toLowerCase().trim()
      const phone = customer.phone?.replace(/\D/g, '')

      // Skip if Shopify ID already exists
      if (shopifyId && existingShopifyIds.has(shopifyId)) {
        return false
      }

      // Skip if email already exists
      if (email && existingEmails.has(email)) {
        return false
      }

      // Skip if phone already exists
      if (phone && phone.length >= 10 && existingPhones.has(phone)) {
        return false
      }

      return true
    })

    if (newCustomers.length === 0) {
      return {
        success: true,
        totalFetched: allCustomers.length,
        totalTransformed: transformedCustomers.length,
        totalInserted: 0,
        totalSkipped: transformedCustomers.length,
        duplicatesSkipped: transformedCustomers.length,
        errors: [],
        message: 'No new customers to import - all ' + transformedCustomers.length + ' Shopify customers already exist (matched by Shopify ID, email, or phone)'
      }
    }

    // Insert only new customers in batches
    let insertedCount = 0
    let skippedCount = transformedCustomers.length - newCustomers.length
    const batchSize = 100

    for (let i = 0; i < newCustomers.length; i += batchSize) {
      const batch = newCustomers.slice(i, i + batchSize)

      try {
        // Use insert (not upsert) since we've already filtered out existing customers
        const { data, error } = await supabase
          .from("customers")
          .insert(batch)
          .select()

        if (error) {
          console.error(`Batch insert error:`, error)
          errors.push({
            batch: i / batchSize + 1,
            error: error.message
          })
        } else {
          insertedCount += batch.length
        }
      } catch (batchError) {
        console.error(`Batch processing error:`, batchError)
        errors.push({
          batch: i / batchSize + 1,
          error: batchError.message
        })
      }
    }

    return {
      success: true,
      totalFetched: allCustomers.length,
      totalTransformed: transformedCustomers.length,
      totalInserted: insertedCount,
      totalSkipped: skippedCount,
      duplicatesSkipped: transformedCustomers.length - newCustomers.length,
      newCustomersImported: insertedCount,
      errors: errors,
      message: insertedCount > 0
        ? `Successfully imported ${insertedCount} new customers. Skipped ${transformedCustomers.length - newCustomers.length} duplicates.`
        : "No new customers imported - all customers already exist"
    }

  } catch (error) {
    console.error("Shopify customer sync error:", error)
    throw error
  }
}

// POST - Manual sync customers from Shopify
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get Shopify integration
    const { accessToken, shopDomain } = await getShopifyIntegration(userId)

    // Sync customers
    const result = await syncCustomersFromShopify(userId, shopDomain, accessToken)

    // Update integration to track last sync
    await supabase
      .from("review_integrations")
      .update({
        additional_data: {
          ...((await supabase
            .from("review_integrations")
            .select("additional_data")
            .eq("user_id", userId)
            .eq("platform_name", "shopify")
            .single()).data?.additional_data || {}),
          last_customer_sync: new Date().toISOString(),
          last_sync_result: result
        }
      })
      .eq("user_id", userId)
      .eq("platform_name", "shopify")

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error("Error in POST /api/integrations/shopify/sync-customers:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error"
      },
      { status: 500 }
    )
  }
}

// Export the sync function for use in other parts of the application
export { syncCustomersFromShopify }