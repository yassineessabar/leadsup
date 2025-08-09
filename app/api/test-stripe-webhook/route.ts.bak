import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer_email, subscription_type = "pro", subscription_status = "active" } = body

    if (!customer_email) {
      return NextResponse.json({ error: "customer_email required" }, { status: 400 })
    }

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('email', customer_email)
      .single()

    if (findError || !user) {
      console.error(`❌ User not found with email: ${customer_email}`)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update subscription
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({
        subscription_type,
        subscription_status,
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()

    if (updateError) {
      console.error('❌ Error updating subscription:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: updateResult[0] })
  } catch (error) {
    console.error("❌ Error in test webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}