import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { supabase } from "@/lib/supabase"

// Initialize Stripe only when needed to avoid build-time errors
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  })
}

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const sig = headersList.get("stripe-signature")!

    // For testing - check if this is from ngrok/Stripe
    if (!sig) {
      return NextResponse.json({ error: "No signature header" }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      const stripe = getStripe()
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const customerEmail = session.customer_details?.email
    const userId = session.metadata?.user_id || session.client_reference_id
    const customerId = session.customer as string

    if (customerEmail || userId) {
      // Update user with Stripe customer ID
      const { data, error } = await supabase
        .from('users')
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq(userId ? 'id' : 'email', userId || customerEmail)
        .select()

      if (error) {
        console.error('Error:', error)
      } else {
        // If there's a subscription in the checkout, manually trigger subscription update
        if (session.subscription) {
          try {
            const stripe = getStripe()
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
            await handleSubscriptionUpdate(subscription)
          } catch (subError) {
            console.error('❌ Error handling subscription from checkout:', subError)
          }
        }
      }
    } else {
      }
  } catch (error) {
    console.error('Error:', error)
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string

    // Get subscription type from price ID or product metadata
    const subscriptionType = getSubscriptionTypeFromSubscription(subscription)

    // Determine if user is in trial
    const isInTrial = subscription.status === 'trialing'
    const trialStartDate = subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null
    const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null

    // First, check if the user exists with this stripe_customer_id
    let { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('stripe_customer_id', customerId)
      .single()

    // If not found by stripe_customer_id, try to get customer email from Stripe and match by email
    if (findError || !existingUser) {
      try {
        // Get customer details from Stripe
        const stripe = getStripe()
        const customer = await stripe.customers.retrieve(customerId)
        if (customer && !customer.deleted && customer.email) {
          // Try to find user by email
          const { data: userByEmail, error: emailError } = await supabase
            .from('users')
            .select('id, email, stripe_customer_id')
            .eq('email', customer.email)
            .single()

          if (!emailError && userByEmail) {
            // Update the user with the stripe_customer_id for future webhooks
            await supabase
              .from('users')
              .update({ stripe_customer_id: customerId })
              .eq('id', userByEmail.id)

            existingUser = { ...userByEmail, stripe_customer_id: customerId }
            }
        }
      } catch (stripeError) {
        console.error(`❌ Error fetching customer from Stripe:`, stripeError)
      }
    }

    if (!existingUser) {
      console.error(`❌ User not found by stripe_customer_id or email for customer: ${customerId}`)
      return
    }

    // Update user subscription information
    const { data: updateResult, error } = await supabase
      .from('users')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_type: subscriptionType,
        subscription_status: subscription.status,
        subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_start_date: trialStartDate,
        trial_end_date: trialEndDate,
        trial_ending_notified: false, // Reset trial notification flag
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)
      .select()

    if (error) {
      console.error('Error:', error)
    } else {
      }
  } catch (error) {
    console.error('Error:', error)
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string

    const { error } = await supabase
      .from('users')
      .update({
        subscription_type: 'free',
        subscription_status: 'canceled',
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Error:', error)
    } else {
      }
  } catch (error) {
    console.error('Error:', error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string

    // Update subscription status to active on successful payment
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Error:', error)
    } else {
      }
  } catch (error) {
    console.error('Error:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string

    // Update subscription status to past_due on failed payment
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Error:', error)
    } else {
      }
  } catch (error) {
    console.error('Error:', error)
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string
    const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null

    // Update user with trial ending notification
    const { error } = await supabase
      .from('users')
      .update({
        trial_ending_notified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      console.error('Error:', error)
    } else {
      }

    // Here you could also send an email notification to the user
    // notifying them that their trial is ending soon

  } catch (error) {
    console.error('Error:', error)
  }
}

function getSubscriptionTypeFromSubscription(subscription: Stripe.Subscription): 'basic' | 'pro' | 'enterprise' {
  // Check the payment links in URL metadata or product metadata
  const priceId = subscription.items.data[0]?.price.id
  const productId = subscription.items.data[0]?.price.product as string

  // Map based on price amounts or product metadata
  const price = subscription.items.data[0]?.price
  if (price) {
    const monthlyAmount = price.unit_amount || 0

    // Basic: $39/month = 3900 cents
    if (monthlyAmount >= 2900 && monthlyAmount <= 3900) return 'basic'
    // Pro: $79/month = 7900 cents
    if (monthlyAmount >= 6900 && monthlyAmount <= 7900) return 'pro'
    // Enterprise: $180/month = 18000 cents
    if (monthlyAmount >= 16000) return 'enterprise'
  }

  // Default to basic if we can't determine
  return 'basic'
}