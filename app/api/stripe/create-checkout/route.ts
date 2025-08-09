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

// Define price IDs for each plan
const PRICE_IDS = {
  basic: {
    monthly: "price_1QRbJcRuE1eilp2aDnZNjNM2", // Replace with your actual price ID
    yearly: "price_1QRbJcRuE1eilp2aYearlyID"   // Replace with your actual price ID
  },
  pro: {
    monthly: "price_1QRbKRRuE1eilp2aPro79ID",  // Replace with your actual price ID
    yearly: "price_1QRbKRRuE1eilp2aProYearID"  // Replace with your actual price ID
  },
  enterprise: {
    monthly: "price_1QRbLERuE1eilp2aEnt180ID", // Replace with your actual price ID
    yearly: "price_1QRbLERuE1eilp2aEntYearID"  // Replace with your actual price ID
  }
}

export async function POST(request: NextRequest) {
  try {
    const { planName, userEmail, userId, billingPeriod = "monthly" } = await request.json()

    if (!userId || !userEmail) {
      return NextResponse.json(
        { success: false, error: "User ID and email are required" },
        { status: 400 }
      )
    }

    // For now, fallback to payment link if price IDs aren't configured
    // TODO: Replace the price IDs above with your actual Stripe price IDs
    const paymentLink = process.env.STRIPE_PAYMENT_LINK || "https://buy.stripe.com/test_4gM9AVakE1gzcE54Lvf3a00"

    // Create a proper checkout session with trial configuration
    try {
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: userEmail,
        client_reference_id: userId,
        metadata: {
          user_id: userId,
          user_email: userEmail,
          plan_name: planName || "basic"
        },
        line_items: [
          {
            // Use the payment link's price ID or create your own
            price: PRICE_IDS[planName as keyof typeof PRICE_IDS]?.[billingPeriod as "monthly" | "yearly"] || "price_1QRbJcRuE1eilp2aDnZNjNM2",
            quantity: 1,
          },
        ],
        // Configure payment collection after 7-day trial
        payment_method_collection: "always", // Always collect payment method upfront
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: `7-day free trial for ${planName || "basic"} plan - Payment collected after trial ends`,
            footer: "Your trial starts immediately. Payment will be processed automatically after your 7-day trial period.",
          }
        },
        subscription_data: {
          trial_period_days: 7, // 7-day free trial for all plans
          trial_settings: {
            end_behavior: {
              missing_payment_method: "pause" // Pause subscription if payment method missing at trial end
            }
          },
          description: `${planName || "basic"} plan with 7-day free trial - Payment after trial`,
          metadata: {
            plan_name: planName || "basic",
            billing_period: billingPeriod,
            trial_enabled: "true",
            trial_days: "7",
            payment_timing: "after_trial"
          },
          // Explicitly configure payment collection timing
          payment_behavior: "default_incomplete", // Don't charge immediately
          proration_behavior: "none" // No proration during trial
        },
        // Custom success URL with trial messaging
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}&trial=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/upgrade`,
        // Add custom text for clarity about payment timing
        custom_text: {
          submit: {
            message: "Start your 7-day free trial now. Payment will be collected automatically after your trial ends on day 8."
          },
          terms_of_service_acceptance: {
            message: "By subscribing, you agree that payment will be collected after your 7-day trial period."
          }
        }
      })

      return NextResponse.json({
        success: true,
        paymentUrl: session.url,
        sessionId: session.id,
        message: "Checkout session created successfully"
      })
    } catch (stripeError) {
      console.error("Stripe error:", stripeError)

      // Fallback to payment link if session creation fails
      const url = new URL(paymentLink)
      if (userEmail) {
        url.searchParams.append('prefilled_email', userEmail)
      }
      if (userId) {
        url.searchParams.append('client_reference_id', userId)
      }

      return NextResponse.json({
        success: true,
        paymentUrl: url.toString(),
        message: "Redirecting to Stripe checkout..."
      })
    }
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}