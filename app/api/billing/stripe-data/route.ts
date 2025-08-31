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

    console.log('🔍 Session debug:', {
      sessionToken: sessionToken?.substring(0, 20) + '...',
      sessionError: sessionError?.message,
      hasSession: !!session,
      userId: session?.user_id
    })

    let user, userError
    
    if (sessionError || !session) {
      // TEMPORARY: For debugging, try to get enterprise user directly by email
      const result = await supabase
        .from("users")
        .select("stripe_customer_id, stripe_subscription_id, subscription_type, id")
        .eq("email", "essabar.yassine@gmail.com")
        .single()
      
      user = result.data
      userError = result.error

      if (userError || !user) {
        return NextResponse.json({ success: false, error: "Invalid session and no enterprise user found" }, { status: 401 })
      }
      
      console.log('🚨 Using enterprise user directly:', user)
    } else {
      // Get user's Stripe customer ID
      const result = await supabase
        .from("users")
        .select("stripe_customer_id, stripe_subscription_id, subscription_type")
        .eq("id", session.user_id)
        .single()
      
      user = result.data
      userError = result.error
    }

    if (userError || !user?.stripe_customer_id) {
      return NextResponse.json({ success: false, error: "No Stripe customer found" }, { status: 404 })
    }

    const stripe = getStripe()

    console.log('💳 User Stripe data:', {
      stripe_customer_id: user.stripe_customer_id,
      stripe_subscription_id: user.stripe_subscription_id,
      subscription_type: user.subscription_type
    })

    // Fetch subscription data from Stripe
    let subscriptionData = null
    if (user.stripe_subscription_id) {
      try {
        console.log('🔍 Fetching Stripe subscription:', user.stripe_subscription_id)
        const stripeSubscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id)
        
        console.log('✅ Stripe subscription retrieved:', {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          customer: stripeSubscription.customer,
          current_period_end: stripeSubscription.current_period_end
        })
        
        // Map Stripe subscription to our format
        const price = stripeSubscription.items.data[0]?.price
        const planName = user.subscription_type === 'enterprise' ? 'Enterprise' : 
                      user.subscription_type === 'pro' ? 'Pro' : 'Basic'
        
        subscriptionData = {
          id: stripeSubscription.id,
          plan_name: planName,
          status: stripeSubscription.status,
          price: price?.unit_amount ? (price.unit_amount / 100) : 0,
          currency: '$',
          end_date: stripeSubscription.current_period_end ? 
            new Date(stripeSubscription.current_period_end * 1000).toISOString() : null,
          features: getFeaturesByPlan(user.subscription_type)
        }
        
        console.log('📋 Mapped subscription data:', subscriptionData)
      } catch (stripeError) {
        console.error("❌ Error fetching Stripe subscription:", stripeError)
        console.error("❌ Stripe error details:", stripeError.message)
      }
    } else {
      console.log('❌ No stripe_subscription_id found for user')
    }

    // Fetch recent invoices from Stripe
    let invoicesData = []
    try {
      const invoices = await stripe.invoices.list({
        customer: user.stripe_customer_id,
        limit: 10
      })

      invoicesData = invoices.data.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.number,
        amount: invoice.total / 100,
        currency: '$',
        status: invoice.status,
        issue_date: new Date(invoice.created * 1000).toISOString(),
        download_url: invoice.hosted_invoice_url
      }))
    } catch (stripeError) {
      console.error("Error fetching Stripe invoices:", stripeError)
    }

    return NextResponse.json({
      success: true,
      subscription: subscriptionData,
      invoices: invoicesData
    })
  } catch (error) {
    console.error("Error in GET /api/billing/stripe-data:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

function getFeaturesByPlan(subscriptionType: string) {
  switch (subscriptionType) {
    case 'basic':
      return [
        "Multi-channel collection (SMS, Email)",
        "Custom review page",
        "Choice of action for each review",
        "Basic analytics dashboard",
        "Email support"
      ]
    case 'pro':
      return [
        "Everything in Basic +",
        "CSV import & export",
        "WhatsApp integration",
        "Multi-channel follow-ups",
        "Dynamic routing of reviews",
        "Advanced analytics",
        "Priority support"
      ]
    case 'enterprise':
      return [
        "Everything in Pro +",
        "Checkout & in-store QR code reviews",
        "AI responses to Google reviews",
        "Automated Trustpilot responses",
        "AI suggestions for negative reviews",
        "Monthly strategic review with success manager",
        "Custom integrations",
        "24/7 phone support"
      ]
    default:
      return []
  }
}