import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { WebhookConfig } from "@/types/db"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: webhookConfig, error } = await supabase
      .from("integrations") // Assuming webhook config is part of integrations table or a separate table
      .select("user_id, config->>webhook_url as webhook_url, config->>secret_key as secret_key") // Adjust based on your schema
      .eq("user_id", MOCK_USER_ID)
      .eq("name", "Webhook") // Assuming a specific entry for webhook
      .single()

    if (error) {
      console.error("Error fetching webhook config:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!webhookConfig) {
      // If no webhook entry exists, return a default empty config
      return NextResponse.json({ success: true, data: { user_id: MOCK_USER_ID, webhook_url: null, secret_key: null } })
    }

    return NextResponse.json({ success: true, data: webhookConfig })
  } catch (error) {
    console.error("Error in GET /api/integrations/webhook:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = (await request.json()) as Partial<WebhookConfig>

    // Update the 'config' JSONB column for the Webhook integration
    const { data, error } = await supabase
      .from("integrations")
      .update({ config: updates }) // Assuming 'config' is a JSONB column
      .eq("user_id", MOCK_USER_ID)
      .eq("name", "Webhook")
      .select()
      .single()

    if (error) {
      console.error("Error updating webhook config:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Webhook integration not found or not authorized" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in PUT /api/integrations/webhook:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
