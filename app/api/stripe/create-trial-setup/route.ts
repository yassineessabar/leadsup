import { type NextRequest, NextResponse } from "next/server"
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

// Alternative approach: Setup mode for explicit "$0 due today"
export async function POST(request: NextRequest) {
  try {
    const { planName, userEmail, userId, billingPeriod = "monthly" } = await request.json()

    if (!userId || !userEmail) {
      return NextResponse.json(
        { success: false, error: "User ID and email are required" },
        { status: 400 }
      )
    }

    // Create customer first
    const stripe = getStripe()
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        user_id: userId,
        plan_name: planName || "basic",
        billing_period: billingPeriod
      }
    })

    // Create setup session - this shows "$0 due today" clearly
    const setupSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "setup", // Setup mode for $0 transactions
      customer: customer.id,
      metadata: {
        user_id: userId,
        user_email: userEmail,
        plan_name: planName || "basic",
        billing_period: billingPeriod,
        trial_signup: "true"
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payment/trial-setup-success?session_id={CHECKOUT_SESSION_ID}&plan=${planName}&billing=${billingPeriod}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/upgrade`,
      custom_text: {
        submit: {
          message: "Start your 7-day free trial now - $0 due today! You'll only be charged after your trial ends."
        }
      }
    })

    return NextResponse.json({
      success: true,
      setupUrl: setupSession.url,
      sessionId: setupSession.id,
      customerId: customer.id,
      message: "Trial setup session created - $0 due today!"
    })

  } catch (error) {
    console.error("Error creating trial setup session:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create trial setup session" },
      { status: 500 }
    )
  }
}