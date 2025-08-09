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

// Register webhooks with Shopify
async function registerShopifyWebhooks(shopDomain: string, accessToken: string): Promise<any[]> {
  const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/shopify/webhook`

  const webhooksToRegister = [
    {
      topic: 'customers/create',
      address: webhookUrl,
      format: 'json'
    },
    {
      topic: 'customers/update',
      address: webhookUrl,
      format: 'json'
    },
    {
      topic: 'customers/delete',
      address: webhookUrl,
      format: 'json'
    }
  ]

  const results = []

  for (const webhook of webhooksToRegister) {
    try {

      const response = await fetch(`https://${shopDomain}/admin/api/2023-10/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ webhook })
      })

      if (response.ok) {
        const data = await response.json()
        results.push({
          topic: webhook.topic,
          success: true,
          webhookId: data.webhook.id,
          data: data.webhook
        })
      } else {
        const error = await response.text()
        console.error(`Failed to register webhook ${webhook.topic}:`, error)
        results.push({
          topic: webhook.topic,
          success: false,
          error: error
        })
      }
    } catch (error) {
      console.error(`Error registering webhook ${webhook.topic}:`, error)
      results.push({
        topic: webhook.topic,
        success: false,
        error: error.message
      })
    }
  }

  return results
}

// POST - Register webhooks for Shopify integration
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
    const { data: integration, error } = await supabase
      .from("review_integrations")
      .select("additional_data")
      .eq("user_id", userId)
      .eq("platform_name", "shopify")
      .eq("integration_status", "connected")
      .single()

    if (error || !integration) {
      return NextResponse.json(
        { success: false, error: "Shopify integration not found" },
        { status: 404 }
      )
    }

    const additionalData = integration.additional_data as any
    const shopDomain = additionalData.shop_domain
    const accessToken = additionalData.access_token

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Missing shop domain or access token" },
        { status: 400 }
      )
    }

    // Register webhooks
    const webhookResults = await registerShopifyWebhooks(shopDomain, accessToken)

    // Update integration with webhook info
    await supabase
      .from("review_integrations")
      .update({
        additional_data: {
          ...additionalData,
          webhooks_registered: new Date().toISOString(),
          webhook_results: webhookResults
        }
      })
      .eq("user_id", userId)
      .eq("platform_name", "shopify")

    const successCount = webhookResults.filter(r => r.success).length
    const totalCount = webhookResults.length

    return NextResponse.json({
      success: true,
      data: {
        message: `Successfully registered ${successCount}/${totalCount} webhooks`,
        results: webhookResults
      }
    })

  } catch (error) {
    console.error("Error in POST /api/integrations/shopify/register-webhooks:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export { registerShopifyWebhooks }