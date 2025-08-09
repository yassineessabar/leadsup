import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const MOCK_USER_ID = "1"

export async function GET(request: NextRequest) {
  try {
    const { data: apiKeys, error } = await supabase
      .from("api_keys") // Assuming a table named 'api_keys'
      .select("*")
      .eq("user_id", MOCK_USER_ID)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching API keys:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: apiKeys })
  } catch (error) {
    console.error("Error in GET /api/integrations/api-keys:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type } = (await request.json()) as { type: "production" | "test" }
    if (!type) {
      return NextResponse.json({ success: false, error: "API key type is required" }, { status: 400 })
    }

    // Generate a simple mock API key
    const newKey = `sk_mock_${Math.random().toString(36).substring(2, 15)}`

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: MOCK_USER_ID,
        key_value: newKey,
        type: type,
        created_at: new Date().toISOString(),
        last_used_at: null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating API key:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in POST /api/integrations/api-keys:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = (await request.json()) as { id: string }
    if (!id) {
      return NextResponse.json({ success: false, error: "API key ID is required" }, { status: 400 })
    }

    const { error } = await supabase.from("api_keys").delete().eq("id", id).eq("user_id", MOCK_USER_ID)

    if (error) {
      console.error("Error deleting API key:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "API key deleted successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/integrations/api-keys:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
