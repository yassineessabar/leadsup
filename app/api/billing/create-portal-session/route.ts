import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import Stripe from "stripe"

// Initialize Stripe only when needed to avoid build-time errors
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
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    console.log('🔐 Portal Debug:', {
      hasSessionToken: !!sessionToken,
      sessionTokenPrefix: sessionToken?.substring(0, 10) + '...'
    })

    if (!sessionToken) {
      console.log('❌ No session token found')
      return NextResponse.json({ success: false, error: "No session token found" }, { status: 401 })
    }

    // Get user from session
    const { data: session, error: sessionError } = await supabase
      .from("user_sessions")
      .select("user_id")
      .eq("session_token", sessionToken)
      .single()

    console.log('👤 Session Debug:', {
      sessionError: sessionError?.message,
      hasSession: !!session,
      userId: session?.user_id
    })

    if (sessionError || !session) {
      console.log('❌ Invalid session:', sessionError?.message)
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 })
    }

    // Get user's stripe customer ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", session.user_id)
      .single()

    if (userError || !user?.stripe_customer_id) {
      return NextResponse.json({ success: false, error: "No Stripe customer found" }, { status: 404 })
    }

    // Create Stripe Customer Portal session
    const stripe = getStripe()
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?tab=settings`,
    })

    return NextResponse.json({
      success: true,
      url: portalSession.url
    })
  } catch (error) {
    console.error("Error creating portal session:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}