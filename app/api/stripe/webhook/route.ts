import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { supabaseServer } from "@/lib/supabase"

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
      console.log('🔐 Webhook Debug:', {
        hasSignature: !!sig,
        signaturePrefix: sig?.substring(0, 20) + '...',
        endpointSecretPrefix: endpointSecret?.substring(0, 20) + '...',
        bodyLength: body.length
      })
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
      console.log('✅ Webhook signature verified successfully')
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', {
        error: err.message,
        signature: sig,
        endpointSecret: endpointSecret?.substring(0, 20) + '...',
        bodyPreview: body.substring(0, 100) + '...'
      })
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

      case 'billing_portal.session.created':
        await handleBillingPortalSessionCreated(event.data.object as Stripe.BillingPortal.Session)
        break

      case 'invoice.paid':
      case 'invoice.finalized':
      case 'invoice.created':
        console.log(`📄 Invoice event: ${event.type}`)
        break

      case 'payment_intent.succeeded':
      case 'payment_method.attached':
      case 'charge.succeeded':
        console.log(`💳 Payment event: ${event.type}`)
        break

      default:
        console.log(`🔔 Unhandled event type: ${event.type}`)
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
      const { data, error } = await supabaseServer
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
    const priceId = subscription.items.data[0]?.price.id
    const priceAmount = subscription.items.data[0]?.price.unit_amount
    const interval = subscription.items.data[0]?.price.recurring?.interval

    console.log('🔄 Processing subscription update:', {
      id: subscription.id,
      customer: customerId,
      priceId,
      priceAmount,
      interval,
      status: subscription.status
    })

    // Check if subscription is canceled or will be canceled
    const isCanceled = subscription.status === 'canceled' || subscription.cancel_at_period_end
    
    // If canceled, handle as cancellation
    if (isCanceled) {
      console.log(`🚫 Subscription canceled or set to cancel at period end: ${subscription.id}`)
      const { error } = await supabaseServer
        .from('users')
        .update({
          subscription_status: subscription.cancel_at_period_end ? 'cancelled' : 'cancelled',
          subscription_type: subscription.cancel_at_period_end ? getSubscriptionTypeFromSubscription(subscription) : 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId)
      
      if (error) {
        console.error('❌ Error updating canceled subscription:', error)
      } else {
        console.log('✅ Subscription cancellation updated successfully')
      }
      return
    }

    // Get subscription type from price ID or product metadata
    const subscriptionType = getSubscriptionTypeFromSubscription(subscription)

    // Determine if user is in trial
    const isInTrial = subscription.status === 'trialing'
    const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null

    // First, check if the user exists with this stripe_customer_id
    let { data: existingUser, error: findError } = await supabaseServer
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
          const { data: userByEmail, error: emailError } = await supabaseServer
            .from('users')
            .select('id, email, stripe_customer_id')
            .eq('email', customer.email)
            .single()

          if (!emailError && userByEmail) {
            // Update the user with the stripe_customer_id for future webhooks
            await supabaseServer
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

    console.log('👤 Found user for subscription update:', {
      userId: existingUser.id,
      email: existingUser.email,
      currentSubscriptionType: 'Unknown', // We'll add this in a moment
      newSubscriptionType: subscriptionType
    })

    // Update user subscription information
    const { data: updateResult, error } = await supabaseServer
      .from('users')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_type: subscriptionType,
        subscription_status: subscription.status,
        trial_end_date: trialEndDate,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)
      .select()

    if (error) {
      console.error('❌ Error updating user subscription:', error)
    } else {
      console.log('✅ Subscription updated successfully:', {
        userId: updateResult?.[0]?.id,
        email: updateResult?.[0]?.email,
        subscriptionType: updateResult?.[0]?.subscription_type,
        subscriptionStatus: updateResult?.[0]?.subscription_status,
        stripeSubscriptionId: updateResult?.[0]?.stripe_subscription_id
      })
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string
    
    console.log(`🚫 Processing subscription.deleted for customer: ${customerId}`)

    const { data, error } = await supabaseServer
      .from('users')
      .update({
        subscription_type: 'free',
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
        trial_end_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)
      .select()

    if (error) {
      console.error('❌ Error canceling subscription:', error)
    } else {
      console.log('✅ Subscription canceled successfully:', data)
    }
  } catch (error) {
    console.error('❌ Error in handleSubscriptionCanceled:', error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string

    // Update subscription status to active on successful payment
    const { error } = await supabaseServer
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
    const { error } = await supabaseServer
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

    // Update user with trial ending notification (using existing schema)
    const { error } = await supabaseServer
      .from('users')
      .update({
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

async function handleBillingPortalSessionCreated(session: Stripe.BillingPortal.Session) {
  try {
    const customerId = session.customer as string
    
    console.log('🏦 Billing portal session created:', {
      id: session.id,
      customer: customerId,
      url: session.url,
      return_url: session.return_url
    })

    // You can log this event or track portal usage
    // For now, just log it for debugging
    
  } catch (error) {
    console.error('Error handling billing portal session:', error)
  }
}

function getSubscriptionTypeFromSubscription(subscription: Stripe.Subscription): 'starter' | 'pro' | 'enterprise' {
  const priceId = subscription.items.data[0]?.price.id
  const price = subscription.items.data[0]?.price
  
  console.log('🔍 Starting subscription type detection:', {
    subscriptionId: subscription.id,
    priceId,
    priceData: price ? {
      amount: price.unit_amount,
      interval: price.recurring?.interval,
      currency: price.currency
    } : null
  })
  
  // First try to map by price ID if we have specific test price IDs
  if (priceId) {
    // Map specific test price IDs to subscription types
    // Note: These would need to be updated with actual price IDs from your Stripe dashboard
    const priceIdToType: Record<string, 'starter' | 'pro' | 'enterprise'> = {
      // Add your actual test price IDs here when available
      // 'price_1234567890abcdef': 'starter',
      // 'price_0987654321fedcba': 'pro',
      // 'price_enterprise_test': 'enterprise',
    }
    
    if (priceIdToType[priceId]) {
      console.log('✅ Mapped by price ID:', priceIdToType[priceId])
      return priceIdToType[priceId]
    }
  }

  // Fallback to price amount mapping
  if (price) {
    const amount = price.unit_amount || 0
    const interval = price.recurring?.interval
    
    console.log('💰 Price mapping debug:', {
      priceId,
      amount,
      interval,
      amountInDollars: amount / 100
    })
    
    // Map based on exact amounts from your test payment links
    if (interval === 'month') {
      // Monthly subscriptions
      if (amount === 3900) {
        console.log('✅ Detected: Starter monthly ($39)')
        return 'starter'
      }
      if (amount === 7900) {
        console.log('✅ Detected: Pro monthly ($79)')
        return 'pro'
      }
      if (amount === 18000) {
        console.log('✅ Detected: Enterprise monthly ($180)')
        return 'enterprise'
      }
    } else if (interval === 'year') {
      // Yearly subscriptions (approximate annual amounts)
      if (amount >= 35000 && amount <= 40000) {
        console.log('✅ Detected: Starter yearly (~$372)')
        return 'starter'
      }
      if (amount >= 70000 && amount <= 80000) {
        console.log('✅ Detected: Pro yearly (~$756)')
        return 'pro'
      }
      if (amount >= 150000 && amount <= 160000) {
        console.log('✅ Detected: Enterprise yearly (~$1536)')
        return 'enterprise'
      }
    }
    
    // Fallback ranges for any edge cases
    const effectiveMonthlyAmount = interval === 'year' ? Math.round(amount / 12) : amount
    if (effectiveMonthlyAmount >= 2500 && effectiveMonthlyAmount <= 4500) {
      console.log('⚡ Fallback detection: Starter')
      return 'starter'
    }
    if (effectiveMonthlyAmount >= 6500 && effectiveMonthlyAmount <= 9000) {
      console.log('⚡ Fallback detection: Pro')
      return 'pro'
    }
    if (effectiveMonthlyAmount >= 12000) {
      console.log('⚡ Fallback detection: Enterprise')
      return 'enterprise'
    }
  }

  // Default to starter if we can't determine
  console.log('⚠️ Could not determine subscription type, defaulting to starter')
  return 'starter'
}