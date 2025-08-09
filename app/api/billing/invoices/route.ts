import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: "No session token found" }, { status: 401 })
    }

    // Get user from session
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 })
    }

    // Get user's stripe customer ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", session.user_id)
      .single()

    if (userError || !user?.stripe_customer_id) {
      // Return empty invoices if no Stripe customer ID
      return NextResponse.json({ success: true, data: [] })
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: user.stripe_customer_id,
      limit: 10,
    })

    // Transform Stripe invoices to our format
    const transformedInvoices = invoices.data.map((invoice, index) => ({
      id: invoice.id,
      invoice_number: invoice.number || `INV-${index + 1}`,
      issue_date: new Date(invoice.created * 1000).toISOString(),
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      amount: invoice.total / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      status: invoice.status === 'paid' ? 'paid' : invoice.status === 'open' ? 'pending' : 'overdue',
      download_url: invoice.invoice_pdf || invoice.hosted_invoice_url || '#'
    }))

    return NextResponse.json({ success: true, data: transformedInvoices })
  } catch (error) {
    console.error("Error in GET /api/billing/invoices:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
