import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import Stripe from "stripe"
import { supabase } from "@/lib/supabase"

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stripe = getStripe()

    // Get user's Stripe customer ID
    const { data: user, error } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('email', session.user.email)
      .single()

    if (error || !user?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found" }, { status: 404 })
    }

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadsup.io'}/account/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error("❌ Customer portal error:", error)
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 })
  }
}